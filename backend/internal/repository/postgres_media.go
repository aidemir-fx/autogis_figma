package repository

import (
	"context"
	"errors"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type mediaRepositoryImpl struct {
	db *gorm.DB
}

// NewMediaRepository returns a MediaRepository backed by PostgreSQL.
func NewMediaRepository(db *gorm.DB) MediaRepository {
	return &mediaRepositoryImpl{db: db}
}

// ─── PendingIntents ───────────────────────────────────────────────────────────

func (r *mediaRepositoryImpl) CreateIntent(ctx context.Context, intent *domain.PendingIntent) error {
	return r.db.WithContext(ctx).Create(intent).Error
}

func (r *mediaRepositoryImpl) GetIntentByID(ctx context.Context, id string) (*domain.PendingIntent, error) {
	var intent domain.PendingIntent
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&intent).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &intent, err
}

func (r *mediaRepositoryImpl) DeleteIntent(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.PendingIntent{}).Error
}

// DeleteExpiredIntents removes all intents past their expires_at and returns
// the staging keys so the caller can delete the corresponding S3 objects.
func (r *mediaRepositoryImpl) DeleteExpiredIntents(ctx context.Context) ([]string, error) {
	var intents []domain.PendingIntent
	if err := r.db.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Where(`NOT EXISTS (
			SELECT 1
			FROM media_assets
			WHERE media_assets.intent_id = pending_intents.id
			  AND media_assets.status = ?
			  AND media_assets.deleted_at IS NULL
		)`, domain.MediaStatusProcessing).
		Find(&intents).Error; err != nil {
		return nil, err
	}

	if len(intents) == 0 {
		return nil, nil
	}

	ids := make([]string, len(intents))
	keys := make([]string, len(intents))
	for i, it := range intents {
		ids[i] = it.ID
		keys[i] = it.StagingKey
	}

	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Delete(&domain.PendingIntent{}).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

func (r *mediaRepositoryImpl) CountIntentsByUserInWindow(ctx context.Context, userID string, window time.Duration) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.PendingIntent{}).
		Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-window)).
		Count(&count).Error
	return count, err
}

// ─── MediaAssets ──────────────────────────────────────────────────────────────

func (r *mediaRepositoryImpl) CreateAsset(ctx context.Context, asset *domain.MediaAsset) (*domain.MediaAsset, error) {
	if err := r.db.WithContext(ctx).Create(asset).Error; err != nil {
		return nil, err
	}
	return asset, nil
}

func (r *mediaRepositoryImpl) GetAssetByID(ctx context.Context, id string) (*domain.MediaAsset, error) {
	var asset domain.MediaAsset
	err := r.db.WithContext(ctx).
		Preload("Derivatives").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &asset, err
}

func (r *mediaRepositoryImpl) GetAssetByIntentID(ctx context.Context, intentID string) (*domain.MediaAsset, error) {
	var asset domain.MediaAsset
	err := r.db.WithContext(ctx).
		Where("intent_id = ?", intentID).
		First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &asset, err
}

func (r *mediaRepositoryImpl) GetAssetsByEntity(ctx context.Context, entityType, entityID string) ([]*domain.MediaAsset, error) {
	var assets []*domain.MediaAsset
	err := r.db.WithContext(ctx).
		Preload("Derivatives").
		Where("entity_type = ? AND entity_id = ? AND deleted_at IS NULL", entityType, entityID).
		Order("created_at DESC").
		Find(&assets).Error
	return assets, err
}

func (r *mediaRepositoryImpl) GetStaleProcessingJobs(ctx context.Context, olderThan time.Duration, limit int) ([]domain.ProcessJob, error) {
	if limit <= 0 {
		limit = 100
	}

	cutoff := time.Now().Add(-olderThan)
	var rows []struct {
		AssetID    string
		IntentID   string
		StagingKey string
		FinalKey   string
		EntityType string
		EntityID   string
		MimeType   string
		TrimStart  float64
		TrimEnd    float64
	}
	err := r.db.WithContext(ctx).
		Table("media_assets AS ma").
		Select(`ma.id AS asset_id,
			ma.intent_id AS intent_id,
			pi.staging_key AS staging_key,
			pi.final_key AS final_key,
			ma.entity_type AS entity_type,
			ma.entity_id AS entity_id,
			ma.mime_type AS mime_type,
			pi.trim_start AS trim_start,
			pi.trim_end AS trim_end`).
		Joins("JOIN pending_intents AS pi ON pi.id = ma.intent_id").
		Where("ma.status = ? AND ma.deleted_at IS NULL AND ma.updated_at < ?", domain.MediaStatusProcessing, cutoff).
		Order("ma.updated_at ASC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	jobs := make([]domain.ProcessJob, 0, len(rows))
	for _, row := range rows {
		jobs = append(jobs, domain.ProcessJob{
			AssetID:    row.AssetID,
			IntentID:   row.IntentID,
			StagingKey: row.StagingKey,
			FinalKey:   row.FinalKey,
			EntityType: domain.MediaEntityType(row.EntityType),
			EntityID:   row.EntityID,
			SourceUUID: sourceUUIDFromStagingKey(row.StagingKey),
			MimeType:   row.MimeType,
			TrimStart:  row.TrimStart,
			TrimEnd:    row.TrimEnd,
		})
	}
	return jobs, nil
}

func (r *mediaRepositoryImpl) UpdateAsset(ctx context.Context, asset *domain.MediaAsset) error {
	return r.db.WithContext(ctx).Save(asset).Error
}

func sourceUUIDFromStagingKey(key string) string {
	const prefix = "uploads/tmp/"
	if len(key) > len(prefix) {
		return key[len(prefix):]
	}
	return key
}

func (r *mediaRepositoryImpl) SoftDeleteAsset(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.MediaAsset{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"deleted_at": now,
			"status":     domain.MediaStatusDeleted,
		}).Error
}

func (r *mediaRepositoryImpl) CountAssetsByEntity(ctx context.Context, entityType, entityID, category string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.MediaAsset{}).
		Where("entity_type = ? AND entity_id = ? AND category = ? AND deleted_at IS NULL AND status != ?",
			entityType, entityID, category, domain.MediaStatusFailed).
		Count(&count).Error
	return count, err
}

func (r *mediaRepositoryImpl) GetActiveAvatarByEntity(ctx context.Context, entityType, entityID string) (*domain.MediaAsset, error) {
	var asset domain.MediaAsset
	err := r.db.WithContext(ctx).
		Where("entity_type = ? AND entity_id = ? AND category = ? AND deleted_at IS NULL",
			entityType, entityID, domain.MediaCategoryAvatar).
		Order("created_at DESC").
		First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &asset, err
}

// GetAssetsForHardDelete returns soft-deleted assets whose deleted_at is older than grace.
func (r *mediaRepositoryImpl) GetAssetsForHardDelete(ctx context.Context, grace time.Duration) ([]*domain.MediaAsset, error) {
	var assets []*domain.MediaAsset
	cutoff := time.Now().Add(-grace)
	err := r.db.WithContext(ctx).
		Preload("Derivatives").
		Where("deleted_at IS NOT NULL AND deleted_at < ? AND status = ?", cutoff, domain.MediaStatusDeleted).
		Find(&assets).Error
	return assets, err
}

func (r *mediaRepositoryImpl) HardDeleteAsset(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("asset_id = ?", id).Delete(&domain.MediaDerivative{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", id).Delete(&domain.MediaAsset{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// ─── MediaDerivatives ─────────────────────────────────────────────────────────

func (r *mediaRepositoryImpl) CreateDerivative(ctx context.Context, d *domain.MediaDerivative) error {
	return r.db.WithContext(ctx).
		Where(domain.MediaDerivative{AssetID: d.AssetID, Variant: d.Variant, Format: d.Format}).
		FirstOrCreate(d).Error
}

func (r *mediaRepositoryImpl) GetDerivativesByAssetID(ctx context.Context, assetID string) ([]*domain.MediaDerivative, error) {
	var derivs []*domain.MediaDerivative
	err := r.db.WithContext(ctx).Where("asset_id = ?", assetID).Find(&derivs).Error
	return derivs, err
}

func (r *mediaRepositoryImpl) DeleteDerivativesByAssetID(ctx context.Context, assetID string) error {
	return r.db.WithContext(ctx).Where("asset_id = ?", assetID).Delete(&domain.MediaDerivative{}).Error
}
