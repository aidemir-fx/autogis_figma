package repository

import (
	"context"
	"gorm.io/gorm"
)

type UserRepository struct{ db *gorm.DB }
func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

type OrderRepository struct{ db *gorm.DB }
func NewOrderRepository(db *gorm.DB) *OrderRepository { return &OrderRepository{db: db} }

type ActivityTypeRepository struct{ db *gorm.DB }
func NewActivityTypeRepository(db *gorm.DB) *ActivityTypeRepository { return &ActivityTypeRepository{db: db} }

type UserActivityTypeRepository struct{ db *gorm.DB }
func NewUserActivityTypeRepository(db *gorm.DB) *UserActivityTypeRepository { return &UserActivityTypeRepository{db: db} }

type ReviewRepository struct{ db *gorm.DB }
func NewReviewRepository(db *gorm.DB) *ReviewRepository { return &ReviewRepository{db: db} }

type ChatMessageRepository struct{ db *gorm.DB }
func NewChatMessageRepository(db *gorm.DB) *ChatMessageRepository { return &ChatMessageRepository{db: db} }

type MasterRepository struct{ db *gorm.DB }
func NewMasterRepository(db *gorm.DB) *MasterRepository { return &MasterRepository{db: db} }

type AutoWashRepository struct{ db *gorm.DB }
func NewAutoWashRepository(db *gorm.DB) *AutoWashRepository { return &AutoWashRepository{db: db} }

type AutoShopRepository struct{ db *gorm.DB }
func NewAutoShopRepository(db *gorm.DB) *AutoShopRepository { return &AutoShopRepository{db: db} }

type AutoServiceRepository struct{ db *gorm.DB }
func NewAutoServiceRepository(db *gorm.DB) *AutoServiceRepository { return &AutoServiceRepository{db: db} }

type ProfessionalApplicationRepository struct{ db *gorm.DB }
func NewProfessionalApplicationRepository(db *gorm.DB) *ProfessionalApplicationRepository { return &ProfessionalApplicationRepository{db: db} }
func (r *ProfessionalApplicationRepository) GetTokenInvalidation(ctx context.Context, userID string) (any, error) { return nil, nil }

type MediaRepository struct{ db *gorm.DB }
func NewMediaRepository(db *gorm.DB) *MediaRepository { return &MediaRepository{db: db} }

type ActivityGroupRepository struct{ db *gorm.DB }
func NewActivityGroupRepository(db *gorm.DB) *ActivityGroupRepository { return &ActivityGroupRepository{db: db} }

type ActivitySubtypeRepository struct{ db *gorm.DB }
func NewActivitySubtypeRepository(db *gorm.DB) *ActivitySubtypeRepository { return &ActivitySubtypeRepository{db: db} }

type UserActivityProfileRepository struct{ db *gorm.DB }
func NewUserActivityProfileRepository(db *gorm.DB) *UserActivityProfileRepository { return &UserActivityProfileRepository{db: db} }

type ActivityAuditLogRepository struct{ db *gorm.DB }
func NewActivityAuditLogRepository(db *gorm.DB) *ActivityAuditLogRepository { return &ActivityAuditLogRepository{db: db} }

type CatalogRepository struct{ db *gorm.DB }
func NewCatalogRepository(db *gorm.DB) *CatalogRepository { return &CatalogRepository{db: db} }

type StoryRepository struct{ db *gorm.DB }
func NewStoryRepository(db *gorm.DB) *StoryRepository { return &StoryRepository{db: db} }

type SubscriptionRepository struct{ db *gorm.DB }
func NewSubscriptionRepository(db *gorm.DB) *SubscriptionRepository { return &SubscriptionRepository{db: db} }
