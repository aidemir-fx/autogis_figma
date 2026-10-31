package handler

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/gmt061/autogis-backend/internal/domain"
)

type NotificationHandler struct {
	db *gorm.DB
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	db.AutoMigrate(&domain.Notification{}) // Ensure table exists
	return &NotificationHandler{db: db}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	role := c.Query("role")
	if role == "" {
		role = "all"
	}

	var notifications []domain.Notification
	var err error

	if role == "admin_all" {
		err = h.db.Order("created_at desc").Limit(100).Find(&notifications).Error
	} else {
		err = h.db.Where("target_role = ? OR target_role = ?", role, "all").Order("created_at desc").Limit(50).Find(&notifications).Error
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func (h *NotificationHandler) CreateNotification(c *gin.Context) {
	var req domain.NotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing fields"})
		return
	}

	notification := domain.Notification{
		Message:    req.Message,
		TargetRole: req.TargetRole,
	}

	if err := h.db.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}

	c.JSON(http.StatusOK, notification)
}

func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&domain.Notification{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *NotificationHandler) ClearAllNotifications(c *gin.Context) {
	if err := h.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
