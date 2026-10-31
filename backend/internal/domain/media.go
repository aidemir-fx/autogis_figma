package domain

import "time"

// ─── Entity type enums ────────────────────────────────────────────────────────

type MediaEntityType string

const (
	MediaEntityAccount MediaEntityType = "account"
	MediaEntityWork    MediaEntityType = "work"
	MediaEntityObject  MediaEntityType = "object"
	MediaEntityStory   MediaEntityType = "story"
)

type MediaCategory string

const (
	MediaCategoryAvatar MediaCategory = "avatar"
	MediaCategoryPhoto  MediaCategory = "photo"
	MediaCategoryStory  MediaCategory = "story"
)

type MediaAssetStatus string

const (
	MediaStatusProcessing MediaAssetStatus = "processing"
	MediaStatusReady      MediaAssetStatus = "ready"
	MediaStatusFailed     MediaAssetStatus = "failed"
	MediaStatusDeleted    MediaAssetStatus = "deleted"
)

type MediaVariant string

const (
	MediaVariantThumb  MediaVariant = "thumb"
	MediaVariantMedium MediaVariant = "medium"
	MediaVariantLarge  MediaVariant = "large"
)

// ─── DB models ────────────────────────────────────────────────────────────────

// PendingIntent holds upload source metadata until processing finishes or TTL cleanup.
type PendingIntent struct {
	ID         string          `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID     string          `gorm:"not null;index"                                  json:"userId"`
	EntityType MediaEntityType `gorm:"type:varchar(20);not null"                       json:"entityType"`
	EntityID   string          `gorm:"type:varchar(64);not null"                       json:"entityId"`
	Category   MediaCategory   `gorm:"type:varchar(20);not null"                       json:"category"`
	StagingKey string          `gorm:"type:text;not null;uniqueIndex"                  json:"stagingKey"`
	// FinalKey is pre-generated at intent creation time; processor uses it as copy destination.
	FinalKey  string    `gorm:"type:text;not null" json:"finalKey"`
	MimeType  string    `gorm:"type:varchar(50);not null" json:"mimeType"`
	SizeBytes int64     `gorm:"not null"                  json:"sizeBytes"`
	TrimStart float64   `gorm:"not null;default:0"        json:"trimStart"`
	TrimEnd   float64   `gorm:"not null;default:0"        json:"trimEnd"`
	ExpiresAt time.Time `gorm:"not null;index"            json:"expiresAt"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli"      json:"createdAt"`
}

func (PendingIntent) TableName() string { return "pending_intents" }

// MediaAsset is the canonical record of a validated, processed media file.
// object_key is NULL while status=processing; set by the processor after copy.
type MediaAsset struct {
	ID             string           `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	EntityType     MediaEntityType  `gorm:"type:varchar(20);not null;index:idx_entity"      json:"entityType"`
	EntityID       string           `gorm:"type:varchar(64);not null;index:idx_entity"      json:"entityId"`
	Category       MediaCategory    `gorm:"type:varchar(20);not null"                        json:"category"`
	IntentID       string           `gorm:"type:uuid;not null;uniqueIndex"                   json:"intentId"`
	StorageBucket  string           `gorm:"type:varchar(128);not null"                       json:"storageBucket"`
	ObjectKey      *string          `gorm:"type:text;uniqueIndex"                            json:"objectKey"`
	MimeType       string           `gorm:"type:varchar(50);not null"                        json:"mimeType"`
	SizeBytes      int64            `gorm:"default:0"                                        json:"sizeBytes"`
	ChecksumSHA256 *string          `gorm:"type:varchar(64)"                                 json:"checksumSha256"`
	Width          int              `gorm:"default:0"                                        json:"width"`
	Height         int              `gorm:"default:0"                                        json:"height"`
	Status         MediaAssetStatus `gorm:"type:varchar(20);not null;default:'processing';index:idx_entity" json:"status"`
	CreatedBy      string           `gorm:"type:uuid;not null"                               json:"createdBy"`
	CreatedAt      time.Time        `gorm:"autoCreateTime:milli"                             json:"createdAt"`
	UpdatedAt      time.Time        `gorm:"autoUpdateTime:milli"                             json:"updatedAt"`
	DeletedAt      *time.Time       `gorm:"type:timestamp;index"                             json:"deletedAt,omitempty"`

	Derivatives []MediaDerivative `gorm:"foreignKey:AssetID" json:"derivatives,omitempty"`
}

func (MediaAsset) TableName() string { return "media_assets" }

// MediaDerivative stores a generated variant (thumb / medium / large) of an asset.
type MediaDerivative struct {
	ID        string       `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AssetID   string       `gorm:"type:uuid;not null;index"                        json:"assetId"`
	Variant   MediaVariant `gorm:"type:varchar(10);not null"                       json:"variant"`
	Format    string       `gorm:"type:varchar(10);not null"                       json:"format"` // jpeg | webp
	ObjectKey string       `gorm:"type:text;not null;uniqueIndex"                  json:"objectKey"`
	MimeType  string       `gorm:"type:varchar(50);not null"                       json:"mimeType"`
	SizeBytes int64        `gorm:"default:0"                                       json:"sizeBytes"`
	Width     int          `gorm:"default:0"                                       json:"width"`
	Height    int          `gorm:"default:0"                                       json:"height"`
	CreatedAt time.Time    `gorm:"autoCreateTime:milli"                            json:"createdAt"`
}

func (MediaDerivative) TableName() string { return "media_derivatives" }

// ─── Request / Response DTOs ──────────────────────────────────────────────────

type UploadIntentRequest struct {
	EntityType MediaEntityType `json:"entityType" validate:"required,oneof=account work object story"`
	EntityID   string          `json:"entityId"   validate:"required"`
	Category   MediaCategory   `json:"category"   validate:"required,oneof=avatar photo story"`
	MimeType   string          `json:"mimeType"   validate:"required"`
	SizeBytes  int64           `json:"sizeBytes"  validate:"required,gt=0"`
	TrimStart  float64         `json:"trimStart,omitempty"`
	TrimEnd    float64         `json:"trimEnd,omitempty"`
}

type UploadIntentResponse struct {
	IntentID   string            `json:"intentId"`
	UploadURL  string            `json:"uploadUrl"`
	StagingKey string            `json:"stagingKey"`
	ExpiresAt  string            `json:"expiresAt"`
	Headers    map[string]string `json:"headers"`
}

type ConfirmUploadRequest struct {
	IntentID   string `json:"intentId"   validate:"required,uuid"`
	StagingKey string `json:"stagingKey" validate:"required"`
}

type ConfirmUploadResponse struct {
	AssetID string           `json:"assetId"`
	Status  MediaAssetStatus `json:"status"`
}

// MediaDerivativeURLs holds URLs per format for a single variant.
type MediaDerivativeURLs struct {
	JPEG string `json:"jpeg,omitempty"`
	WebP string `json:"webp,omitempty"`
}

// MediaAssetURLs is the nested URL structure returned to the client.
type MediaAssetURLs struct {
	Original string               `json:"original,omitempty"`
	Thumb    *MediaDerivativeURLs `json:"thumb,omitempty"`
	Medium   *MediaDerivativeURLs `json:"medium,omitempty"`
	Large    *MediaDerivativeURLs `json:"large,omitempty"`
}

type MediaAssetResponse struct {
	AssetID   string           `json:"assetId"`
	Category  MediaCategory    `json:"category"`
	Status    MediaAssetStatus `json:"status"`
	Width     int              `json:"width"`
	Height    int              `json:"height"`
	SizeBytes int64            `json:"sizeBytes"`
	MimeType  string           `json:"mimeType"`
	CreatedAt string           `json:"createdAt"`
	URLs      *MediaAssetURLs  `json:"urls,omitempty"`
}

type MediaAssetsResponse struct {
	Assets []*MediaAssetResponse `json:"assets"`
}

// ProcessJob is the internal message passed to the worker queue.
type ProcessJob struct {
	AssetID    string
	IntentID   string
	StagingKey string
	FinalKey   string
	EntityType MediaEntityType
	EntityID   string
	SourceUUID string
	MimeType   string
	TrimStart  float64
	TrimEnd    float64
	RetryCount int
}
