package usecase

import (
	"context"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
)

type ChatUseCase struct {
	orderRepo   repository.OrderRepository
	userRepo    repository.UserRepository
	messageRepo repository.ChatMessageRepository
}

func NewChatUseCase(
	orderRepo repository.OrderRepository,
	userRepo repository.UserRepository,
	messageRepo repository.ChatMessageRepository,
) *ChatUseCase {
	return &ChatUseCase{
		orderRepo:   orderRepo,
		userRepo:    userRepo,
		messageRepo: messageRepo,
	}
}

func (uc *ChatUseCase) GetOrderChat(ctx context.Context, userID, orderID string) (*domain.OrderChatResponse, error) {
	order, err := uc.GetOrderForParticipant(ctx, userID, orderID)
	if err != nil {
		return nil, err
	}

	chatID := orderID
	if order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	messages, err := uc.messageRepo.GetByChatID(ctx, chatID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.ChatMessageResponse, 0, len(messages))
	for _, message := range messages {
		responses = append(responses, chatMessageToResponse(message))
	}

	return &domain.OrderChatResponse{
		Order:    orderToResponse(order),
		Messages: responses,
	}, nil
}

func (uc *ChatUseCase) GetOrderForParticipant(ctx context.Context, userID, orderID string) (*domain.Order, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}
	if !isOrderParticipant(order, userID) {
		return nil, apperrors.ErrUnauthorized
	}
	if order.ChatID == nil {
		order.ChatID = &order.ID
		_ = uc.orderRepo.Update(ctx, order)
	}
	return order, nil
}

func (uc *ChatUseCase) SendOrderMessage(ctx context.Context, userID, orderID, text string) (*domain.ChatMessageResponse, *domain.Order, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, nil, apperrors.ErrOrderNotFound
	}
	if !isOrderParticipant(order, userID) {
		return nil, nil, apperrors.ErrUnauthorized
	}

	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, nil, apperrors.New("EMPTY_MESSAGE", "Message cannot be empty", 400)
	}

	if _, err := uc.userRepo.GetByID(ctx, userID); err != nil {
		return nil, nil, apperrors.ErrUserNotFound
	}

	message := &domain.ChatMessage{
		OrderID:  orderID,
		SenderID: userID,
		Message:  trimmed,
		Status:   domain.ChatMessageStatusSent,
	}
	if err := uc.messageRepo.Create(ctx, message); err != nil {
		return nil, nil, apperrors.ErrInternalServer
	}

	allMessages, err := uc.messageRepo.GetByOrderID(ctx, orderID)
	if err == nil {
		for _, candidate := range allMessages {
			if candidate.ID == message.ID {
				message = candidate
				break
			}
		}
	}

	return chatMessageToResponse(message), order, nil
}

func (uc *ChatUseCase) GetUnreadCounts(ctx context.Context, userID string) ([]domain.UnreadOrderCount, error) {
	counts, err := uc.messageRepo.GetUnreadCountsByUser(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return counts, nil
}

func (uc *ChatUseCase) UpdateMessageStatus(ctx context.Context, messageID string, status domain.ChatMessageStatus) error {
	return uc.messageRepo.UpdateStatus(ctx, messageID, status)
}

func (uc *ChatUseCase) MarkMessagesAsRead(ctx context.Context, orderID, readerID string) ([]*domain.ChatMessageResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}
	if !isOrderParticipant(order, readerID) {
		return nil, apperrors.ErrUnauthorized
	}

	senderID := order.CustomerID
	if senderID == readerID {
		senderID = providerIDOf(order)
	}

	chatID := orderID
	if order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	updated, err := uc.messageRepo.UpdateStatusByChatAndSender(
		ctx,
		chatID,
		senderID,
		[]domain.ChatMessageStatus{domain.ChatMessageStatusSent, domain.ChatMessageStatusDelivered},
		domain.ChatMessageStatusRead,
	)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.ChatMessageResponse, 0, len(updated))
	for _, msg := range updated {
		responses = append(responses, chatMessageToResponse(msg))
	}
	return responses, nil
}

func orderToResponse(order *domain.Order) *domain.OrderResponse {
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
		ConfirmedDateTime: formatNullableOrderTime(order.ConfirmedAt),
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

func formatNullableOrderTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

func chatMessageToResponse(message *domain.ChatMessage) *domain.ChatMessageResponse {
	var sender *domain.ChatUserResponse
	if message.Sender != nil {
		sender = &domain.ChatUserResponse{
			ID:    message.Sender.ID,
			Name:  message.Sender.Name,
			Phone: message.Sender.Phone,
		}
	}

	return &domain.ChatMessageResponse{
		ID:        message.ID,
		Message:   message.Message,
		CreatedAt: message.CreatedAt.Format(time.RFC3339),
		Status:    message.Status,
		Sender:    sender,
	}
}

func isOrderParticipant(order *domain.Order, userID string) bool {
	return order.CustomerID == userID || providerIDOf(order) == userID
}
