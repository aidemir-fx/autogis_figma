package repository

import (
	"context"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
)

// UserRepository defines methods for user persistence
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByPhone(ctx context.Context, phone string) (*domain.User, error)
	GetAll(ctx context.Context) ([]*domain.User, error)
	GetByRole(ctx context.Context, role domain.UserRole) ([]*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id string) error
}

// MasterRepository defines methods for master persistence
type MasterRepository interface {
	Create(ctx context.Context, master *domain.Master) error
	GetByUserID(ctx context.Context, userID string) (*domain.Master, error)
	GetByID(ctx context.Context, id string) (*domain.Master, error)
	GetAll(ctx context.Context) ([]*domain.Master, error)
	GetByActivityTypes(ctx context.Context, activityTypes []string) ([]*domain.Master, error)
	GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.Master, error)
	Update(ctx context.Context, master *domain.Master) error
	Delete(ctx context.Context, id string) error
}

// OrderRepository defines methods for order persistence
type OrderRepository interface {
	Create(ctx context.Context, order *domain.Order) error
	CreateWithInvitations(ctx context.Context, order *domain.Order, providerIDs []string) error
	GetOrderInvitations(ctx context.Context, providerID string) ([]*domain.OrderInvitation, error)
	AcceptInvitation(ctx context.Context, orderID, providerID string) error
	GetByID(ctx context.Context, id string) (*domain.Order, error)
	GetDirectChatID(ctx context.Context, customerID, providerID string) (*string, error)
	GetByCustomerID(ctx context.Context, customerID string) ([]*domain.Order, error)
	GetByProviderID(ctx context.Context, providerID string) ([]*domain.Order, error)
	GetAll(ctx context.Context) ([]*domain.Order, error)
	HasPhotoAssetForParticipant(ctx context.Context, assetID, userID string) (bool, error)
	HasProviderScheduleConflict(ctx context.Context, providerID string, start, end time.Time, excludeOrderID string) (bool, error)
	Update(ctx context.Context, order *domain.Order) error
	Delete(ctx context.Context, id string) error
}

type ChatMessageRepository interface {
	Create(ctx context.Context, message *domain.ChatMessage) error
	GetByOrderID(ctx context.Context, orderID string) ([]*domain.ChatMessage, error)
	GetByChatID(ctx context.Context, chatID string) ([]*domain.ChatMessage, error)
	UpdateStatus(ctx context.Context, id string, status domain.ChatMessageStatus) error
	UpdateStatusByOrderAndSender(ctx context.Context, orderID, senderID string, fromStatuses []domain.ChatMessageStatus, toStatus domain.ChatMessageStatus) ([]*domain.ChatMessage, error)
	UpdateStatusByChatAndSender(ctx context.Context, chatID, senderID string, fromStatuses []domain.ChatMessageStatus, toStatus domain.ChatMessageStatus) ([]*domain.ChatMessage, error)
	GetUnreadCountsByUser(ctx context.Context, userID string) ([]domain.UnreadOrderCount, error)
}

// ActivityTypeRepository defines methods for activity type persistence
type ActivityTypeRepository interface {
	Create(ctx context.Context, activityType *domain.ActivityType) error
	GetByID(ctx context.Context, id string) (*domain.ActivityType, error)
	GetByName(ctx context.Context, name string) (*domain.ActivityType, error)
	GetAll(ctx context.Context) ([]*domain.ActivityType, error)
	GetActive(ctx context.Context) ([]*domain.ActivityType, error)
	Update(ctx context.Context, activityType *domain.ActivityType) error
	Delete(ctx context.Context, id string) error
}

// UserActivityTypeRepository defines methods for user activity type persistence
type UserActivityTypeRepository interface {
	Create(ctx context.Context, uat *domain.UserActivityType) error
	GetByUserID(ctx context.Context, userID string) ([]*domain.UserActivityType, error)
	// GetByUserIDs batch-loads activity types for a set of users, returning a map
	// keyed by user_id. Needed to avoid N+1 queries on list endpoints.
	GetByUserIDs(ctx context.Context, userIDs []string) (map[string][]*domain.UserActivityType, error)
	GetByActivityTypeID(ctx context.Context, activityTypeID string) ([]*domain.UserActivityType, error)
	Delete(ctx context.Context, id string) error
	DeleteByUserID(ctx context.Context, userID string) error
}

// ReviewRepository defines methods for review persistence
type ReviewRepository interface {
	Create(ctx context.Context, review *domain.Review) error
	GetByID(ctx context.Context, id string) (*domain.Review, error)
	GetByToID(ctx context.Context, toID string) ([]*domain.Review, error)
	GetByFromID(ctx context.Context, fromID string) ([]*domain.Review, error)
	GetByOrderAndFromID(ctx context.Context, orderID, fromID string) (*domain.Review, error)
	GetAll(ctx context.Context) ([]*domain.Review, error)
	Update(ctx context.Context, review *domain.Review) error
	Delete(ctx context.Context, id string) error
}

// AutoWashRepository defines methods for auto wash persistence
type AutoWashRepository interface {
	Create(ctx context.Context, aw *domain.AutoWash) error
	GetByUserID(ctx context.Context, userID string) (*domain.AutoWash, error)
	GetByID(ctx context.Context, id string) (*domain.AutoWash, error)
	GetAll(ctx context.Context) ([]*domain.AutoWash, error)
	GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoWash, error)
	Update(ctx context.Context, aw *domain.AutoWash) error
	Delete(ctx context.Context, id string) error
}

// AutoShopRepository defines methods for auto shop persistence
type AutoShopRepository interface {
	Create(ctx context.Context, shop *domain.AutoShop) error
	GetByUserID(ctx context.Context, userID string) (*domain.AutoShop, error)
	GetByID(ctx context.Context, id string) (*domain.AutoShop, error)
	GetAll(ctx context.Context) ([]*domain.AutoShop, error)
	GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoShop, error)
	Update(ctx context.Context, shop *domain.AutoShop) error
	Delete(ctx context.Context, id string) error
}

// BusinessApplicationRepository defines methods for business application persistence
type BusinessApplicationRepository interface {
	Create(ctx context.Context, app *domain.BusinessApplication) error
	GetByID(ctx context.Context, id string) (*domain.BusinessApplication, error)
	GetLatestByUserID(ctx context.Context, userID string) (*domain.BusinessApplication, error)
	GetAll(ctx context.Context) ([]*domain.BusinessApplication, error)
	Update(ctx context.Context, app *domain.BusinessApplication) error
}

// AutoServiceRepository defines methods for auto service persistence
type AutoServiceRepository interface {
	Create(ctx context.Context, service *domain.AutoService) error
	GetByUserID(ctx context.Context, userID string) (*domain.AutoService, error)
	GetByID(ctx context.Context, id string) (*domain.AutoService, error)
	GetAll(ctx context.Context) ([]*domain.AutoService, error)
	GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoService, error)
	Update(ctx context.Context, service *domain.AutoService) error
	Delete(ctx context.Context, id string) error
}

// ActivityGroupRepository — CRUD для верхнего уровня классификации деятельности.
type ActivityGroupRepository interface {
	GetByID(ctx context.Context, id string) (*domain.ActivityGroup, error)
	GetByCode(ctx context.Context, code string) (*domain.ActivityGroup, error)
	GetAll(ctx context.Context) ([]*domain.ActivityGroup, error)
	GetActive(ctx context.Context) ([]*domain.ActivityGroup, error)
	Upsert(ctx context.Context, group *domain.ActivityGroup) error
}

// ActivitySubtypeRepository — CRUD для производных типов.
type ActivitySubtypeRepository interface {
	GetByID(ctx context.Context, id string) (*domain.ActivitySubtype, error)
	GetByGroupAndCode(ctx context.Context, groupID, code string) (*domain.ActivitySubtype, error)
	GetByGroupID(ctx context.Context, groupID string) ([]*domain.ActivitySubtype, error)
	GetActiveByGroupID(ctx context.Context, groupID string) ([]*domain.ActivitySubtype, error)
	GetAll(ctx context.Context) ([]*domain.ActivitySubtype, error)
	Upsert(ctx context.Context, subtype *domain.ActivitySubtype) error
	// MaxUpdatedAt возвращает максимальный updated_at по активным подтипам/группам —
	// используется для генерации ETag справочников.
	MaxUpdatedAt(ctx context.Context) (int64, error)
}

// CatalogRepository provides read access to profile/search reference data.
type CatalogRepository interface {
	ListProfessions(ctx context.Context) ([]*domain.CatalogProfession, error)
	ListServices(ctx context.Context) ([]*domain.CatalogService, error)
	ListProductCategories(ctx context.Context) ([]*domain.ProductCategory, error)
	ListVehicleBrands(ctx context.Context) ([]*domain.VehicleBrand, error)
}

// UserActivityProfileRepository — привязка пользователя к подтипу деятельности (source of truth).
type UserActivityProfileRepository interface {
	GetByID(ctx context.Context, id string) (*domain.UserActivityProfile, error)
	GetByUserID(ctx context.Context, userID string) ([]*domain.UserActivityProfile, error)
	GetPrimaryByUserID(ctx context.Context, userID string) (*domain.UserActivityProfile, error)
	GetByUserAndSubtype(ctx context.Context, userID, subtypeID string) (*domain.UserActivityProfile, error)
	// UpsertIdempotent — вставляет или ничего не делает при существующей паре (user, group, subtype).
	UpsertIdempotent(ctx context.Context, profile *domain.UserActivityProfile) error
	SetPrimary(ctx context.Context, userID, profileID string) error
}

// ActivityAuditLogRepository — журнал мутаций подтипов деятельности.
type ActivityAuditLogRepository interface {
	Create(ctx context.Context, entry *domain.ActivityAuditLog) error
	GetBySubjectUserID(ctx context.Context, userID string, limit int) ([]*domain.ActivityAuditLog, error)
}

// MediaRepository defines all persistence operations for the S3 media system.
type MediaRepository interface {
	// PendingIntents
	CreateIntent(ctx context.Context, intent *domain.PendingIntent) error
	GetIntentByID(ctx context.Context, id string) (*domain.PendingIntent, error)
	DeleteIntent(ctx context.Context, id string) error
	DeleteExpiredIntents(ctx context.Context) (stagingKeys []string, err error)
	CountIntentsByUserInWindow(ctx context.Context, userID string, window time.Duration) (int64, error)

	// MediaAssets
	CreateAsset(ctx context.Context, asset *domain.MediaAsset) (*domain.MediaAsset, error)
	GetAssetByID(ctx context.Context, id string) (*domain.MediaAsset, error)
	GetAssetByIntentID(ctx context.Context, intentID string) (*domain.MediaAsset, error)
	GetAssetsByEntity(ctx context.Context, entityType, entityID string) ([]*domain.MediaAsset, error)
	GetStaleProcessingJobs(ctx context.Context, olderThan time.Duration, limit int) ([]domain.ProcessJob, error)
	UpdateAsset(ctx context.Context, asset *domain.MediaAsset) error
	SoftDeleteAsset(ctx context.Context, id string) error
	CountAssetsByEntity(ctx context.Context, entityType, entityID, category string) (int64, error)
	GetActiveAvatarByEntity(ctx context.Context, entityType, entityID string) (*domain.MediaAsset, error)
	GetAssetsForHardDelete(ctx context.Context, grace time.Duration) ([]*domain.MediaAsset, error)
	HardDeleteAsset(ctx context.Context, id string) error

	// MediaDerivatives
	CreateDerivative(ctx context.Context, d *domain.MediaDerivative) error
	GetDerivativesByAssetID(ctx context.Context, assetID string) ([]*domain.MediaDerivative, error)
	DeleteDerivativesByAssetID(ctx context.Context, assetID string) error
}

type StoryRepository interface {
	Create(ctx context.Context, story *domain.Story) error
	GetByID(ctx context.Context, id string) (*domain.Story, error)
	GetAuthor(ctx context.Context, userID string) (*domain.StoryAuthorResponse, error)
	ListActiveByAuthor(ctx context.Context, authorID string) ([]*domain.Story, error)
	ListActiveByAuthors(ctx context.Context, authorIDs []string) ([]*domain.Story, error)
	ListActive(ctx context.Context) ([]*domain.Story, error)
	ListExpired(ctx context.Context, now time.Time) ([]*domain.Story, error)
	Delete(ctx context.Context, id string) error
	RecordView(ctx context.Context, view *domain.StoryView) error
	HasViewed(ctx context.Context, storyID, viewerID string) (bool, error)
	CreateReport(ctx context.Context, report *domain.StoryReport) error
	ListReports(ctx context.Context, limit, offset int) ([]*domain.StoryReport, error)
	GetHighlightByTitle(ctx context.Context, authorID, title string) (*domain.StoryHighlight, error)
	GetHighlightByID(ctx context.Context, authorID, highlightID string) (*domain.StoryHighlight, error)
	CreateHighlight(ctx context.Context, highlight *domain.StoryHighlight) error
	AddStoryToHighlight(ctx context.Context, item *domain.StoryHighlightStory) error
	RemoveStoryFromHighlight(ctx context.Context, highlightID, storyID string) error
	ListHighlightsByAuthor(ctx context.Context, authorID string) ([]*domain.StoryHighlight, error)
}

type SubscriptionRepository interface {
	Create(ctx context.Context, subscription *domain.Subscription) error
	Delete(ctx context.Context, followerID, followedID string) error
	Exists(ctx context.Context, followerID, followedID string) (bool, error)
	ListFollowedIDs(ctx context.Context, followerID string) ([]string, error)
	CountFollowing(ctx context.Context, followerID string) (int64, error)
	CountFollowers(ctx context.Context, followedID string) (int64, error)
	ListFollowing(ctx context.Context, followerID string) ([]domain.SubscriptionProfile, error)
	ListFollowers(ctx context.Context, followedID string) ([]domain.SubscriptionProfile, error)
}
