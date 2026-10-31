package usecase

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/jwt"
	"github.com/gmt061/autogis-backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// bcryptCost фиксируем явно вместо DefaultCost, чтобы поведение было одинаковым
// на всех средах и устойчивым к brute-force.
const bcryptCost = 12

// dummyHash используется при login для несуществующего пользователя,
// чтобы время ответа не зависело от существования телефона (защита от timing-атаки).
var dummyHash = func() []byte {
	h, err := bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing-defense"), bcryptCost)
	if err != nil {
		log.Fatalf("failed to generate dummy bcrypt hash: %v", err)
	}
	return h
}()

// AuthUseCase handles authentication logic
type AuthUseCase struct {
	userRepo                    repository.UserRepository
	professionalApplicationRepo repository.ProfessionalApplicationRepository
	jwtService                  *jwt.JWTService
	accessExp                   int
	refreshExp                  int
}

func NewAuthUseCase(
	userRepo repository.UserRepository,
	professionalApplicationRepo repository.ProfessionalApplicationRepository,
	jwtService *jwt.JWTService,
	accessExp int,
	refreshExp int,
) *AuthUseCase {
	return &AuthUseCase{
		userRepo:                    userRepo,
		professionalApplicationRepo: professionalApplicationRepo,
		jwtService:                  jwtService,
		accessExp:                   accessExp,
		refreshExp:                  refreshExp,
	}
}

func (uc *AuthUseCase) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.LoginResponse, error) {
	// Check if user already exists
	existingUser, _ := uc.userRepo.GetByPhone(ctx, req.Phone)
	if existingUser != nil {
		return nil, apperrors.ErrUserExists
	}

	// Validate privacy consent
	if !req.AgreedToPrivacy {
		return nil, apperrors.New("PRIVACY_CONSENT_REQUIRED", "Privacy consent is required", 400)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// Create new user
	now := time.Now()
	user := &domain.User{
		Phone:           req.Phone,
		Password:        string(hashedPassword),
		Role:            domain.RoleCustomer,
		ContactNumber:   &req.Phone, // По умолчанию номер для связи = номер авторизации
		AgreedToPrivacy: true,
		PrivacyAgreedAt: &now,
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// Get user from database to ensure all data is properly saved
	savedUser, err := uc.userRepo.GetByID(ctx, user.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// Generate tokens
	accessToken, err := uc.jwtService.GenerateToken(
		savedUser.ID,
		savedUser.Phone,
		string(savedUser.Role),
		time.Duration(uc.accessExp)*time.Minute,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	refreshToken, err := uc.jwtService.GenerateToken(
		savedUser.ID,
		savedUser.Phone,
		string(savedUser.Role),
		time.Duration(uc.refreshExp)*time.Hour,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         uc.userToResponse(savedUser),
	}, nil
}

func (uc *AuthUseCase) Login(ctx context.Context, req *domain.LoginRequest) (*domain.LoginResponse, error) {
	// Get user by phone. Даже если пользователя нет, всё равно выполняем
	// bcrypt.CompareHashAndPassword с dummy-хэшем, чтобы время ответа не
	// позволяло злоумышленнику отличить "нет такого телефона" от "неверный пароль".
	user, _ := uc.userRepo.GetByPhone(ctx, req.Phone)

	hashToCompare := dummyHash
	if user != nil {
		hashToCompare = []byte(user.Password)
	}

	cmpErr := bcrypt.CompareHashAndPassword(hashToCompare, []byte(req.Password))
	if user == nil || cmpErr != nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	// Generate tokens
	accessToken, err := uc.jwtService.GenerateToken(
		user.ID,
		user.Phone,
		string(user.Role),
		time.Duration(uc.accessExp)*time.Minute,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	refreshToken, err := uc.jwtService.GenerateToken(
		user.ID,
		user.Phone,
		string(user.Role),
		time.Duration(uc.refreshExp)*time.Hour,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         uc.userToResponse(user),
	}, nil
}

func (uc *AuthUseCase) RefreshToken(ctx context.Context, req *domain.RefreshTokenRequest) (*domain.LoginResponse, error) {
	// Validate refresh token
	claims, err := uc.jwtService.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, apperrors.ErrInvalidToken
	}
	if uc.professionalApplicationRepo != nil {
		invalidation, err := uc.professionalApplicationRepo.GetTokenInvalidation(ctx, claims.UserID)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		if invalidation != nil && claims.IssuedAt != nil && claims.IssuedAt.Time.Before(invalidation.InvalidatedAt) {
			return nil, apperrors.ErrInvalidToken
		}
	}

	// Get user
	user, err := uc.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	// Generate new access token
	accessToken, err := uc.jwtService.GenerateToken(
		user.ID,
		user.Phone,
		string(user.Role),
		time.Duration(uc.accessExp)*time.Minute,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// Generate new refresh token
	refreshToken, err := uc.jwtService.GenerateToken(
		user.ID,
		user.Phone,
		string(user.Role),
		time.Duration(uc.refreshExp)*time.Hour,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         uc.userToResponse(user),
	}, nil
}

func (uc *AuthUseCase) userToResponse(user *domain.User) *domain.UserResponse {
	return buildUserResponse(user)
}

// UserUseCase handles user business logic
type UserUseCase struct {
	userRepo                    repository.UserRepository
	userActivityTypeRepo        repository.UserActivityTypeRepository
	professionalApplicationRepo repository.ProfessionalApplicationRepository
}

func NewUserUseCase(
	userRepo repository.UserRepository,
	userActivityTypeRepo repository.UserActivityTypeRepository,
	professionalApplicationRepo repository.ProfessionalApplicationRepository,
) *UserUseCase {
	return &UserUseCase{
		userRepo:                    userRepo,
		userActivityTypeRepo:        userActivityTypeRepo,
		professionalApplicationRepo: professionalApplicationRepo,
	}
}

func (uc *UserUseCase) GetUser(ctx context.Context, id string) (*domain.UserResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}
	return uc.userToResponseWithApplicationAccess(ctx, user), nil
}

func (uc *UserUseCase) UpdateUser(ctx context.Context, id string, req *domain.UpdateUserRequest) (*domain.UserResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	if req.Name != nil {
		user.Name = req.Name
	}
	// Никогда не меняем Phone (это номер авторизации - логин)
	// Меняем только ContactNumber (номер для связи в ЛК)
	if req.ContactNumber != nil {
		user.ContactNumber = req.ContactNumber
	}
	if req.Coordinates != nil {
		user.Coordinates = req.Coordinates
	}

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.userToResponse(user), nil
}

func (uc *UserUseCase) UpdateUserRole(ctx context.Context, id string, req *domain.UpdateUserRoleRequest) (*domain.UserResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	user.Role = req.Role

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.userToResponse(user), nil
}

// SetProfessionalStatus is an explicit admin override. Revoking the status
// also returns the account to the customer role, while leaving its provider
// profile and history intact.
func (uc *UserUseCase) SetProfessionalStatus(ctx context.Context, id string, enabled bool) (*domain.UserResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}
	user.IsProfessional = enabled
	if !enabled {
		user.Role = domain.RoleCustomer
	}
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return uc.userToResponse(user), nil
}

func (uc *UserUseCase) GetCurrentUserActivityTypes(ctx context.Context, userID string) ([]*domain.UserActivityTypeResponse, error) {
	userActivityTypes, err := uc.userActivityTypeRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	response := make([]*domain.UserActivityTypeResponse, 0, len(userActivityTypes))
	for _, item := range userActivityTypes {
		response = append(response, &domain.UserActivityTypeResponse{
			ID:             item.ID,
			UserID:         item.UserID,
			ActivityTypeID: item.ActivityTypeID,
			ActivityType:   mapActivityTypeToResponse(item.ActivityType),
			CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		})
	}

	return response, nil
}

// ActivateProfessional сохраняет обратную совместимость со старым клиентом.
// Новый поток активирует статус автоматически через business application.
func (uc *UserUseCase) ActivateProfessional(ctx context.Context, id string) (*domain.UserResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	if user.IsProfessional {
		return uc.userToResponse(user), nil // Legacy grandfathering.
	}

	return nil, apperrors.New(
		"BUSINESS_APPLICATION_REQUIRED",
		"Профессиональный статус выдаётся только после одобрения бизнес-заявки. Подайте заявку через /api/business-applications.",
		http.StatusConflict,
	)
}

func (uc *UserUseCase) GetAllUsers(ctx context.Context) ([]*domain.UserResponse, error) {
	users, err := uc.userRepo.GetAll(ctx)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.UserResponse, len(users))
	for i, user := range users {
		responses[i] = uc.userToResponse(user)
	}
	return responses, nil
}

func (uc *UserUseCase) userToResponse(user *domain.User) *domain.UserResponse {
	return buildUserResponse(user)
}

func (uc *UserUseCase) userToResponseWithApplicationAccess(ctx context.Context, user *domain.User) *domain.UserResponse {
	if user == nil || uc.professionalApplicationRepo == nil {
		return buildUserResponse(user)
	}
	app, err := uc.professionalApplicationRepo.GetLatestApplicationByUserID(ctx, user.ID)
	if err == nil && app != nil {
		// Until a submitted application is rejected, the applicant uses the
		// professional cabinet in full. Rejection revokes that access.
		userCopy := *user
		if app.Status == domain.ProfessionalApplicationStatusPending ||
			app.Status == domain.ProfessionalApplicationStatusNeedsRevision ||
			app.Status == domain.ProfessionalApplicationStatusApproved {
			userCopy.IsProfessional = true
		} else if app.Status == domain.ProfessionalApplicationStatusRejected {
			userCopy.IsProfessional = false
		}
		return buildUserResponse(&userCopy)
	}
	return buildUserResponse(user)
}
