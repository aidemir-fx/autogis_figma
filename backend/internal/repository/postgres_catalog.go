package repository

import (
	"context"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type CatalogRepositoryImpl struct {
	db *gorm.DB
}

func NewCatalogRepository(db *gorm.DB) CatalogRepository {
	return &CatalogRepositoryImpl{db: db}
}

func (r *CatalogRepositoryImpl) ListProfessions(ctx context.Context) ([]*domain.CatalogProfession, error) {
	var items []*domain.CatalogProfession
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("sort_order ASC, name ASC").Find(&items).Error
	return items, err
}

func (r *CatalogRepositoryImpl) ListServices(ctx context.Context) ([]*domain.CatalogService, error) {
	var items []*domain.CatalogService
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("sort_order ASC, name ASC").Find(&items).Error
	return items, err
}

func (r *CatalogRepositoryImpl) ListProductCategories(ctx context.Context) ([]*domain.ProductCategory, error) {
	var items []*domain.ProductCategory
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&items).Error
	return items, err
}

func (r *CatalogRepositoryImpl) ListVehicleBrands(ctx context.Context) ([]*domain.VehicleBrand, error) {
	var items []*domain.VehicleBrand
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Preload("Models", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_active = ?", true).Order("sort_order ASC, name ASC")
		}).
		Order("sort_order ASC, name ASC").
		Find(&items).Error
	return items, err
}
