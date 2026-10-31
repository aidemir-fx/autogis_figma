package usecase

import (
	"github.com/gmt061/autogis-backend/internal/pkg/jwt"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/repository"
	"github.com/gmt061/autogis-backend/internal/worker"
)

type AuthUseCase struct{}
func NewAuthUseCase(userRepo *repository.UserRepository, profRepo *repository.ProfessionalApplicationRepository, jwtSvc *jwt.JWTService, accessExp, refreshExp int) *AuthUseCase {
	return &AuthUseCase{}
}

type UserUseCase struct{}
func NewUserUseCase(userRepo *repository.UserRepository, userActivityTypeRepo *repository.UserActivityTypeRepository, profRepo *repository.ProfessionalApplicationRepository) *UserUseCase {
	return &UserUseCase{}
}

type OrderUseCase struct{}
func NewOrderUseCase(orderRepo *repository.OrderRepository, userRepo *repository.UserRepository, actRepo *repository.ActivityTypeRepository, userActRepo *repository.UserActivityTypeRepository, chatRepo *repository.ChatMessageRepository, profRepo *repository.ProfessionalApplicationRepository, profileRepo *repository.UserActivityProfileRepository) *OrderUseCase {
	return &OrderUseCase{}
}

type ChatUseCase struct{}
func NewChatUseCase(orderRepo *repository.OrderRepository, userRepo *repository.UserRepository, chatRepo *repository.ChatMessageRepository) *ChatUseCase {
	return &ChatUseCase{}
}

type SearchUseCase struct{}
func NewSearchUseCase(masterRepo *repository.MasterRepository, autoWashRepo *repository.AutoWashRepository, autoShopRepo *repository.AutoShopRepository, autoServiceRepo *repository.AutoServiceRepository, userActRepo *repository.UserActivityTypeRepository, userRepo *repository.UserRepository, actRepo *repository.ActivityTypeRepository) *SearchUseCase {
	return &SearchUseCase{}
}

type ActivityTypeUseCase struct{}
func NewActivityTypeUseCase(actRepo *repository.ActivityTypeRepository) *ActivityTypeUseCase {
	return &ActivityTypeUseCase{}
}

type ReviewUseCase struct{}
func NewReviewUseCase(reviewRepo *repository.ReviewRepository, userRepo *repository.UserRepository, orderRepo *repository.OrderRepository, masterRepo *repository.MasterRepository, autoWashRepo *repository.AutoWashRepository, autoShopRepo *repository.AutoShopRepository, autoServiceRepo *repository.AutoServiceRepository) *ReviewUseCase {
	return &ReviewUseCase{}
}

type MasterUseCase struct{}
func NewMasterUseCase(userRepo *repository.UserRepository, masterRepo *repository.MasterRepository, autoWashRepo *repository.AutoWashRepository, autoShopRepo *repository.AutoShopRepository, autoServiceRepo *repository.AutoServiceRepository, actRepo *repository.ActivityTypeRepository, userActRepo *repository.UserActivityTypeRepository, groupRepo *repository.ActivityGroupRepository, subtypeRepo *repository.ActivitySubtypeRepository, profileRepo *repository.UserActivityProfileRepository, auditRepo *repository.ActivityAuditLogRepository) *MasterUseCase {
	return &MasterUseCase{}
}

type ProfessionalApplicationUseCase struct{}
func NewProfessionalApplicationUseCase(profRepo *repository.ProfessionalApplicationRepository, userRepo *repository.UserRepository, groupRepo *repository.ActivityGroupRepository, subtypeRepo *repository.ActivitySubtypeRepository) *ProfessionalApplicationUseCase {
	return &ProfessionalApplicationUseCase{}
}

type BusinessApplicationUseCase struct{}
func NewBusinessApplicationUseCase(profUC *ProfessionalApplicationUseCase, masterUC *MasterUseCase) *BusinessApplicationUseCase {
	return &BusinessApplicationUseCase{}
}

type MediaUseCase struct{}
func NewMediaUseCase(mediaRepo *repository.MediaRepository, orderRepo *repository.OrderRepository, s3 *s3client.Client, worker *worker.Worker, logger *storylog.Logger) *MediaUseCase {
	return &MediaUseCase{}
}

type StoryUseCase struct{}
func NewStoryUseCase(storyRepo *repository.StoryRepository, subRepo *repository.SubscriptionRepository, mediaRepo *repository.MediaRepository, mediaUC *MediaUseCase, logger *storylog.Logger) *StoryUseCase {
	return &StoryUseCase{}
}
