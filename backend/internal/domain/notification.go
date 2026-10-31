package domain

import (
	"time"
)

type Notification struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Message    string    `gorm:"not null" json:"message"`
	TargetRole string    `gorm:"not null;column:target_role" json:"target_role"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP;column:created_at" json:"created_at"`
}

type NotificationRequest struct {
	Message    string `json:"message" binding:"required"`
	TargetRole string `json:"targetRole" binding:"required"`
}
