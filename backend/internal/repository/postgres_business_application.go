package repository

import (
	"context"
	"errors"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type BusinessApplicationRepositoryImpl struct {
	db *gorm.DB
}

func NewBusinessApplicationRepository(db *gorm.DB) BusinessApplicationRepository {
	return &BusinessApplicationRepositoryImpl{db: db}
}

func (r *BusinessApplicationRepositoryImpl) Create(ctx context.Context, app *domain.BusinessApplication) error {
	return r.db.WithContext(ctx).Create(app).Error
}

func (r *BusinessApplicationRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.BusinessApplication, error) {
	var app domain.BusinessApplication
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&app).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *BusinessApplicationRepositoryImpl) GetLatestByUserID(ctx context.Context, userID string) (*domain.BusinessApplication, error) {
	var app domain.BusinessApplication
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&app).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &app, nil
}

func (r *BusinessApplicationRepositoryImpl) GetAll(ctx context.Context) ([]*domain.BusinessApplication, error) {
	var apps []*domain.BusinessApplication
	err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Find(&apps).Error
	return apps, err
}

func (r *BusinessApplicationRepositoryImpl) Update(ctx context.Context, app *domain.BusinessApplication) error {
	return r.db.WithContext(ctx).Save(app).Error
}
