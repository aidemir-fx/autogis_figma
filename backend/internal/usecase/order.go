package usecase

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
)

// OrderUseCase handles order business logic
type OrderUseCase struct {
	orderRepo                   repository.OrderRepository
	userRepo                    repository.UserRepository
	activityTypeRepo            repository.ActivityTypeRepository
	userActivityTypeRepo        repository.UserActivityTypeRepository
	userActivityProfileRepo     repository.UserActivityProfileRepository
	messageRepo                 repository.ChatMessageRepository
	professionalApplicationRepo repository.ProfessionalApplicationRepository
}

func NewOrderUseCase(
	orderRepo repository.OrderRepository,
	userRepo repository.UserRepository,
	activityTypeRepo repository.ActivityTypeRepository,
	userActivityTypeRepo repository.UserActivityTypeRepository,
	messageRepo repository.ChatMessageRepository,
	professionalApplicationRepo repository.ProfessionalApplicationRepository,
	userActivityProfileRepo repository.UserActivityProfileRepository,
) *OrderUseCase {
	return &OrderUseCase{
		orderRepo:                   orderRepo,
		userRepo:                    userRepo,
		activityTypeRepo:            activityTypeRepo,
		userActivityTypeRepo:        userActivityTypeRepo,
		userActivityProfileRepo:     userActivityProfileRepo,
		messageRepo:                 messageRepo,
		professionalApplicationRepo: professionalApplicationRepo,
	}
}

func (uc *OrderUseCase) CreateOrder(ctx context.Context, customerID string, req *domain.CreateOrderRequest) (*domain.OrderResponse, error) {
	if len(req.ProviderIDs) == 0 {
		return nil, apperrors.New("VALIDATION_FAILED", "at least one provider is required", 400)
	}
	for _, candidateID := range req.ProviderIDs {
		if candidateID == customerID {
			return nil, apperrors.New("SELF_BOOKING_NOT_ALLOWED", "Нельзя оставить заявку самому себе", http.StatusBadRequest)
		}
	}
	providerID := req.ProviderIDs[0]
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	req.CarBrand = strings.TrimSpace(req.CarBrand)
	req.Description = strings.TrimSpace(req.Description)

	if req.Name == "" || req.Phone == "" || req.CarBrand == "" || req.Description == "" {
		return nil, apperrors.New("VALIDATION_FAILED", "name, phone, carBrand and description are required", 400)
	}
	if req.TimePreference == nil || !isValidTimePreference(*req.TimePreference) {
		return nil, apperrors.New("INVALID_TIME_PREFERENCE", "Invalid time preference", 400)
	}

	// Validate customer exists
	_, err := uc.userRepo.GetByID(ctx, customerID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	// Validate provider exists
	provider, err := uc.userRepo.GetByID(ctx, providerID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}
	providerIsProfessional := provider.IsProfessional
	if !providerIsProfessional && uc.professionalApplicationRepo != nil {
		application, applicationErr := uc.professionalApplicationRepo.GetLatestApplicationByUserID(ctx, providerID)
		if applicationErr == nil && application != nil {
			providerIsProfessional = application.Status == domain.ProfessionalApplicationStatusPending ||
				application.Status == domain.ProfessionalApplicationStatusNeedsRevision ||
				application.Status == domain.ProfessionalApplicationStatusApproved
		}
	}
	if !providerIsProfessional {
		return nil, apperrors.New("PROVIDER_NOT_PROFESSIONAL",
			"Выбранный пользователь не является профессиональным исполнителем",
			http.StatusBadRequest)
	}

	// Validate activity type exists
	activityType, err := uc.activityTypeRepo.GetByID(ctx, req.ActivityTypeID)
	if err != nil {
		return nil, apperrors.New("ACTIVITY_TYPE_NOT_FOUND", "Activity type not found", 404)
	}

	if !activityType.IsActive {
		return nil, apperrors.New("ACTIVITY_TYPE_INACTIVE", "Activity type is inactive", 400)
	}

	// Validate provider actually offers the requested activity type.
	// Без этой проверки клиент мог бы создать заявку на любого существующего
	// пользователя, что приводит к мусорным и неконсистентным заказам.
	uats, err := uc.userActivityTypeRepo.GetByUserID(ctx, providerID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	offersActivity := false
	for _, uat := range uats {
		if uat.ActivityTypeID == req.ActivityTypeID {
			offersActivity = true
			break
		}
	}
	if !offersActivity && uc.userActivityProfileRepo != nil {
		profiles, profileErr := uc.userActivityProfileRepo.GetByUserID(ctx, providerID)
		if profileErr != nil {
			return nil, apperrors.ErrInternalServer
		}
		for _, profile := range profiles {
			if profile == nil || profile.ActivityGroup == nil {
				continue
			}
			if legacyActivityTypeForGroup(profile.ActivityGroup.Code) == activityType.Name {
				offersActivity = true
				break
			}
		}
	}
	if !offersActivity {
		return nil, apperrors.New("PROVIDER_ACTIVITY_MISMATCH",
			"Выбранный исполнитель не оказывает запрошенный вид услуг",
			http.StatusBadRequest)
	}

	// A direct conversation is shared by the same customer/provider pair.
	// Reuse the first chat id so later orders become events in that chat.
	chatID, err := uc.orderRepo.GetDirectChatID(ctx, customerID, providerID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// Create order
	order := &domain.Order{
		CustomerID:     customerID,
		ProviderID:     &providerID,
		ActivityTypeID: req.ActivityTypeID,
		Name:           req.Name,
		CarBrand:       req.CarBrand,
		Description:    req.Description,
		TimePreference: req.TimePreference,
		Phone:          req.Phone,
		PhotoAssetIDs:  req.PhotoAssetIDs,
		Price:          req.Price,
		ChatID:         chatID,
		Status:         domain.OrderStatusPending,
	}

	if err := uc.orderRepo.CreateWithInvitations(ctx, order, req.ProviderIDs); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	// For new orders chat identity is always available and deterministic.
	if order.ChatID == nil {
		order.ChatID = &order.ID
		if err := uc.orderRepo.Update(ctx, order); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}

	_ = uc.messageRepo.Create(ctx, &domain.ChatMessage{
		OrderID:  order.ID,
		SenderID: customerID,
		Message:  "Клиент создал заявку и ожидает ответа мастера.",
		Status:   domain.ChatMessageStatusSent,
	})

	// Reload with relations
	order, err = uc.orderRepo.GetByID(ctx, order.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.orderToResponse(order), nil
}

func legacyActivityTypeForGroup(groupCode string) string {
	switch groupCode {
	case "private_executor":
		return "master"
	case "auto_service":
		return "auto_service"
	case "auto_wash":
		return "auto_wash"
	case "auto_shop":
		return "auto_shop"
	default:
		return groupCode
	}
}

func (uc *OrderUseCase) GetOrder(ctx context.Context, id string, actorID string, actorRole domain.UserRole) (*domain.OrderResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}

	if !canAccessOrder(order, actorID, actorRole) {
		return nil, apperrors.New("FORBIDDEN", "Forbidden", 403)
	}

	return uc.orderToResponse(order), nil
}

func (uc *OrderUseCase) GetCustomerOrders(ctx context.Context, customerID string) ([]*domain.OrderResponse, error) {
	orders, err := uc.orderRepo.GetByCustomerID(ctx, customerID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.OrderResponse, len(orders))
	for i, order := range orders {
		responses[i] = uc.orderToResponse(order)
	}
	return responses, nil
}

func (uc *OrderUseCase) GetProviderOrders(ctx context.Context, providerID string) ([]*domain.OrderResponse, error) {
	orders, err := uc.orderRepo.GetByProviderID(ctx, providerID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	invitations, err := uc.orderRepo.GetOrderInvitations(ctx, providerID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.OrderResponse, 0, len(orders)+len(invitations))
	seenOrderIDs := make(map[string]struct{}, len(orders)+len(invitations))
	for _, order := range orders {
		seenOrderIDs[order.ID] = struct{}{}
		responses = append(responses, uc.orderToResponse(order))
	}
	for _, inv := range invitations {
		if inv.Order == nil {
			continue
		}
		if _, seen := seenOrderIDs[inv.Order.ID]; seen {
			continue
		}
		seenOrderIDs[inv.Order.ID] = struct{}{}
		// Treat pending invitation as an order in pending status for this provider
		// (Normally we might want a specific flag to show it's an invitation)
		resp := uc.orderToResponse(inv.Order)
		responses = append(responses, resp)
	}

	return responses, nil
}

func (uc *OrderUseCase) UpdateOrderStatus(ctx context.Context, id string, actorID string, actorRole domain.UserRole, req *domain.UpdateOrderStatusRequest) (*domain.OrderResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}

	if !canAccessOrder(order, actorID, actorRole) {
		return nil, apperrors.New("FORBIDDEN", "Forbidden", 403)
	}
	isProvider := actorID != "" && actorID == providerIDOf(order)
	isCustomer := actorID != "" && actorID == order.CustomerID
	if actorRole != domain.RoleAdmin && !isProvider && !(isCustomer && req.Status == domain.OrderStatusCancelled) {
		return nil, apperrors.New("FORBIDDEN", "Only the customer can cancel their request or the provider can update its status", 403)
	}

	if req.ExpectedUpdatedAt != nil && strings.TrimSpace(*req.ExpectedUpdatedAt) != "" {
		expected, parseErr := parseRFC3339Flexible(strings.TrimSpace(*req.ExpectedUpdatedAt))
		if parseErr != nil {
			return nil, apperrors.New("VALIDATION_FAILED", "expectedUpdatedAt must be RFC3339", 400)
		}
		if !order.UpdatedAt.Truncate(time.Second).Equal(expected.Truncate(time.Second)) {
			return nil, apperrors.New("ORDER_CONFLICT", "Order has been changed, reload and retry", 409)
		}
	}

	if order.Status == req.Status {
		return uc.orderToResponse(order), nil
	}

	// Validate status transition
	if !isValidStatusTransition(order.Status, req.Status) {
		return nil, apperrors.ErrInvalidOrderStatus
	}

	switch req.Status {
	case domain.OrderStatusScheduled:
		if req.ConfirmedDateTime == nil || strings.TrimSpace(*req.ConfirmedDateTime) == "" {
			return nil, apperrors.New("VALIDATION_FAILED", "confirmedDateTime is required for scheduled status", 400)
		}

		confirmedAt, parseErr := parseRFC3339Flexible(strings.TrimSpace(*req.ConfirmedDateTime))
		if parseErr != nil {
			return nil, apperrors.New("VALIDATION_FAILED", "confirmedDateTime must be RFC3339", 400)
		}

		slotEnd := confirmedAt.Add(60 * time.Minute)
		hasConflict, conflictErr := uc.orderRepo.HasProviderScheduleConflict(ctx, providerIDOf(order), confirmedAt, slotEnd, order.ID)
		if conflictErr != nil {
			return nil, apperrors.ErrInternalServer
		}
		if hasConflict {
			return nil, apperrors.New("SCHEDULE_CONFLICT", "Selected time slot is already occupied", 409)
		}

		order.ConfirmedAt = &confirmedAt
		order.CancelReason = nil
	case domain.OrderStatusCancelled:
		reason := "Отменено клиентом"
		if req.CancelReason != nil && strings.TrimSpace(*req.CancelReason) != "" {
			reason = strings.TrimSpace(*req.CancelReason)
		} else if !isCustomer && actorRole != domain.RoleAdmin {
			return nil, apperrors.New("VALIDATION_FAILED", "cancelReason is required for cancelled status", 400)
		}
		order.CancelReason = &reason
	case domain.OrderStatusCompleted:
		order.CancelReason = nil
	}

	order.Status = req.Status

	if err := uc.orderRepo.Update(ctx, order); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	statusMessage := buildStatusChatMessage(order, req.Status, actorID)
	var createdMessage *domain.ChatMessage
	if statusMessage != "" {
		messageSenderID := actorID
		if messageSenderID == "" {
			messageSenderID = providerIDOf(order)
		}
		createdMessage = &domain.ChatMessage{
			OrderID:  order.ID,
			SenderID: messageSenderID,
			Message:  statusMessage,
			Status:   domain.ChatMessageStatusSent,
		}
		if err := uc.messageRepo.Create(ctx, createdMessage); err != nil {
			createdMessage = nil
		}
	}

	_ = createdMessage // Mark as used

	// Reload with relations
	order, err = uc.orderRepo.GetByID(ctx, order.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.orderToResponse(order), nil
}

func (uc *OrderUseCase) DeleteOrder(ctx context.Context, id string, actorID string, actorRole domain.UserRole) error {
	order, err := uc.orderRepo.GetByID(ctx, id)
	if err != nil {
		return apperrors.ErrOrderNotFound
	}

	if actorID != order.CustomerID && actorRole != domain.RoleAdmin {
		return apperrors.New("FORBIDDEN", "Forbidden", 403)
	}

	// Only pending orders can be deleted
	if order.Status != domain.OrderStatusPending {
		return apperrors.New("ORDER_CANNOT_DELETE", "Only pending orders can be deleted", 400)
	}

	return uc.orderRepo.Delete(ctx, id)
}

func (uc *OrderUseCase) GetLatestOrderMessage(ctx context.Context, orderID string) (*domain.ChatMessage, error) {
	messages, err := uc.messageRepo.GetByOrderID(ctx, orderID)
	if err != nil || len(messages) == 0 {
		return nil, err
	}
	return messages[len(messages)-1], nil
}

func (uc *OrderUseCase) orderToResponse(order *domain.Order) *domain.OrderResponse {
	var customerResp, providerResp *domain.UserResponse
	var activityTypeResp *domain.ActivityTypeResponse

	if order.Customer != nil {
		customerResp = buildUserResponse(order.Customer)
	}

	if order.Provider != nil {
		providerResp = buildUserResponse(order.Provider)
	}

	if order.ActivityType != nil {
		activityTypeResp = &domain.ActivityTypeResponse{
			ID:        order.ActivityType.ID,
			Name:      order.ActivityType.Name,
			IsActive:  order.ActivityType.IsActive,
			CreatedAt: order.ActivityType.CreatedAt.Format(time.RFC3339),
		}
	}

	return &domain.OrderResponse{
		ID:                order.ID,
		CustomerID:        order.CustomerID,
		ProviderID:        providerIDOf(order),
		ActivityTypeID:    order.ActivityTypeID,
		Name:              order.Name,
		Phone:             order.Phone,
		CarBrand:          order.CarBrand,
		Description:       order.Description,
		TimePreference:    order.TimePreference,
		PhotoAssetIDs:     append([]string(nil), order.PhotoAssetIDs...),
		Price:             order.Price,
		ConfirmedDateTime: formatNullableTime(order.ConfirmedAt),
		CancelReason:      order.CancelReason,
		ChatID:            order.ChatID,
		Status:            order.Status,
		Customer:          customerResp,
		Provider:          providerResp,
		ActivityType:      activityTypeResp,
		CreatedAt:         order.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         order.UpdatedAt.Format(time.RFC3339),
	}
}

func isValidTimePreference(value domain.OrderTimePreference) bool {
	switch value {
	case domain.OrderTimePreferenceUrgent,
		domain.OrderTimePreferenceNotUrgent:
		return true
	default:
		return false
	}
}

func isValidStatusTransition(from, to domain.OrderStatus) bool {
	validTransitions := map[domain.OrderStatus][]domain.OrderStatus{
		domain.OrderStatusPending: {
			domain.OrderStatusScheduled,
			domain.OrderStatusCancelled,
		},
		domain.OrderStatusScheduled: {
			domain.OrderStatusCompleted,
			domain.OrderStatusCancelled,
		},
		domain.OrderStatusCompleted: {},
		domain.OrderStatusCancelled: {},
	}

	transitions, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, t := range transitions {
		if t == to {
			return true
		}
	}
	return false
}

func canAccessOrder(order *domain.Order, actorID string, actorRole domain.UserRole) bool {
	if actorRole == domain.RoleAdmin {
		return true
	}
	return order.CustomerID == actorID || providerIDOf(order) == actorID
}

func formatNullableTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := t.Format(time.RFC3339)
	return &v
}

// parseRFC3339Flexible accepts both RFC3339 (no fractional seconds) and RFC3339Nano
// (with fractional seconds). JavaScript's Date.toISOString() produces the latter.
func parseRFC3339Flexible(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339Nano, s)
}

func buildStatusChatMessage(order *domain.Order, status domain.OrderStatus, actorID string) string {
	switch status {
	case domain.OrderStatusScheduled:
		if order.ConfirmedAt != nil {
			return fmt.Sprintf("Мастер подтвердил заявку. Запись назначена на %s.", order.ConfirmedAt.Format(time.RFC3339))
		}
		return "Мастер подтвердил заявку."
	case domain.OrderStatusCancelled:
		if order.CancelReason != nil && strings.TrimSpace(*order.CancelReason) != "" {
			actor := "Мастер"
			if actorID == order.CustomerID {
				actor = "Клиент"
			}
			return fmt.Sprintf("%s отменил заявку. Причина: %s", actor, strings.TrimSpace(*order.CancelReason))
		}
		if actorID == order.CustomerID {
			return "Клиент отменил заявку."
		}
		return "Мастер отменил заявку."
	case domain.OrderStatusCompleted:
		return "Мастер отметил заявку как выполненную."
	default:
		return ""
	}
}

func (uc *OrderUseCase) AcceptInvitation(ctx context.Context, orderID string, providerID string) (*domain.OrderResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}

	if order.ProviderID != nil {
		return nil, apperrors.New("CONFLICT", "Order already accepted", 409)
	}

	if err := uc.orderRepo.AcceptInvitation(ctx, orderID, providerID); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	updatedOrder, _ := uc.orderRepo.GetByID(ctx, orderID)
	return uc.orderToResponse(updatedOrder), nil
}

func providerIDOf(order *domain.Order) string {
	if order == nil || order.ProviderID == nil {
		return ""
	}
	return *order.ProviderID
}
