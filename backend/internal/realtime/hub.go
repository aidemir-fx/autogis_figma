package realtime

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 45 * time.Second
	maxMessageSize = 16 * 1024
)

type envelope struct {
	Event     string      `json:"event"`
	Data      interface{} `json:"data,omitempty"`
	RequestID string      `json:"requestId,omitempty"`
}

type inboundEnvelope struct {
	Event     string          `json:"event"`
	Data      json.RawMessage `json:"data"`
	RequestID string          `json:"requestId,omitempty"`
}

type wsClient struct {
	conn   *websocket.Conn
	userID string
	hub    *Hub

	mu     sync.Mutex
	orders map[string]struct{}
}

func (c *wsClient) writeJSON(payload envelope) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.conn.SetWriteDeadline(time.Now().Add(writeWait))
	return c.conn.WriteJSON(payload)
}

type Hub struct {
	mu sync.RWMutex

	clientsByUser map[string]map[*wsClient]struct{}
	clientsByRoom map[string]map[*wsClient]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clientsByUser: make(map[string]map[*wsClient]struct{}),
		clientsByRoom: make(map[string]map[*wsClient]struct{}),
	}
}

func (h *Hub) Register(client *wsClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clientsByUser[client.userID]; !ok {
		h.clientsByUser[client.userID] = make(map[*wsClient]struct{})
	}
	h.clientsByUser[client.userID][client] = struct{}{}
}

func (h *Hub) Unregister(client *wsClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for orderID := range client.orders {
		if roomClients, ok := h.clientsByRoom[orderID]; ok {
			delete(roomClients, client)
			if len(roomClients) == 0 {
				delete(h.clientsByRoom, orderID)
			}
		}
	}

	if userClients, ok := h.clientsByUser[client.userID]; ok {
		delete(userClients, client)
		if len(userClients) == 0 {
			delete(h.clientsByUser, client.userID)
		}
	}
}

func (h *Hub) JoinOrder(client *wsClient, orderID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clientsByRoom[orderID]; !ok {
		h.clientsByRoom[orderID] = make(map[*wsClient]struct{})
	}
	h.clientsByRoom[orderID][client] = struct{}{}
	client.orders[orderID] = struct{}{}
}

func (h *Hub) LeaveOrder(client *wsClient, orderID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(client.orders, orderID)
	if roomClients, ok := h.clientsByRoom[orderID]; ok {
		delete(roomClients, client)
		if len(roomClients) == 0 {
			delete(h.clientsByRoom, orderID)
		}
	}
}

func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	clients := h.clientsByUser[userID]
	return len(clients) > 0
}

func (h *Hub) IsUserInOrderRoom(userID, orderID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	roomClients := h.clientsByRoom[orderID]
	for client := range roomClients {
		if client.userID == userID {
			return true
		}
	}
	return false
}

func (h *Hub) emitToUsers(userIDs []string, event string, data interface{}) {
	h.mu.RLock()
	clients := make([]*wsClient, 0)
	for _, userID := range userIDs {
		for client := range h.clientsByUser[userID] {
			clients = append(clients, client)
		}
	}
	h.mu.RUnlock()

	payload := envelope{Event: event, Data: data}
	for _, client := range clients {
		_ = client.writeJSON(payload)
	}
}

func (h *Hub) EmitNewOrderMessage(userIDs []string, orderID, chatID string, message *domain.ChatMessageResponse) {
	h.emitToUsers(userIDs, "new_order_message", map[string]interface{}{
		"orderId": orderID,
		"chatId":  chatID,
		"message": message,
	})
}

func (h *Hub) EmitMessageStatusUpdated(userIDs []string, orderID, chatID, messageID string, status domain.ChatMessageStatus) {
	h.emitToUsers(userIDs, "message_status_updated", map[string]interface{}{
		"orderId":   orderID,
		"chatId":    chatID,
		"messageId": messageID,
		"status":    status,
	})
}

func (h *Hub) EmitTypingIndicator(userIDs []string, orderID, chatID, userID string, isTyping bool) {
	h.emitToUsers(userIDs, "typing_indicator", map[string]interface{}{
		"orderId":  orderID,
		"chatId":   chatID,
		"userId":   userID,
		"isTyping": isTyping,
	})
}

func (h *Hub) EmitSupportMessage(userIDs []string, message interface{}) {
	h.emitToUsers(userIDs, "new_support_message", message)
}
