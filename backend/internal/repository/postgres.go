package repository

import (
	"context"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type UserRepositoryImpl struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &UserRepositoryImpl{db: db}
}

func (r *UserRepositoryImpl) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepositoryImpl) GetAll(ctx context.Context) ([]*domain.User, error) {
	var users []*domain.User
	err := r.db.WithContext(ctx).Find(&users).Error
	return users, err
}

func (r *UserRepositoryImpl) GetByRole(ctx context.Context, role domain.UserRole) ([]*domain.User, error) {
	var users []*domain.User
	err := r.db.WithContext(ctx).Where("role = ?", role).Find(&users).Error
	return users, err
}

func (r *UserRepositoryImpl) Update(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *UserRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.User{}, "id = ?", id).Error
}

// OrderRepository implementation
type OrderRepositoryImpl struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &OrderRepositoryImpl{db: db}
}

func (r *OrderRepositoryImpl) Create(ctx context.Context, order *domain.Order) error {
	return r.db.WithContext(ctx).Create(order).Error
}

func (r *OrderRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Order, error) {
	var order domain.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Provider").
		Preload("ActivityType").
		Where("id = ?", id).
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepositoryImpl) GetDirectChatID(ctx context.Context, customerID, providerID string) (*string, error) {
	var row struct {
		ChatID *string
	}
	err := r.db.WithContext(ctx).
		Model(&domain.Order{}).
		Select("chat_id").
		Where("customer_id = ? AND provider_id = ? AND chat_id IS NOT NULL", customerID, providerID).
		Order("created_at ASC").
		Limit(1).
		Scan(&row).Error
	if err != nil {
		return nil, err
	}
	return row.ChatID, nil
}

func (r *OrderRepositoryImpl) GetByCustomerID(ctx context.Context, customerID string) ([]*domain.Order, error) {
	var orders []*domain.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Provider").
		Preload("ActivityType").
		Where("customer_id = ?", customerID).
		Order("created_at DESC").
		Find(&orders).Error
	return orders, err
}

func (r *OrderRepositoryImpl) GetByProviderID(ctx context.Context, providerID string) ([]*domain.Order, error) {
	var orders []*domain.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Provider").
		Preload("ActivityType").
		Where("provider_id = ?", providerID).
		Order("created_at DESC").
		Find(&orders).Error
	return orders, err
}

func (r *OrderRepositoryImpl) GetAll(ctx context.Context) ([]*domain.Order, error) {
	var orders []*domain.Order
	err := r.db.WithContext(ctx).
		Preload("Customer").
		Preload("Provider").
		Preload("ActivityType").
		Order("created_at DESC").
		Find(&orders).Error
	return orders, err
}

func (r *OrderRepositoryImpl) HasPhotoAssetForParticipant(ctx context.Context, assetID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.Order{}).
		Where("(customer_id = ? OR provider_id = ?)", userID, userID).
		Where("photo_asset_ids @> ARRAY[?]::text[]", assetID).
		Count(&count).Error
	return count > 0, err
}

func (r *OrderRepositoryImpl) HasProviderScheduleConflict(ctx context.Context, providerID string, start, end time.Time, excludeOrderID string) (bool, error) {
	var count int64

	query := r.db.WithContext(ctx).
		Model(&domain.Order{}).
		Where("provider_id = ?", providerID).
		Where("status = ?", domain.OrderStatusScheduled).
		Where("confirmed_at IS NOT NULL").
		Where("confirmed_at < ?", end).
		Where("(confirmed_at + interval '60 minutes') > ?", start)

	if excludeOrderID != "" {
		query = query.Where("id <> ?", excludeOrderID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *OrderRepositoryImpl) Update(ctx context.Context, order *domain.Order) error {
	return r.db.WithContext(ctx).Save(order).Error
}

func (r *OrderRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Order{}, "id = ?", id).Error
}

// ActivityTypeRepository implementation
type ActivityTypeRepositoryImpl struct {
	db *gorm.DB
}

func NewActivityTypeRepository(db *gorm.DB) ActivityTypeRepository {
	return &ActivityTypeRepositoryImpl{db: db}
}

func (r *ActivityTypeRepositoryImpl) Create(ctx context.Context, activityType *domain.ActivityType) error {
	return r.db.WithContext(ctx).Create(activityType).Error
}

func (r *ActivityTypeRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.ActivityType, error) {
	var at domain.ActivityType
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&at).Error
	if err != nil {
		return nil, err
	}
	return &at, nil
}

func (r *ActivityTypeRepositoryImpl) GetByName(ctx context.Context, name string) (*domain.ActivityType, error) {
	var at domain.ActivityType
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&at).Error
	if err != nil {
		return nil, err
	}
	return &at, nil
}

func (r *ActivityTypeRepositoryImpl) GetAll(ctx context.Context) ([]*domain.ActivityType, error) {
	var ats []*domain.ActivityType
	err := r.db.WithContext(ctx).Order("name").Find(&ats).Error
	return ats, err
}

func (r *ActivityTypeRepositoryImpl) GetActive(ctx context.Context) ([]*domain.ActivityType, error) {
	var ats []*domain.ActivityType
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("name").Find(&ats).Error
	return ats, err
}

func (r *ActivityTypeRepositoryImpl) Update(ctx context.Context, activityType *domain.ActivityType) error {
	return r.db.WithContext(ctx).Save(activityType).Error
}

func (r *ActivityTypeRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.ActivityType{}, "id = ?", id).Error
}

// UserActivityTypeRepository implementation
type UserActivityTypeRepositoryImpl struct {
	db *gorm.DB
}

func NewUserActivityTypeRepository(db *gorm.DB) UserActivityTypeRepository {
	return &UserActivityTypeRepositoryImpl{db: db}
}

func (r *UserActivityTypeRepositoryImpl) Create(ctx context.Context, uat *domain.UserActivityType) error {
	return r.db.WithContext(ctx).Create(uat).Error
}

func (r *UserActivityTypeRepositoryImpl) GetByUserID(ctx context.Context, userID string) ([]*domain.UserActivityType, error) {
	var uats []*domain.UserActivityType
	err := r.db.WithContext(ctx).
		Preload("ActivityType").
		Where("user_id = ?", userID).
		Find(&uats).Error
	return uats, err
}

func (r *UserActivityTypeRepositoryImpl) GetByUserIDs(ctx context.Context, userIDs []string) (map[string][]*domain.UserActivityType, error) {
	result := make(map[string][]*domain.UserActivityType, len(userIDs))
	if len(userIDs) == 0 {
		return result, nil
	}
	var uats []*domain.UserActivityType
	if err := r.db.WithContext(ctx).
		Preload("ActivityType").
		Where("user_id IN ?", userIDs).
		Find(&uats).Error; err != nil {
		return nil, err
	}
	for _, uat := range uats {
		result[uat.UserID] = append(result[uat.UserID], uat)
	}
	return result, nil
}

func (r *UserActivityTypeRepositoryImpl) GetByActivityTypeID(ctx context.Context, activityTypeID string) ([]*domain.UserActivityType, error) {
	var uats []*domain.UserActivityType
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("activity_type_id = ?", activityTypeID).
		Find(&uats).Error
	return uats, err
}

func (r *UserActivityTypeRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.UserActivityType{}, "id = ?", id).Error
}

func (r *UserActivityTypeRepositoryImpl) DeleteByUserID(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Delete(&domain.UserActivityType{}, "user_id = ?", userID).Error
}

// ReviewRepository implementation
type ReviewRepositoryImpl struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) ReviewRepository {
	return &ReviewRepositoryImpl{db: db}
}

func (r *ReviewRepositoryImpl) Create(ctx context.Context, review *domain.Review) error {
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *ReviewRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Review, error) {
	var review domain.Review
	err := r.db.WithContext(ctx).
		Preload("From").
		Preload("To").
		Preload("Order").
		Where("id = ?", id).
		First(&review).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *ReviewRepositoryImpl) GetByToID(ctx context.Context, toID string) ([]*domain.Review, error) {
	var reviews []*domain.Review
	err := r.db.WithContext(ctx).
		Preload("From").
		Preload("To").
		Preload("Order").
		Where("to_id = ?", toID).
		Order("created_at DESC").
		Find(&reviews).Error
	return reviews, err
}

func (r *ReviewRepositoryImpl) GetByFromID(ctx context.Context, fromID string) ([]*domain.Review, error) {
	var reviews []*domain.Review
	err := r.db.WithContext(ctx).
		Preload("From").
		Preload("To").
		Preload("Order").
		Where("from_id = ?", fromID).
		Order("created_at DESC").
		Find(&reviews).Error
	return reviews, err
}

func (r *ReviewRepositoryImpl) GetByOrderAndFromID(ctx context.Context, orderID, fromID string) (*domain.Review, error) {
	var review domain.Review
	err := r.db.WithContext(ctx).
		Preload("From").
		Preload("To").
		Preload("Order").
		Where("order_id = ? AND from_id = ?", orderID, fromID).
		First(&review).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

func (r *ReviewRepositoryImpl) GetAll(ctx context.Context) ([]*domain.Review, error) {
	var reviews []*domain.Review
	err := r.db.WithContext(ctx).
		Preload("From").
		Preload("To").
		Preload("Order").
		Order("created_at DESC").
		Find(&reviews).Error
	return reviews, err
}

func (r *ReviewRepositoryImpl) Update(ctx context.Context, review *domain.Review) error {
	return r.db.WithContext(ctx).Save(review).Error
}

func (r *ReviewRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Review{}, "id = ?", id).Error
}

func (r *OrderRepositoryImpl) CreateWithInvitations(ctx context.Context, order *domain.Order, providerIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for _, pid := range providerIDs {
			invitation := &domain.OrderInvitation{
				OrderID:    order.ID,
				ProviderID: pid,
				Status:     domain.InvitationStatusPending,
			}
			if err := tx.Create(invitation).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *OrderRepositoryImpl) GetOrderInvitations(ctx context.Context, providerID string) ([]*domain.OrderInvitation, error) {
	var invitations []*domain.OrderInvitation
	err := r.db.WithContext(ctx).
		Preload("Order").
		Preload("Order.Customer").
		Preload("Order.Provider").
		Preload("Order.ActivityType").
		Where("provider_id = ? AND status = ?", providerID, domain.InvitationStatusPending).
		Find(&invitations).Error
	return invitations, err
}

func (r *OrderRepositoryImpl) AcceptInvitation(ctx context.Context, orderID, providerID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update the specific invitation
		if err := tx.Model(&domain.OrderInvitation{}).
			Where("order_id = ? AND provider_id = ?", orderID, providerID).
			Update("status", domain.InvitationStatusAccepted).Error; err != nil {
			return err
		}
		// Expire other invitations
		if err := tx.Model(&domain.OrderInvitation{}).
			Where("order_id = ? AND provider_id != ?", orderID, providerID).
			Update("status", domain.InvitationStatusExpired).Error; err != nil {
			return err
		}
		// Update the order itself
		if err := tx.Model(&domain.Order{}).
			Where("id = ?", orderID).
			Update("provider_id", providerID).Error; err != nil {
			return err
		}
		return nil
	})
}
