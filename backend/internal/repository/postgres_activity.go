package repository

import (
	"context"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ActivityGroupRepositoryImpl реализует ActivityGroupRepository поверх GORM/Postgres.
type ActivityGroupRepositoryImpl struct {
	db *gorm.DB
}

func NewActivityGroupRepository(db *gorm.DB) ActivityGroupRepository {
	return &ActivityGroupRepositoryImpl{db: db}
}

func (r *ActivityGroupRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.ActivityGroup, error) {
	var g domain.ActivityGroup
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&g).Error; err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *ActivityGroupRepositoryImpl) GetByCode(ctx context.Context, code string) (*domain.ActivityGroup, error) {
	var g domain.ActivityGroup
	if err := r.db.WithContext(ctx).Where("code = ?", code).First(&g).Error; err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *ActivityGroupRepositoryImpl) GetAll(ctx context.Context) ([]*domain.ActivityGroup, error) {
	var out []*domain.ActivityGroup
	err := r.db.WithContext(ctx).Order("sort_order ASC, display_name ASC").Find(&out).Error
	return out, err
}

func (r *ActivityGroupRepositoryImpl) GetActive(ctx context.Context) ([]*domain.ActivityGroup, error) {
	var out []*domain.ActivityGroup
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("sort_order ASC, display_name ASC").
		Find(&out).Error
	return out, err
}

// Upsert — вставка-или-обновление по уникальному коду. Используется в seed-миграции.
func (r *ActivityGroupRepositoryImpl) Upsert(ctx context.Context, group *domain.ActivityGroup) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"display_name", "description", "is_active", "sort_order", "updated_at",
			}),
		}).
		Create(group).Error
}

// ActivitySubtypeRepositoryImpl реализует ActivitySubtypeRepository.
type ActivitySubtypeRepositoryImpl struct {
	db *gorm.DB
}

func NewActivitySubtypeRepository(db *gorm.DB) ActivitySubtypeRepository {
	return &ActivitySubtypeRepositoryImpl{db: db}
}

func (r *ActivitySubtypeRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.ActivitySubtype, error) {
	var s domain.ActivitySubtype
	err := r.db.WithContext(ctx).
		Preload("Group").
		Where("id = ?", id).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ActivitySubtypeRepositoryImpl) GetByGroupAndCode(ctx context.Context, groupID, code string) (*domain.ActivitySubtype, error) {
	var s domain.ActivitySubtype
	err := r.db.WithContext(ctx).
		Preload("Group").
		Where("group_id = ? AND code = ?", groupID, code).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ActivitySubtypeRepositoryImpl) GetByGroupID(ctx context.Context, groupID string) ([]*domain.ActivitySubtype, error) {
	var out []*domain.ActivitySubtype
	err := r.db.WithContext(ctx).
		Where("group_id = ?", groupID).
		Order("sort_order ASC, display_name ASC").
		Find(&out).Error
	return out, err
}

func (r *ActivitySubtypeRepositoryImpl) GetActiveByGroupID(ctx context.Context, groupID string) ([]*domain.ActivitySubtype, error) {
	var out []*domain.ActivitySubtype
	err := r.db.WithContext(ctx).
		Where("group_id = ? AND is_active = ?", groupID, true).
		Order("sort_order ASC, display_name ASC").
		Find(&out).Error
	return out, err
}

func (r *ActivitySubtypeRepositoryImpl) GetAll(ctx context.Context) ([]*domain.ActivitySubtype, error) {
	var out []*domain.ActivitySubtype
	err := r.db.WithContext(ctx).
		Preload("Group").
		Order("group_id, sort_order ASC").
		Find(&out).Error
	return out, err
}

func (r *ActivitySubtypeRepositoryImpl) Upsert(ctx context.Context, subtype *domain.ActivitySubtype) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "group_id"}, {Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"display_name", "description", "is_active", "sort_order",
				"cabinet_schema_key", "settings_schema", "updated_at",
			}),
		}).
		Create(subtype).Error
}

// MaxUpdatedAt — берём max(updated_at) и преобразуем в unix milli. Используется для ETag.
func (r *ActivitySubtypeRepositoryImpl) MaxUpdatedAt(ctx context.Context) (int64, error) {
	var result struct {
		GroupsMax   *int64
		SubtypesMax *int64
	}
	// Берём максимум по обеим таблицам (оба справочника могут меняться).
	row := r.db.WithContext(ctx).Raw(`
		SELECT
			(SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at) * 1000), 0)::bigint FROM activity_groups)   AS groups_max,
			(SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at) * 1000), 0)::bigint FROM activity_subtypes) AS subtypes_max
	`).Row()
	if err := row.Scan(&result.GroupsMax, &result.SubtypesMax); err != nil {
		return 0, err
	}
	var g, s int64
	if result.GroupsMax != nil {
		g = *result.GroupsMax
	}
	if result.SubtypesMax != nil {
		s = *result.SubtypesMax
	}
	if g > s {
		return g, nil
	}
	return s, nil
}

// UserActivityProfileRepositoryImpl реализует UserActivityProfileRepository.
type UserActivityProfileRepositoryImpl struct {
	db *gorm.DB
}

func NewUserActivityProfileRepository(db *gorm.DB) UserActivityProfileRepository {
	return &UserActivityProfileRepositoryImpl{db: db}
}

func (r *UserActivityProfileRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.UserActivityProfile, error) {
	var p domain.UserActivityProfile
	err := r.db.WithContext(ctx).
		Preload("ActivityGroup").
		Preload("ActivitySubtype").
		Where("id = ?", id).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *UserActivityProfileRepositoryImpl) GetByUserID(ctx context.Context, userID string) ([]*domain.UserActivityProfile, error) {
	var out []*domain.UserActivityProfile
	err := r.db.WithContext(ctx).
		Preload("ActivityGroup").
		Preload("ActivitySubtype").
		Where("user_id = ?", userID).
		Order("is_primary DESC, created_at ASC").
		Find(&out).Error
	return out, err
}

func (r *UserActivityProfileRepositoryImpl) GetPrimaryByUserID(ctx context.Context, userID string) (*domain.UserActivityProfile, error) {
	var p domain.UserActivityProfile
	err := r.db.WithContext(ctx).
		Preload("ActivityGroup").
		Preload("ActivitySubtype").
		Where("user_id = ? AND is_primary = ?", userID, true).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *UserActivityProfileRepositoryImpl) GetByUserAndSubtype(ctx context.Context, userID, subtypeID string) (*domain.UserActivityProfile, error) {
	var p domain.UserActivityProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND activity_subtype_id = ?", userID, subtypeID).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// UpsertIdempotent — ON CONFLICT DO NOTHING по (user_id, activity_group_id, activity_subtype_id).
// При конфликте поле profile.ID может остаться незаполненным; caller должен перечитать запись
// через GetByUserAndSubtype если нужен ID.
func (r *UserActivityProfileRepositoryImpl) UpsertIdempotent(ctx context.Context, profile *domain.UserActivityProfile) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_id"},
				{Name: "activity_group_id"},
				{Name: "activity_subtype_id"},
			},
			DoNothing: true,
		}).
		Create(profile).Error
}

// SetPrimary атомарно сбрасывает is_primary у всех профилей пользователя и устанавливает его
// на указанный profileID. Выполняется в одной транзакции, чтобы не нарушить partial unique
// индекс `UNIQUE (user_id) WHERE is_primary = true`.
func (r *UserActivityProfileRepositoryImpl) SetPrimary(ctx context.Context, userID, profileID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.UserActivityProfile{}).
			Where("user_id = ? AND is_primary = ?", userID, true).
			Update("is_primary", false).Error; err != nil {
			return err
		}
		return tx.Model(&domain.UserActivityProfile{}).
			Where("id = ? AND user_id = ?", profileID, userID).
			Update("is_primary", true).Error
	})
}

// ActivityAuditLogRepositoryImpl — персистенция журнала аудита.
type ActivityAuditLogRepositoryImpl struct {
	db *gorm.DB
}

func NewActivityAuditLogRepository(db *gorm.DB) ActivityAuditLogRepository {
	return &ActivityAuditLogRepositoryImpl{db: db}
}

func (r *ActivityAuditLogRepositoryImpl) Create(ctx context.Context, entry *domain.ActivityAuditLog) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *ActivityAuditLogRepositoryImpl) GetBySubjectUserID(ctx context.Context, userID string, limit int) ([]*domain.ActivityAuditLog, error) {
	var out []*domain.ActivityAuditLog
	q := r.db.WithContext(ctx).
		Where("subject_user_id = ?", userID).
		Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	err := q.Find(&out).Error
	return out, err
}
