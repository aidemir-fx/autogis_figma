package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/pkg/jwt"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/gorilla/websocket"
)

type chatWSRequest struct {
	OrderID string `json:"orderId"`
	Message string `json:"message"`
}

type ChatWSHandler struct {
	hub      *Hub
	chatUse  *usecase.ChatUseCase
	jwtSvc   *jwt.JWTService
	upgrader websocket.Upgrader
}

func NewChatWSHandler(hub *Hub, chatUse *usecase.ChatUseCase, jwtSvc *jwt.JWTService, frontendURL string) *ChatWSHandler {
	allowedOrigins := buildAllowedOrigins(frontendURL)
	return &ChatWSHandler{
		hub:     hub,
		chatUse: chatUse,
		jwtSvc:  jwtSvc,
		upgrader: websocket.Upgrader{
			// "bearer" is used as WS subprotocol when token is sent via
			// Sec-WebSocket-Protocol: bearer, <jwt>.
			Subprotocols: []string{"bearer"},
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				_, ok := allowedOrigins[origin]
				return ok
			},
		},
	}
}

func (h *ChatWSHandler) Serve(c *gin.Context) {
	token := tokenFromRequest(c.Request)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := h.jwtSvc.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &wsClient{
		conn:   conn,
		userID: claims.UserID,
		hub:    h.hub,
		orders: make(map[string]struct{}),
	}

	h.hub.Register(client)
	defer func() {
		h.hub.Unregister(client)
		_ = conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)
	_ = conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(_ string) error {
		return conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	stopPing := make(chan struct{})
	defer close(stopPing)
	go func() {
		for {
			select {
			case <-ticker.C:
				client.mu.Lock()
				_ = conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					client.mu.Unlock()
					return
				}
				client.mu.Unlock()
			case <-stopPing:
				return
			}
		}
	}()

	for {
		var incoming inboundEnvelope
		if err := conn.ReadJSON(&incoming); err != nil {
			return
		}

		switch incoming.Event {
		case "join_order_chat":
			h.handleJoin(c.Request.Context(), client, incoming)
		case "leave_order_chat":
			h.handleLeave(c.Request.Context(), client, incoming)
		case "typing_start":
			h.handleTyping(c.Request.Context(), client, incoming, true)
		case "typing_stop":
			h.handleTyping(c.Request.Context(), client, incoming, false)
		case "send_order_message":
			h.handleSendMessage(c.Request.Context(), client, incoming)
		}
	}
}

func (h *ChatWSHandler) handleJoin(ctx context.Context, client *wsClient, incoming inboundEnvelope) {
	var req chatWSRequest
	if err := json.Unmarshal(incoming.Data, &req); err != nil || req.OrderID == "" {
		return
	}

	order, err := h.chatUse.GetOrderForParticipant(ctx, client.userID, req.OrderID)
	if err != nil {
		return
	}
	chatID := req.OrderID
	if order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	h.hub.JoinOrder(client, chatID)

	updatedMessages, err := h.chatUse.MarkMessagesAsRead(ctx, req.OrderID, client.userID)
	if err != nil {
		return
	}
	for _, msg := range updatedMessages {
		h.hub.EmitMessageStatusUpdated(
			orderParticipantIDs(order),
			req.OrderID,
			chatID,
			msg.ID,
			domain.ChatMessageStatusRead,
		)
	}
}

func (h *ChatWSHandler) handleLeave(ctx context.Context, client *wsClient, incoming inboundEnvelope) {
	var req chatWSRequest
	if err := json.Unmarshal(incoming.Data, &req); err != nil || req.OrderID == "" {
		return
	}
	chatID := req.OrderID
	if order, err := h.chatUse.GetOrderForParticipant(ctx, client.userID, req.OrderID); err == nil && order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	h.hub.LeaveOrder(client, chatID)
}

func (h *ChatWSHandler) handleTyping(ctx context.Context, client *wsClient, incoming inboundEnvelope, isTyping bool) {
	var req chatWSRequest
	if err := json.Unmarshal(incoming.Data, &req); err != nil || req.OrderID == "" {
		return
	}

	order, err := h.chatUse.GetOrderForParticipant(ctx, client.userID, req.OrderID)
	if err != nil {
		return
	}

	recipients := orderParticipantIDs(order)
	chatID := req.OrderID
	if order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	h.hub.EmitTypingIndicator(recipients, req.OrderID, chatID, client.userID, isTyping)
}

func (h *ChatWSHandler) handleSendMessage(ctx context.Context, client *wsClient, incoming inboundEnvelope) {
	var req chatWSRequest
	if err := json.Unmarshal(incoming.Data, &req); err != nil || req.OrderID == "" {
		_ = client.writeJSON(envelope{
			Event:     "send_order_message_ack",
			RequestID: incoming.RequestID,
			Data: map[string]interface{}{
				"ok":    false,
				"error": "invalid payload",
			},
		})
		return
	}

	msg, order, err := h.chatUse.SendOrderMessage(ctx, client.userID, req.OrderID, req.Message)
	if err != nil {
		_ = client.writeJSON(envelope{
			Event:     "send_order_message_ack",
			RequestID: incoming.RequestID,
			Data: map[string]interface{}{
				"ok":    false,
				"error": "failed to send",
			},
		})
		return
	}

	recipientID := order.CustomerID
	if recipientID == client.userID {
		if order.ProviderID == nil {
			return
		}
		recipientID = *order.ProviderID
	}

	chatID := req.OrderID
	if order.ChatID != nil && *order.ChatID != "" {
		chatID = *order.ChatID
	}
	if h.hub.IsUserInOrderRoom(recipientID, chatID) {
		msg.Status = domain.ChatMessageStatusRead
		_ = h.chatUse.UpdateMessageStatus(ctx, msg.ID, domain.ChatMessageStatusRead)
	} else if h.hub.IsUserOnline(recipientID) {
		msg.Status = domain.ChatMessageStatusDelivered
		_ = h.chatUse.UpdateMessageStatus(ctx, msg.ID, domain.ChatMessageStatusDelivered)
	}

	recipients := orderParticipantIDs(order)
	h.hub.EmitNewOrderMessage(recipients, req.OrderID, chatID, msg)
	h.hub.EmitMessageStatusUpdated(recipients, req.OrderID, chatID, msg.ID, msg.Status)

	_ = client.writeJSON(envelope{
		Event:     "send_order_message_ack",
		RequestID: incoming.RequestID,
		Data: map[string]interface{}{
			"ok":      true,
			"message": msg,
		},
	})
}

func orderParticipantIDs(order *domain.Order) []string {
	ids := []string{order.CustomerID}
	if order.ProviderID != nil && *order.ProviderID != "" {
		ids = append(ids, *order.ProviderID)
	}
	return ids
}

func tokenFromRequest(req *http.Request) string {
	auth := req.Header.Get("Authorization")
	if auth != "" {
		parts := strings.Split(auth, " ")
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return parts[1]
		}
	}

	// Browser WebSocket API does not let us set Authorization header directly.
	// Use Sec-WebSocket-Protocol: bearer, <jwt> as a safer alternative to URL query.
	if protocolHeader := req.Header.Get("Sec-WebSocket-Protocol"); protocolHeader != "" {
		parts := strings.Split(protocolHeader, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		if len(parts) >= 2 && strings.EqualFold(parts[0], "bearer") && parts[1] != "" {
			return parts[1]
		}
	}

	token := req.URL.Query().Get("token")
	if token != "" {
		return token
	}
	return ""
}

func buildAllowedOrigins(frontendURL string) map[string]struct{} {
	allowed := map[string]struct{}{
		"http://localhost:5173": {},
		"http://127.0.0.1:5173": {},
	}
	if frontendURL == "" {
		return allowed
	}

	allowed[frontendURL] = struct{}{}
	if parsed, err := url.Parse(frontendURL); err == nil {
		host := parsed.Hostname()
		port := parsed.Port()
		switch host {
		case "localhost":
			allowed[parsed.Scheme+"://127.0.0.1:"+port] = struct{}{}
		case "127.0.0.1":
			allowed[parsed.Scheme+"://localhost:"+port] = struct{}{}
		}
	}

	return allowed
}
