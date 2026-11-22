package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"regexp"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/mobileid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

const verificationLifetime = 5 * time.Minute

var (
	attemptID           = regexp.MustCompile(`^[0-9a-f]{32}$`)
	nondigit            = regexp.MustCompile(`[^0-9]`)
	phoneInput          = regexp.MustCompile(`^[+0-9 ()-]{10,24}$`)
	smsCode             = regexp.MustCompile(`^[0-9]{3,10}$`)
	errPhoneLimit       = apperrors.New("PHONE_RATE_LIMIT", "Too many attempts", http.StatusTooManyRequests)
	errPhoneUnavailable = apperrors.New("PHONE_VERIFICATION_UNAVAILABLE", "Phone verification unavailable", http.StatusServiceUnavailable)
	errPhoneProof       = apperrors.New("PHONE_VERIFICATION_REQUIRED", "Phone verification required", http.StatusBadRequest)
)

type PhoneVerificationAttempt struct {
	ID           string `gorm:"primaryKey;size:32"`
	Phone        string `gorm:"not null;size:12;index:idx_phone_verification_phone_created,priority:1"`
	Purpose      string `gorm:"not null;size:8"`
	ProviderID   string
	ExpiresAt    time.Time `gorm:"not null"`
	CreatedAt    time.Time `gorm:"not null;index:idx_phone_verification_phone_created,priority:2"`
	LastStatusAt *time.Time
	CodeAttempts int
	ConsumedAt   *time.Time
}

type PhoneVerificationResult struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	ErrorCode string `json:"errorCode,omitempty"`
}

type PhoneVerifier interface {
	Start(context.Context, string, string) (mobileid.State, error)
	Status(context.Context, string) (mobileid.State, error)
	Code(context.Context, string, string) error
}

type PhoneVerification struct {
	db       *gorm.DB
	provider PhoneVerifier
}

func NewPhoneVerification(db *gorm.DB, provider PhoneVerifier) *PhoneVerification {
	return &PhoneVerification{db: db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}), provider: provider}
}

func canonicalPhone(input string) string {
	if !phoneInput.MatchString(input) {
		return ""
	}
	digits := nondigit.ReplaceAllString(input, "")
	if len(digits) != 11 || (digits[0] != '7' && digits[0] != '8') {
		return ""
	}
	return "+7" + digits[1:]
}

func byCanonicalPhone(db *gorm.DB, phone string) *gorm.DB {
	return db.Where("regexp_replace(phone, '[^0-9]', '', 'g') IN ?", []string{phone[1:], "8" + phone[2:]})
}

func phoneLock(tx *gorm.DB, phone string) error {
	return tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", phone).Error
}

func (s *PhoneVerification) Start(ctx context.Context, input, purpose string) (PhoneVerificationResult, error) {
	phone := canonicalPhone(input)
	if phone == "" || (purpose != "register" && purpose != "recover") {
		return PhoneVerificationResult{}, errPhoneProof
	}
	var entropy [16]byte
	if _, err := rand.Read(entropy[:]); err != nil {
		return PhoneVerificationResult{}, err
	}
	now := time.Now()
	attempt := PhoneVerificationAttempt{ID: hex.EncodeToString(entropy[:]), Phone: phone, Purpose: purpose, CreatedAt: now, ExpiresAt: now.Add(verificationLifetime)}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := phoneLock(tx, phone); err != nil {
			return err
		}
		var recent int64
		if err := tx.Model(&PhoneVerificationAttempt{}).Where("phone = ? AND created_at > ?", phone, now.Add(-time.Hour)).Count(&recent).Error; err != nil {
			return err
		}
		if recent >= 5 {
			return errPhoneLimit
		}
		if err := tx.Model(&PhoneVerificationAttempt{}).Where("phone = ? AND created_at > ?", phone, now.Add(-30*time.Second)).Count(&recent).Error; err != nil {
			return err
		}
		if recent != 0 {
			return errPhoneLimit
		}
		return tx.Create(&attempt).Error
	})
	if err != nil {
		return PhoneVerificationResult{}, err
	}
	state, err := s.provider.Start(ctx, phone, attempt.ID)
	if err != nil || state.AuthenticationID == "" {
		return PhoneVerificationResult{}, errPhoneUnavailable
	}
	if err := s.db.WithContext(ctx).Model(&attempt).Update("provider_id", state.AuthenticationID).Error; err != nil {
		return PhoneVerificationResult{}, err
	}
	return resultFor(attempt.ID, state), nil
}

func (s *PhoneVerification) attempt(ctx context.Context, id string) (PhoneVerificationAttempt, error) {
	var attempt PhoneVerificationAttempt
	if !attemptID.MatchString(id) {
		return attempt, errPhoneProof
	}
	err := s.db.WithContext(ctx).First(&attempt, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return attempt, errPhoneProof
	}
	return attempt, err
}

func resultFor(id string, state mobileid.State) PhoneVerificationResult {
	status := state.Status
	switch status {
	case "success":
		if state.SubID == "" {
			status = "failed"
		}
	case "pending", "smsCodeRequired", "smsCodeSubmitted", "failed", "expired":
	default:
		status = "failed"
	}
	result := PhoneVerificationResult{ID: id, Status: status}
	if state.ErrorCode == "sms_code_invalid" {
		result.ErrorCode = state.ErrorCode
	}
	return result
}

func (s *PhoneVerification) Status(ctx context.Context, id string) (PhoneVerificationResult, error) {
	attempt, err := s.attempt(ctx, id)
	if err != nil {
		return PhoneVerificationResult{}, err
	}
	if attempt.ConsumedAt != nil || time.Now().After(attempt.ExpiresAt) {
		return PhoneVerificationResult{ID: id, Status: "expired"}, nil
	}
	if attempt.ProviderID == "" {
		return PhoneVerificationResult{ID: id, Status: "failed"}, nil
	}
	now := time.Now()
	updated := s.db.WithContext(ctx).Model(&attempt).Where("last_status_at IS NULL OR last_status_at < ?", now.Add(-2*time.Second)).Update("last_status_at", now)
	if updated.Error != nil {
		return PhoneVerificationResult{}, updated.Error
	}
	if updated.RowsAffected == 0 {
		return PhoneVerificationResult{}, errPhoneLimit
	}
	state, err := s.provider.Status(ctx, attempt.ProviderID)
	if err != nil {
		return PhoneVerificationResult{}, errPhoneUnavailable
	}
	return resultFor(id, state), nil
}

func (s *PhoneVerification) Code(ctx context.Context, id, code string) (PhoneVerificationResult, error) {
	if !smsCode.MatchString(code) {
		return PhoneVerificationResult{}, errPhoneProof
	}
	attempt, err := s.attempt(ctx, id)
	if err != nil {
		return PhoneVerificationResult{}, err
	}
	if attempt.ProviderID == "" || attempt.ConsumedAt != nil || time.Now().After(attempt.ExpiresAt) {
		return PhoneVerificationResult{ID: id, Status: "expired"}, nil
	}
	updated := s.db.WithContext(ctx).Model(&attempt).
		Where("code_attempts < ? AND consumed_at IS NULL", 8).
		UpdateColumn("code_attempts", gorm.Expr("code_attempts + 1"))
	if updated.Error != nil {
		return PhoneVerificationResult{}, updated.Error
	}
	if updated.RowsAffected == 0 {
		return PhoneVerificationResult{}, errPhoneLimit
	}
	if err := s.provider.Code(ctx, attempt.ProviderID, code); err != nil {
		return PhoneVerificationResult{}, errPhoneUnavailable
	}
	return PhoneVerificationResult{ID: id, Status: "smsCodeSubmitted"}, nil
}

func (s *PhoneVerification) consume(ctx context.Context, id, phone, purpose string, action func(*gorm.DB) error) error {
	if phone == "" {
		return errPhoneProof
	}
	attempt, err := s.attempt(ctx, id)
	if err != nil {
		return err
	}
	if attempt.Phone != phone || attempt.Purpose != purpose || attempt.ProviderID == "" || attempt.ConsumedAt != nil || time.Now().After(attempt.ExpiresAt) {
		return errPhoneProof
	}
	state, err := s.provider.Status(ctx, attempt.ProviderID)
	if err != nil {
		return errPhoneUnavailable
	}
	if resultFor(id, state).Status != "success" {
		return errPhoneProof
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := phoneLock(tx, phone); err != nil {
			return err
		}
		now := time.Now()
		updated := tx.Model(&attempt).Where("consumed_at IS NULL AND expires_at > ?", now).Update("consumed_at", now)
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected != 1 {
			return errPhoneProof
		}
		return action(tx)
	})
}

func (s *PhoneVerification) Register(ctx context.Context, id string, user *domain.User) error {
	phone := canonicalPhone(user.Phone)
	return s.consume(ctx, id, phone, "register", func(tx *gorm.DB) error {
		var existing int64
		if err := byCanonicalPhone(tx.Model(&domain.User{}), phone).Count(&existing).Error; err != nil {
			return err
		}
		if existing > 0 {
			return apperrors.ErrUserExists
		}
		return tx.Create(user).Error
	})
}

func (s *PhoneVerification) Reset(ctx context.Context, id, input, password string) (string, error) {
	if len([]rune(password)) < 6 || len(password) > 72 {
		return "", errPhoneProof
	}
	phone := canonicalPhone(input)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	var userID string
	err = s.consume(ctx, id, phone, "recover", func(tx *gorm.DB) error {
		var users []domain.User
		if err := byCanonicalPhone(tx.Clauses(clause.Locking{Strength: "UPDATE"}), phone).Limit(2).Find(&users).Error; err != nil {
			return err
		}
		if len(users) != 1 {
			return errPhoneProof
		}
		userID = users[0].ID
		if err := tx.Model(&users[0]).Update("password", string(hash)).Error; err != nil {
			return err
		}
		return repositoryInvalidation(tx, userID)
	})
	return userID, err
}

func repositoryInvalidation(tx *gorm.DB, userID string) error {
	now := time.Now()
	invalidation := domain.TokenInvalidation{UserID: userID, InvalidatedAt: now}
	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.Assignments(map[string]any{"invalidated_at": now, "updated_at": now}),
	}).Create(&invalidation).Error
}
