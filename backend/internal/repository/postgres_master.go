package repository

import (
	"context"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

// MasterRepository implementation
type MasterRepositoryImpl struct {
	db *gorm.DB
}

func NewMasterRepository(db *gorm.DB) MasterRepository {
	return &MasterRepositoryImpl{db: db}
}

func (r *MasterRepositoryImpl) Create(ctx context.Context, master *domain.Master) error {
	return r.db.WithContext(ctx).Create(master).Error
}

func (r *MasterRepositoryImpl) GetByUserID(ctx context.Context, userID string) (*domain.Master, error) {
	var master domain.Master
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ?", userID).
		First(&master).Error
	if err != nil {
		return nil, err
	}
	return &master, nil
}

func (r *MasterRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Master, error) {
	var master domain.Master
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ?", id).
		First(&master).Error
	if err != nil {
		return nil, err
	}
	return &master, nil
}

func (r *MasterRepositoryImpl) GetAll(ctx context.Context) ([]*domain.Master, error) {
	var masters []*domain.Master
	err := r.db.WithContext(ctx).
		Preload("User").
		Find(&masters).Error
	return masters, err
}

func (r *MasterRepositoryImpl) GetByActivityTypes(ctx context.Context, activityTypes []string) ([]*domain.Master, error) {
	var userIDs []string
	err := r.db.WithContext(ctx).
		Table("user_activity_types").
		Distinct("user_id").
		Where("activity_type_id IN ?", activityTypes).
		Pluck("user_id", &userIDs).Error
	if err != nil {
		return nil, err
	}

	var masters []*domain.Master
	err = r.db.WithContext(ctx).
		Preload("User").
		Where("user_id IN ?", userIDs).
		Find(&masters).Error
	return masters, err
}

func (r *MasterRepositoryImpl) Update(ctx context.Context, master *domain.Master) error {
	return r.db.WithContext(ctx).Save(master).Error
}

func (r *MasterRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Master{}, "id = ?", id).Error
}

func (r *MasterRepositoryImpl) GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.Master, error) {
	var masters []*domain.Master
	// Coordinates are stored as jsonb {"type":"Point","coordinates":[lng,lat]}.
	err := r.db.WithContext(ctx).
		Preload("User").
		Where(`
			coordinates IS NOT NULL
			AND coordinates->'coordinates' IS NOT NULL
			AND ST_DWithin(
				ST_SetSRID(ST_MakePoint(
					(coordinates->'coordinates'->>0)::double precision,
					(coordinates->'coordinates'->>1)::double precision
				), 4326)::geography,
				ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
				? * 1000
			)
		`, lng, lat, radiusKm).
		Find(&masters).Error
	return masters, err
}

// AutoWashRepository implementation
type AutoWashRepositoryImpl struct {
	db *gorm.DB
}

func NewAutoWashRepository(db *gorm.DB) AutoWashRepository {
	return &AutoWashRepositoryImpl{db: db}
}

func (r *AutoWashRepositoryImpl) Create(ctx context.Context, aw *domain.AutoWash) error {
	return r.db.WithContext(ctx).Create(aw).Error
}

func (r *AutoWashRepositoryImpl) GetByUserID(ctx context.Context, userID string) (*domain.AutoWash, error) {
	var aw domain.AutoWash
	query := r.db.WithContext(ctx).Preload("User").Preload("ActivitySubtype")
	if r.db.Migrator().HasTable("additional_aw_services") {
		query = query.Preload("AdditionalAWServices")
	}
	err := query.Where("user_id = ?", userID).First(&aw).Error
	if err != nil {
		return nil, err
	}
	return &aw, nil
}

func (r *AutoWashRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.AutoWash, error) {
	var aw domain.AutoWash
	query := r.db.WithContext(ctx).Preload("User").Preload("ActivitySubtype")
	if r.db.Migrator().HasTable("additional_aw_services") {
		query = query.Preload("AdditionalAWServices")
	}
	err := query.Where("id = ?", id).First(&aw).Error
	if err != nil {
		return nil, err
	}
	return &aw, nil
}

func (r *AutoWashRepositoryImpl) GetAll(ctx context.Context) ([]*domain.AutoWash, error) {
	var aws []*domain.AutoWash
	query := r.db.WithContext(ctx).Preload("User").Preload("ActivitySubtype")
	if r.db.Migrator().HasTable("additional_aw_services") {
		query = query.Preload("AdditionalAWServices")
	}
	err := query.Find(&aws).Error
	return aws, err
}

func (r *AutoWashRepositoryImpl) GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoWash, error) {
	var aws []*domain.AutoWash
	query := r.db.WithContext(ctx).Preload("User").Preload("ActivitySubtype")
	if r.db.Migrator().HasTable("additional_aw_services") {
		query = query.Preload("AdditionalAWServices")
	}
	err := query.Where(`
		coordinates IS NOT NULL
		AND coordinates->'coordinates' IS NOT NULL
		AND ST_DWithin(
			ST_SetSRID(ST_MakePoint(
				(coordinates->'coordinates'->>0)::double precision,
				(coordinates->'coordinates'->>1)::double precision
			), 4326)::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			? * 1000
		)
	`, lng, lat, radiusKm).Find(&aws).Error
	return aws, err
}

func (r *AutoWashRepositoryImpl) Update(ctx context.Context, aw *domain.AutoWash) error {
	return r.db.WithContext(ctx).Save(aw).Error
}

func (r *AutoWashRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.AutoWash{}, "id = ?", id).Error
}

// AutoShopRepository implementation
type AutoShopRepositoryImpl struct {
	db *gorm.DB
}

func NewAutoShopRepository(db *gorm.DB) AutoShopRepository {
	return &AutoShopRepositoryImpl{db: db}
}

func (r *AutoShopRepositoryImpl) Create(ctx context.Context, shop *domain.AutoShop) error {
	return r.db.WithContext(ctx).Create(shop).Error
}

func (r *AutoShopRepositoryImpl) GetByUserID(ctx context.Context, userID string) (*domain.AutoShop, error) {
	var shop domain.AutoShop
	query := r.db.WithContext(ctx).Preload("User")
	if r.db.Migrator().HasTable("additional_as_services") {
		query = query.Preload("AdditionalASServices")
	}
	err := query.Where("user_id = ?", userID).First(&shop).Error
	if err != nil {
		return nil, err
	}
	return &shop, nil
}

func (r *AutoShopRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.AutoShop, error) {
	var shop domain.AutoShop
	query := r.db.WithContext(ctx).Preload("User")
	if r.db.Migrator().HasTable("additional_as_services") {
		query = query.Preload("AdditionalASServices")
	}
	err := query.Where("id = ?", id).First(&shop).Error
	if err != nil {
		return nil, err
	}
	return &shop, nil
}

func (r *AutoShopRepositoryImpl) GetAll(ctx context.Context) ([]*domain.AutoShop, error) {
	var shops []*domain.AutoShop
	query := r.db.WithContext(ctx).Preload("User")
	if r.db.Migrator().HasTable("additional_as_services") {
		query = query.Preload("AdditionalASServices")
	}
	err := query.Find(&shops).Error
	return shops, err
}

func (r *AutoShopRepositoryImpl) GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoShop, error) {
	var shops []*domain.AutoShop
	query := r.db.WithContext(ctx).Preload("User")
	if r.db.Migrator().HasTable("additional_as_services") {
		query = query.Preload("AdditionalASServices")
	}
	err := query.Where(`
		coordinates IS NOT NULL
		AND coordinates->'coordinates' IS NOT NULL
		AND ST_DWithin(
			ST_SetSRID(ST_MakePoint(
				(coordinates->'coordinates'->>0)::double precision,
				(coordinates->'coordinates'->>1)::double precision
			), 4326)::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			? * 1000
		)
	`, lng, lat, radiusKm).Find(&shops).Error
	return shops, err
}

func (r *AutoShopRepositoryImpl) Update(ctx context.Context, shop *domain.AutoShop) error {
	return r.db.WithContext(ctx).Save(shop).Error
}

func (r *AutoShopRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.AutoShop{}, "id = ?", id).Error
}

// AutoServiceRepository implementation
type AutoServiceRepositoryImpl struct {
	db *gorm.DB
}

func NewAutoServiceRepository(db *gorm.DB) AutoServiceRepository {
	return &AutoServiceRepositoryImpl{db: db}
}

func (r *AutoServiceRepositoryImpl) Create(ctx context.Context, service *domain.AutoService) error {
	return r.db.WithContext(ctx).Create(service).Error
}

func (r *AutoServiceRepositoryImpl) GetByUserID(ctx context.Context, userID string) (*domain.AutoService, error) {
	var service domain.AutoService
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("user_id = ?", userID).
		First(&service).Error
	if err != nil {
		return nil, err
	}
	return &service, nil
}

func (r *AutoServiceRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.AutoService, error) {
	var service domain.AutoService
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ?", id).
		First(&service).Error
	if err != nil {
		return nil, err
	}
	return &service, nil
}

func (r *AutoServiceRepositoryImpl) GetAll(ctx context.Context) ([]*domain.AutoService, error) {
	var services []*domain.AutoService
	err := r.db.WithContext(ctx).
		Preload("User").
		Find(&services).Error
	return services, err
}

func (r *AutoServiceRepositoryImpl) GetNearby(ctx context.Context, lat, lng, radiusKm float64) ([]*domain.AutoService, error) {
	var services []*domain.AutoService
	err := r.db.WithContext(ctx).
		Preload("User").
		Where(`
			coordinates IS NOT NULL
			AND coordinates->'coordinates' IS NOT NULL
			AND ST_DWithin(
				ST_SetSRID(ST_MakePoint(
					(coordinates->'coordinates'->>0)::double precision,
					(coordinates->'coordinates'->>1)::double precision
				), 4326)::geography,
				ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
				? * 1000
			)
		`, lng, lat, radiusKm).
		Find(&services).Error
	return services, err
}

func (r *AutoServiceRepositoryImpl) Update(ctx context.Context, service *domain.AutoService) error {
	return r.db.WithContext(ctx).Save(service).Error
}

func (r *AutoServiceRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.AutoService{}, "id = ?", id).Error
}
