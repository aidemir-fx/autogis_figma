package repository

import (
	"context"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type masterFavoriteRepositoryImpl struct {
	db *gorm.DB
}

func NewMasterFavoriteRepository(db *gorm.DB) MasterFavoriteRepository {
	return &masterFavoriteRepositoryImpl{db: db}
}

func (r *masterFavoriteRepositoryImpl) IsFavorite(ctx context.Context, userID, masterID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.MasterFavorite{}).
		Where("user_id = ? AND master_id = ?", userID, masterID).
		Count(&count).Error
	return count > 0, err
}

func (r *masterFavoriteRepositoryImpl) Add(ctx context.Context, userID, masterID string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND master_id = ?", userID, masterID).
		FirstOrCreate(&domain.MasterFavorite{UserID: userID, MasterID: masterID}).Error
}

func (r *masterFavoriteRepositoryImpl) Remove(ctx context.Context, userID, masterID string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND master_id = ?", userID, masterID).
		Delete(&domain.MasterFavorite{}).Error
}
