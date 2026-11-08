package domain

import "time"

// MasterFavorite stores a customer's saved private-master profile.
type MasterFavorite struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;uniqueIndex:idx_master_favorite_pair" json:"userId"`
	MasterID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_master_favorite_pair" json:"masterId"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

func (MasterFavorite) TableName() string { return "master_favorites" }
