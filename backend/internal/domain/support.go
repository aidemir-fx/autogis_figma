package domain

import "time"

type SupportMessage struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	User      *User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	SenderID  string    `gorm:"not null;index" json:"senderId"`
	Sender    *User     `gorm:"foreignKey:SenderID;constraint:OnDelete:CASCADE" json:"sender,omitempty"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	IsRead    bool      `gorm:"default:false" json:"isRead"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type SendSupportMessageRequest struct {
	Message string `json:"message" binding:"required"`
	UserID  string `json:"userId"` // Only required if admin is replying
}

type SupportChatSummary struct {
	UserID         string    `json:"userId"`
	UserName       string    `json:"userName"`
	UserPhone      string    `json:"userPhone"`
	LastMessage    string    `json:"lastMessage"`
	LastMessageAt  time.Time `json:"lastMessageAt"`
	UnreadCount    int       `json:"unreadCount"`
}
