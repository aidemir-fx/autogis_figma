package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/realtime"
	"gorm.io/gorm"
)

type SupportChatHandler struct {
	db  *gorm.DB
	hub *realtime.Hub
}

func NewSupportChatHandler(db *gorm.DB, hub *realtime.Hub) *SupportChatHandler {
	db.AutoMigrate(&domain.SupportMessage{})
	return &SupportChatHandler{db: db, hub: hub}
}

func (h *SupportChatHandler) GetMyChat(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	uid := userID.(string)

	// If admin is requesting a specific user's chat
	targetUserID := c.Query("userId")
	if targetUserID != "" {
		// Verify admin role
		var currentUser domain.User
		if err := h.db.First(&currentUser, "id = ?", uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
			return
		}
		if currentUser.Role != domain.RoleAdmin && currentUser.Role != domain.RoleModerator {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
			return
		}
		uid = targetUserID

		// Mark messages sent to admin as read
		h.db.Model(&domain.SupportMessage{}).
			Where("user_id = ? AND sender_id = ? AND is_read = ?", uid, uid, false).
			Update("is_read", true)
	} else {
		// User is viewing their own chat, mark admin messages as read
		h.db.Model(&domain.SupportMessage{}).
			Where("user_id = ? AND sender_id != ? AND is_read = ?", uid, uid, false).
			Update("is_read", true)
	}

	var messages []domain.SupportMessage
	if err := h.db.Preload("Sender").Where("user_id = ?", uid).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *SupportChatHandler) SendMessage(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	uid := userID.(string)

	var req domain.SendSupportMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	chatOwnerID := uid
	if req.UserID != "" {
		// Admin replying
		var currentUser domain.User
		h.db.First(&currentUser, "id = ?", uid)
		if currentUser.Role != domain.RoleAdmin && currentUser.Role != domain.RoleModerator {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
			return
		}
		chatOwnerID = req.UserID
	}

	msg := domain.SupportMessage{
		UserID:   chatOwnerID,
		SenderID: uid,
		Message:  req.Message,
	}

	if err := h.db.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Load sender details
	h.db.Preload("Sender").First(&msg, "id = ?", msg.ID)

	// Determine who should receive real-time notification
	// We'll emit a "new_support_message" event
	targetWSUsers := []string{chatOwnerID}

	// Notify all admins if user is sending
	if uid == chatOwnerID {
		var admins []domain.User
		h.db.Where("role IN ?", []domain.UserRole{domain.RoleAdmin, domain.RoleModerator}).Find(&admins)
		for _, admin := range admins {
			targetWSUsers = append(targetWSUsers, admin.ID)
		}
	}

	h.hub.EmitSupportMessage(targetWSUsers, msg)
	// but let's just write to the clients directly if possible, or use a workaround)
	// We'll use a new event "new_support_message" but we don't have EmitSupportMessage in hub yet.
	// Since we can't easily add it to hub without changing hub.go, we'll just use the raw emit if it's exported.
	// Wait, emitToUsers is unexported in realtime.Hub! `func (h *Hub) emitToUsers...`
	// Let's modify hub.go or just add an exported method.
	// We'll patch hub.go in the next step.

	c.JSON(http.StatusOK, msg)
}

func (h *SupportChatHandler) GetAllChats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	uid := userID.(string)

	var currentUser domain.User
	if err := h.db.First(&currentUser, "id = ?", uid).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}
	if currentUser.Role != domain.RoleAdmin && currentUser.Role != domain.RoleModerator {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	// Query to get latest message per user
	var summaries []domain.SupportChatSummary
	query := `
		SELECT 
			u.id as user_id, 
			u.full_name as user_name, 
			u.phone as user_phone,
			m.message as last_message, 
			m.created_at as last_message_at,
			(SELECT COUNT(*) FROM support_messages sm WHERE sm.user_id = u.id AND sm.sender_id = u.id AND sm.is_read = false) as unread_count
		FROM users u
		JOIN support_messages m ON m.user_id = u.id
		WHERE m.created_at = (
			SELECT MAX(created_at) FROM support_messages WHERE user_id = u.id
		)
		ORDER BY m.created_at DESC
	`
	h.db.Raw(query).Scan(&summaries)

	c.JSON(http.StatusOK, summaries)
}

func (h *SupportChatHandler) GetUnreadCount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	uid := userID.(string)

	var currentUser domain.User
	h.db.First(&currentUser, "id = ?", uid)

	var count int64
	if currentUser.Role == domain.RoleAdmin || currentUser.Role == domain.RoleModerator {
		// Admins see unread messages sent by users (sender_id == user_id)
		h.db.Model(&domain.SupportMessage{}).Where("sender_id = user_id AND is_read = ?", false).Count(&count)
	} else {
		// Users see unread messages sent by admins (sender_id != user_id)
		h.db.Model(&domain.SupportMessage{}).Where("user_id = ? AND sender_id != ? AND is_read = ?", uid, uid, false).Count(&count)
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}
