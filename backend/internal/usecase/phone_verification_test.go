package usecase

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/pkg/mobileid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type testPhoneProvider struct {
	state mobileid.State
}

func (p *testPhoneProvider) Start(_ context.Context, apiPhone, externalID string) (mobileid.State, error) {
	p.state = mobileid.State{AuthenticationID: externalID, Status: "pending"}
	return p.state, nil
}

func (p *testPhoneProvider) Status(context.Context, string) (mobileid.State, error) {
	return p.state, nil
}

func (p *testPhoneProvider) Code(_ context.Context, _, code string) error {
	if code != "0827" {
		p.state.Status = "smsCodeRequired"
		p.state.ErrorCode = "sms_code_invalid"
		return nil
	}
	p.state.Status = "success"
	p.state.SubID = "test-verified-subject"
	p.state.ErrorCode = ""
	return nil
}

func TestCanonicalVerificationPhone(t *testing.T) {
	for _, input := range []string{"+7 (900) 555-22-01", "+79005552201", "8 900 555 22 01"} {
		if actual := canonicalPhone(input); actual != "+79005552201" {
			t.Errorf("canonicalPhone(%q) = %q", input, actual)
		}
	}
	for _, input := range []string{"+1 900 555 22 01", "9005552201", "x79005552201"} {
		if canonicalPhone(input) != "" {
			t.Errorf("accepted malformed phone %q", input)
		}
	}
	state := mobileid.State{Status: "success"}
	if resultFor("example", state).Status != "failed" {
		t.Error("accepted a successful response without a verified subject")
	}
}

func TestPhoneVerificationPostgres(t *testing.T) {
	dsn := os.Getenv("AUTOGIS_TEST_DSN")
	if dsn == "" {
		t.Skip("AUTOGIS_TEST_DSN is required for the isolated PostgreSQL integration test")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	var dbName string
	if err := db.Raw("SELECT current_database()").Scan(&dbName).Error; err != nil || dbName != "autogis_redesign_test" {
		t.Fatal("the integration test requires the dedicated autogis_redesign_test database")
	}
	if err := db.AutoMigrate(&domain.User{}, &domain.TokenInvalidation{}, &PhoneVerificationAttempt{}); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	phone := "+7 (900) 555-22-03"
	t.Cleanup(func() {
		db.Exec("DELETE FROM token_invalidations WHERE user_id IN (SELECT id FROM users WHERE phone = ?)", phone)
		db.Exec("DELETE FROM users WHERE phone = ?", phone)
		db.Exec("DELETE FROM phone_verification_attempts WHERE phone = ?", canonicalPhone(phone))
	})
	provider := &testPhoneProvider{}
	service := NewPhoneVerification(db, provider)
	register, err := service.Start(ctx, phone, "register")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.Start(ctx, phone, "register"); !errors.Is(err, errPhoneLimit) {
		t.Fatalf("expected resend throttle, got %v", err)
	}
	user := &domain.User{Phone: phone, Password: "old-password-hash", Role: domain.RoleCustomer}
	if err := service.Register(ctx, register.ID, user); !errors.Is(err, errPhoneProof) {
		t.Fatalf("registration accepted a pending verification: %v", err)
	}
	provider.state.Status = "smsCodeRequired"
	if _, err := service.Code(ctx, register.ID, "0827"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Reset(ctx, register.ID, phone, "new-test-password"); !errors.Is(err, errPhoneProof) {
		t.Fatalf("recovery accepted a registration proof: %v", err)
	}
	if err := service.Register(ctx, register.ID, user); err != nil {
		t.Fatal(err)
	}
	if err := service.Register(ctx, register.ID, user); !errors.Is(err, errPhoneProof) {
		t.Fatalf("registration accepted a consumed proof: %v", err)
	}
	if err := db.Model(&PhoneVerificationAttempt{}).Where("id = ?", register.ID).
		Update("created_at", time.Now().Add(-time.Minute)).Error; err != nil {
		t.Fatal(err)
	}
	reset, err := service.Start(ctx, "8 900 555 22 03", "recover")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.Code(ctx, reset.ID, "0827"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Reset(ctx, reset.ID, "+79005552209", "new-test-password"); !errors.Is(err, errPhoneProof) {
		t.Fatalf("recovery accepted a proof for another phone: %v", err)
	}
	id, err := service.Reset(ctx, reset.ID, phone, "new-test-password")
	if err != nil || id != user.ID {
		t.Fatalf("recovery did not update the expected user: %v", err)
	}
	var updated domain.User
	if err := db.First(&updated, "id = ?", id).Error; err != nil {
		t.Fatal(err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(updated.Password), []byte("new-test-password")); err != nil {
		t.Fatalf("password was not updated: %v", err)
	}
	var revoked domain.TokenInvalidation
	if err := db.First(&revoked, "user_id = ?", id).Error; err != nil || revoked.InvalidatedAt.IsZero() {
		t.Fatalf("previous sessions were not invalidated: %v", err)
	}
	if _, err := service.Reset(ctx, reset.ID, phone, "other-test-password"); !errors.Is(err, errPhoneProof) {
		t.Fatalf("recovery accepted a consumed proof: %v", err)
	}
}
