package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/ratelimit"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/repository"
	"github.com/gmt061/autogis-backend/internal/worker"
)

// Limits per category
var (
	maxSizeByCategory = map[domain.MediaCategory]int64{
		domain.MediaCategoryAvatar: 5 << 20,   // 5 MB
		domain.MediaCategoryPhoto:  15 << 20,  // 15 MB
		domain.MediaCategoryStory:  400 << 20, // 400 MB total story media budget
	}
	maxCountByCategory = map[domain.MediaCategory]int64{
		domain.MediaCategoryAvatar: 1,
		domain.MediaCategoryPhoto:  50,
		domain.MediaCategoryStory:  50,
	}
	intentTTL       = 5 * time.Minute
	hardDeleteGrace = 7 * 24 * time.Hour
)

var allowedMIMEs = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"video/mp4":  true,
	"video/webm": true,
}

// MediaUseCase orchestrates S3 media upload, confirmation and retrieval.
type MediaUseCase struct {
	mediaRepo   repository.MediaRepository
	orderRepo   repository.OrderRepository
	s3          *s3client.S3Client
	mediaWorker *worker.MediaWorker
	rateLimiter *ratelimit.Limiter
	bucket      string
	storyLog    *storylog.Logger
}

// GetPublicFile opens an account/work object for the read-only media proxy.
// Key-prefix validation is performed by the HTTP handler before this method.
func (uc *MediaUseCase) GetPublicFile(ctx context.Context, key string) (io.ReadCloser, error) {
	return uc.s3.GetObject(ctx, key)
}

// NewMediaUseCase creates a MediaUseCase.
func NewMediaUseCase(
	mediaRepo repository.MediaRepository,
	orderRepo repository.OrderRepository,
	s3 *s3client.S3Client,
	mediaWorker *worker.MediaWorker,
	logs ...*storylog.Logger,
) *MediaUseCase {
	var storyLogger *storylog.Logger
	if len(logs) > 0 {
		storyLogger = logs[0]
	}
	return &MediaUseCase{
		mediaRepo:   mediaRepo,
		orderRepo:   orderRepo,
		s3:          s3,
		mediaWorker: mediaWorker,
		// 10 upload-intents per minute per user
		rateLimiter: ratelimit.New(10, time.Minute),
		bucket:      s3.Bucket(),
		storyLog:    storyLogger,
	}
}

// CreateUploadIntent validates the request, generates staging + final keys, persists
// the intent, and returns a pre-signed S3 PUT URL with required headers.
func (uc *MediaUseCase) CreateUploadIntent(
	ctx context.Context,
	userID string,
	req *domain.UploadIntentRequest,
) (*domain.UploadIntentResponse, error) {
	// Rate limit
	if !uc.rateLimiter.Allow(userID) {
		return nil, apperrors.New("RATE_LIMIT_EXCEEDED", "Слишком много запросов, попробуйте позже", http.StatusTooManyRequests)
	}

	// Ownership: при загрузке аватара entityID должен совпадать с userID,
	// иначе пользователь мог бы заменить аватар чужого аккаунта.
	if req.EntityType == domain.MediaEntityAccount && req.EntityID != userID {
		return nil, apperrors.New("FORBIDDEN", "Нельзя загружать медиа в чужой аккаунт", http.StatusForbidden)
	}

	// Validate MIME
	if !allowedMIMEs[req.MimeType] {
		return nil, apperrors.New("INVALID_MIME_TYPE", "Допустимые форматы: JPEG, PNG, WebP, MP4 и WebM", http.StatusBadRequest)
	}
	if strings.HasPrefix(req.MimeType, "video/") && req.Category != domain.MediaCategoryStory {
		return nil, apperrors.New("INVALID_MEDIA_CATEGORY", "Видео можно использовать только в сторис", http.StatusBadRequest)
	}
	if strings.HasPrefix(req.MimeType, "video/") && (req.TrimStart < 0 || req.TrimEnd <= req.TrimStart || math.IsNaN(req.TrimStart) || math.IsNaN(req.TrimEnd) || math.IsInf(req.TrimStart, 0) || math.IsInf(req.TrimEnd, 0)) {
		return nil, apperrors.New("INVALID_VIDEO_RANGE", "Некорректный диапазон обрезки видео", http.StatusBadRequest)
	}
	if strings.HasPrefix(req.MimeType, "video/") && req.TrimEnd-req.TrimStart > 4*60+0.05 {
		return nil, apperrors.New("INVALID_VIDEO_RANGE", "Фрагмент видео не может быть длиннее 4 минут", http.StatusBadRequest)
	}

	// Validate size
	maxSize, ok := maxSizeByCategory[req.Category]
	if !ok || req.SizeBytes > maxSize {
		return nil, apperrors.New("FILE_TOO_LARGE",
			fmt.Sprintf("Максимальный размер файла для %s: %d МБ", req.Category, maxSize>>20),
			http.StatusBadRequest)
	}

	// Check entity photo limit (skip for avatar — replacement handled at confirm time)
	if req.Category != domain.MediaCategoryAvatar {
		count, err := uc.mediaRepo.CountAssetsByEntity(ctx, string(req.EntityType), req.EntityID, string(req.Category))
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		if count >= maxCountByCategory[req.Category] {
			return nil, apperrors.New("PHOTO_LIMIT_REACHED",
				fmt.Sprintf("Достигнут лимит фотографий (%d) для этой сущности", maxCountByCategory[req.Category]),
				http.StatusConflict)
		}
	}

	// Generate keys
	sourceUUID := newUUID()
	ext := mimeToExt(req.MimeType)
	now := time.Now()

	var stagingKey, finalKey string
	stagingKey = fmt.Sprintf("uploads/tmp/%s", sourceUUID)

	switch req.EntityType {
	case domain.MediaEntityAccount:
		finalKey = fmt.Sprintf("accounts/%s/%s/%s/%s.%s",
			req.EntityID, req.Category, now.Format("2006/01"), sourceUUID, ext)
	case domain.MediaEntityWork:
		finalKey = fmt.Sprintf("works/%s/photos/%s/%s.%s",
			req.EntityID, now.Format("2006/01"), sourceUUID, ext)
	case domain.MediaEntityObject:
		finalKey = fmt.Sprintf("objects/%s/photos/%s/%s.%s",
			req.EntityID, now.Format("2006/01"), sourceUUID, ext)
	case domain.MediaEntityStory:
		if req.EntityID != userID {
			return nil, apperrors.New("FORBIDDEN", "Нельзя загружать сторис для другого пользователя", http.StatusForbidden)
		}
		finalKey = fmt.Sprintf("stories/%s/%s/%s.%s",
			req.EntityID, now.Format("2006/01"), sourceUUID, ext)
	default:
		return nil, apperrors.New("INVALID_ENTITY_TYPE", "Неизвестный тип сущности", http.StatusBadRequest)
	}

	// Persist intent
	expiresAt := now.Add(intentTTL)
	intent := &domain.PendingIntent{
		UserID:     userID,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		Category:   req.Category,
		StagingKey: stagingKey,
		FinalKey:   finalKey,
		MimeType:   req.MimeType,
		SizeBytes:  req.SizeBytes,
		TrimStart:  req.TrimStart,
		TrimEnd:    req.TrimEnd,
		ExpiresAt:  expiresAt,
	}
	if req.Category == domain.MediaCategoryStory {
		uc.storyLog.Printf("%s", storylog.Event("story_upload_intent_created", "user", userID, "intent", intent.ID, "mime", req.MimeType, "size_bytes", req.SizeBytes, "trim_start", req.TrimStart, "trim_end", req.TrimEnd))
	}
	if err := uc.mediaRepo.CreateIntent(ctx, intent); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return &domain.UploadIntentResponse{
		IntentID: intent.ID,
		// The browser uploads to the authenticated backend proxy. S3 remains
		// private on the server and is never exposed to end users.
		UploadURL:  fmt.Sprintf("/v1/media/upload?intentId=%s&stagingKey=%s", intent.ID, url.QueryEscape(stagingKey)),
		StagingKey: stagingKey,
		ExpiresAt:  expiresAt.UTC().Format(time.RFC3339),
		Headers:    map[string]string{},
	}, nil
}

// UploadFile accepts a multipart upload from an authenticated client and
// stores it in the private S3-compatible storage. The intent is checked again
// here so a client cannot upload to another user's key or bypass size/MIME
// validation.
func (uc *MediaUseCase) UploadFile(
	ctx context.Context,
	userID, intentID, stagingKey, mimeType string,
	file io.Reader,
	size int64,
) error {
	intent, err := uc.mediaRepo.GetIntentByID(ctx, intentID)
	if err != nil {
		return apperrors.ErrInternalServer
	}
	if intent == nil || time.Now().After(intent.ExpiresAt) {
		return apperrors.New("INTENT_NOT_FOUND", "Intent не найден или истёк", http.StatusNotFound)
	}
	if intent.UserID != userID {
		return apperrors.New("INTENT_FORBIDDEN", "Intent принадлежит другому пользователю", http.StatusForbidden)
	}
	if intent.StagingKey != stagingKey {
		return apperrors.New("STAGING_KEY_MISMATCH", "stagingKey не соответствует intentId", http.StatusBadRequest)
	}
	if intent.MimeType != mimeType || !allowedMIMEs[mimeType] {
		return apperrors.New("INVALID_MIME_TYPE", "Тип файла не соответствует upload-intent", http.StatusBadRequest)
	}
	if strings.HasPrefix(mimeType, "video/") && intent.Category != domain.MediaCategoryStory {
		return apperrors.New("INVALID_MEDIA_CATEGORY", "Видео можно использовать только в сторис", http.StatusBadRequest)
	}
	if size != intent.SizeBytes {
		return apperrors.New("SIZE_MISMATCH", "Размер файла не соответствует upload-intent", http.StatusUnprocessableEntity)
	}

	if err := uc.s3.PutObject(ctx, stagingKey, mimeType, file, size); err != nil {
		return apperrors.ErrInternalServer
	}
	return nil
}

// ConfirmUpload verifies the intent, checks the uploaded object exists in S3,
// creates the MediaAsset record, and enqueues the processing job.
// This method is idempotent: a second call with the same intentId returns the
// existing assetId without duplicating DB records or queue messages.
func (uc *MediaUseCase) ConfirmUpload(
	ctx context.Context,
	userID string,
	req *domain.ConfirmUploadRequest,
) (*domain.ConfirmUploadResponse, error) {
	// Check idempotency — asset already created for this intent
	existing, err := uc.mediaRepo.GetAssetByIntentID(ctx, req.IntentID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if existing != nil {
		return &domain.ConfirmUploadResponse{
			AssetID: existing.ID,
			Status:  existing.Status,
		}, nil
	}

	// Load intent
	intent, err := uc.mediaRepo.GetIntentByID(ctx, req.IntentID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if intent == nil {
		return nil, apperrors.New("INTENT_NOT_FOUND", "Intent не найден или истёк", http.StatusNotFound)
	}
	if time.Now().After(intent.ExpiresAt) {
		_ = uc.mediaRepo.DeleteIntent(ctx, intent.ID)
		return nil, apperrors.New("INTENT_EXPIRED", "Intent истёк, создайте новый upload-intent", http.StatusNotFound)
	}
	if intent.UserID != userID {
		return nil, apperrors.New("INTENT_FORBIDDEN", "Intent принадлежит другому пользователю", http.StatusForbidden)
	}
	if intent.StagingKey != req.StagingKey {
		return nil, apperrors.New("STAGING_KEY_MISMATCH", "stagingKey не соответствует intentId", http.StatusBadRequest)
	}

	// Verify object exists in S3 and size matches
	head, err := uc.s3.HeadObject(ctx, req.StagingKey)
	if err != nil || head == nil {
		return nil, apperrors.New("OBJECT_NOT_FOUND",
			"Файл не найден в S3 — возможно загрузка не была завершена",
			http.StatusConflict)
	}
	var actualSize int64
	if head.ContentLength != nil {
		actualSize = *head.ContentLength
	}
	if actualSize != intent.SizeBytes {
		return nil, apperrors.New("SIZE_MISMATCH",
			fmt.Sprintf("Фактический размер файла (%d байт) не совпадает с заявленным (%d байт)", actualSize, intent.SizeBytes),
			http.StatusUnprocessableEntity)
	}

	// For avatar: soft-delete the previous active avatar atomically
	if intent.Category == domain.MediaCategoryAvatar {
		prev, err := uc.mediaRepo.GetActiveAvatarByEntity(ctx, string(intent.EntityType), intent.EntityID)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		if prev != nil {
			if err := uc.mediaRepo.SoftDeleteAsset(ctx, prev.ID); err != nil {
				return nil, apperrors.ErrInternalServer
			}
		}
	}

	// Create asset record (status=processing, object_key=NULL until processor runs)
	asset := &domain.MediaAsset{
		EntityType:    intent.EntityType,
		EntityID:      intent.EntityID,
		Category:      intent.Category,
		IntentID:      intent.ID,
		StorageBucket: uc.bucket,
		ObjectKey:     nil, // set by processor
		MimeType:      intent.MimeType,
		SizeBytes:     actualSize,
		Status:        domain.MediaStatusProcessing,
		CreatedBy:     userID,
	}
	saved, err := uc.mediaRepo.CreateAsset(ctx, asset)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if intent.Category == domain.MediaCategoryStory {
		uc.storyLog.Printf("%s", storylog.Event("story_upload_confirmed", "user", userID, "asset", saved.ID, "size_bytes", actualSize))
	}

	// Derive sourceUUID from staging key: "uploads/tmp/{uuid}"
	sourceUUID := sourceUUIDFromStagingKey(intent.StagingKey)

	// Enqueue processing job
	job := domain.ProcessJob{
		AssetID:    saved.ID,
		IntentID:   intent.ID,
		StagingKey: intent.StagingKey,
		FinalKey:   intent.FinalKey,
		EntityType: intent.EntityType,
		EntityID:   intent.EntityID,
		SourceUUID: sourceUUID,
		MimeType:   intent.MimeType,
		TrimStart:  intent.TrimStart,
		TrimEnd:    intent.TrimEnd,
	}
	if err := uc.mediaWorker.Enqueue(job); err != nil {
		log.Printf("[media] enqueue failed for asset=%s intent=%s: %v", saved.ID, intent.ID, err)
		return nil, apperrors.New(
			"MEDIA_QUEUE_BUSY",
			"Очередь обработки фото занята. Повторите подтверждение загрузки позже.",
			http.StatusServiceUnavailable,
		)
	}

	return &domain.ConfirmUploadResponse{
		AssetID: saved.ID,
		Status:  domain.MediaStatusProcessing,
	}, nil
}

// GetAsset returns a single asset with URLs (only populated when status=ready).
// Access rules:
//   - account / work: публичные витрины (аватары, фото работ мастера) — доступ
//     любому аутентифицированному пользователю.
//   - object: приватный контейнер — доступ создателю или участникам заказа,
//     если asset указан в order.photo_asset_ids.
func (uc *MediaUseCase) GetAsset(ctx context.Context, userID, assetID string) (*domain.MediaAssetResponse, error) {
	asset, err := uc.mediaRepo.GetAssetByID(ctx, assetID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if asset == nil {
		return nil, apperrors.New("ASSET_NOT_FOUND", "Медиафайл не найден", http.StatusNotFound)
	}

	if asset.EntityType == domain.MediaEntityObject && asset.CreatedBy != userID {
		allowedByOrder, err := uc.canAccessOrderPhoto(ctx, asset.ID, userID)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		if allowedByOrder {
			return uc.toAssetResponse(asset), nil
		}
		return nil, apperrors.New("FORBIDDEN", "Нет прав на просмотр этого файла", http.StatusForbidden)
	}

	return uc.toAssetResponse(asset), nil
}

// GetPublicAsset is used by public story responses. Story assets are safe to
// expose because the story itself is public while it is active.
func (uc *MediaUseCase) GetPublicAsset(ctx context.Context, assetID string) (*domain.MediaAssetResponse, error) {
	asset, err := uc.mediaRepo.GetAssetByID(ctx, assetID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if asset == nil || asset.EntityType != domain.MediaEntityStory || asset.Category != domain.MediaCategoryStory {
		return nil, apperrors.ErrNotFound
	}
	return uc.toAssetResponse(asset), nil
}

// ValidateOwnedStoryAsset checks that an uploaded image or video belongs to the
// publisher and has finished processing before it is attached to a story.
func (uc *MediaUseCase) ValidateOwnedStoryAsset(ctx context.Context, userID, assetID string) (*domain.MediaAssetResponse, error) {
	asset, err := uc.mediaRepo.GetAssetByID(ctx, assetID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if asset == nil {
		return nil, apperrors.ErrNotFound
	}
	if asset.CreatedBy != userID || asset.EntityType != domain.MediaEntityStory || asset.EntityID != userID || asset.Category != domain.MediaCategoryStory {
		return nil, apperrors.New("FORBIDDEN", "Этот файл нельзя добавить в сторис", http.StatusForbidden)
	}
	if asset.Status != domain.MediaStatusReady {
		return nil, apperrors.New("MEDIA_NOT_READY", "Изображение ещё обрабатывается", http.StatusConflict)
	}
	return uc.toAssetResponse(asset), nil
}

// PurgeAssetNow removes the database records and all S3 objects immediately.
// Stories use this path because their media must not wait for the regular
// seven-day soft-delete grace period.
func (uc *MediaUseCase) PurgeAssetNow(ctx context.Context, assetID string) error {
	asset, err := uc.mediaRepo.GetAssetByID(ctx, assetID)
	if err != nil || asset == nil {
		return err
	}
	if asset.ObjectKey != nil {
		if err := uc.s3.DeleteObject(ctx, *asset.ObjectKey); err != nil {
			return err
		}
	}
	for _, derivative := range asset.Derivatives {
		if err := uc.s3.DeleteObject(ctx, derivative.ObjectKey); err != nil {
			return err
		}
	}
	return uc.mediaRepo.HardDeleteAsset(ctx, assetID)
}

// GetAssetsByEntity lists all non-deleted assets for a given entity.
// account/work считаются публичными витринами (аватары, фото работ мастера).
// object — приватный контейнер, доступен только пользователю, который создал
// хотя бы один актив в этой сущности (владельцу).
func (uc *MediaUseCase) GetAssetsByEntity(
	ctx context.Context,
	userID, entityType, entityID string,
) (*domain.MediaAssetsResponse, error) {
	switch domain.MediaEntityType(entityType) {
	case domain.MediaEntityAccount, domain.MediaEntityWork, domain.MediaEntityObject, domain.MediaEntityStory:
		// ok
	default:
		return nil, apperrors.New("INVALID_ENTITY_TYPE", "Неизвестный тип сущности", http.StatusBadRequest)
	}

	assets, err := uc.mediaRepo.GetAssetsByEntity(ctx, entityType, entityID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	if domain.MediaEntityType(entityType) == domain.MediaEntityObject && len(assets) > 0 {
		owned := false
		for _, a := range assets {
			if a.CreatedBy == userID {
				owned = true
				break
			}
		}
		if !owned {
			return nil, apperrors.New("FORBIDDEN", "Нет прав на просмотр файлов этой сущности", http.StatusForbidden)
		}
	}

	resp := make([]*domain.MediaAssetResponse, 0, len(assets))
	for _, a := range assets {
		resp = append(resp, uc.toAssetResponse(a))
	}
	return &domain.MediaAssetsResponse{Assets: resp}, nil
}

// DeleteAsset soft-deletes an asset. Hard delete runs via the background cleanup job.
func (uc *MediaUseCase) DeleteAsset(ctx context.Context, userID, assetID string) error {
	asset, err := uc.mediaRepo.GetAssetByID(ctx, assetID)
	if err != nil {
		return apperrors.ErrInternalServer
	}
	if asset == nil {
		return apperrors.New("ASSET_NOT_FOUND", "Медиафайл не найден", http.StatusNotFound)
	}
	if asset.CreatedBy != userID {
		return apperrors.New("FORBIDDEN", "Нет прав на удаление этого файла", http.StatusForbidden)
	}
	return uc.mediaRepo.SoftDeleteAsset(ctx, assetID)
}

// RequeueStaleProcessingJobs repairs in-process jobs lost after a deploy/restart.
// The pending_intents row is kept until the worker finishes, so these records
// have enough information to rebuild a ProcessJob safely.
func (uc *MediaUseCase) RequeueStaleProcessingJobs(ctx context.Context, olderThan time.Duration, limit int) (int, error) {
	jobs, err := uc.mediaRepo.GetStaleProcessingJobs(ctx, olderThan, limit)
	if err != nil {
		return 0, err
	}

	requeued := 0
	for _, job := range jobs {
		if job.SourceUUID == "" {
			job.SourceUUID = sourceUUIDFromStagingKey(job.StagingKey)
		}
		if err := uc.mediaWorker.Enqueue(job); err != nil {
			return requeued, err
		}
		requeued++
	}
	return requeued, nil
}

// CleanupExpiredIntents is called periodically to remove stale pending_intents
// and delete their corresponding orphaned staging objects from S3.
func (uc *MediaUseCase) CleanupExpiredIntents(ctx context.Context) error {
	stagingKeys, err := uc.mediaRepo.DeleteExpiredIntents(ctx)
	if err != nil {
		return err
	}
	for _, key := range stagingKeys {
		if delErr := uc.s3.DeleteObject(ctx, key); delErr != nil {
			// Non-fatal: lifecycle rule will clean up within 1 hour
			_ = delErr
		}
	}
	return nil
}

// RunHardDeleteJob purges S3 objects and DB records for assets that were soft-deleted
// more than hardDeleteGrace ago.
func (uc *MediaUseCase) RunHardDeleteJob(ctx context.Context) error {
	assets, err := uc.mediaRepo.GetAssetsForHardDelete(ctx, hardDeleteGrace)
	if err != nil {
		return err
	}
	for _, asset := range assets {
		if asset.ObjectKey != nil {
			_ = uc.s3.DeleteObject(ctx, *asset.ObjectKey)
		}
		for _, d := range asset.Derivatives {
			_ = uc.s3.DeleteObject(ctx, d.ObjectKey)
		}
		// Final removal from DB
		_ = uc.mediaRepo.DeleteDerivativesByAssetID(ctx, asset.ID)
		// Mark as purged by setting status and nulling object_key is enough;
		// a full DB delete is optional — keep for audit trail.
	}
	return nil
}

func (uc *MediaUseCase) canAccessOrderPhoto(ctx context.Context, assetID, userID string) (bool, error) {
	if uc.orderRepo == nil {
		return false, nil
	}
	return uc.orderRepo.HasPhotoAssetForParticipant(ctx, assetID, userID)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

func (uc *MediaUseCase) toAssetResponse(a *domain.MediaAsset) *domain.MediaAssetResponse {
	resp := &domain.MediaAssetResponse{
		AssetID:   a.ID,
		Category:  a.Category,
		Status:    a.Status,
		Width:     a.Width,
		Height:    a.Height,
		SizeBytes: a.SizeBytes,
		MimeType:  a.MimeType,
		CreatedAt: a.CreatedAt.UTC().Format(time.RFC3339),
	}

	if a.Status == domain.MediaStatusReady && a.ObjectKey != nil {
		urls := &domain.MediaAssetURLs{
			Original: uc.s3.CDNURLForKey(*a.ObjectKey),
		}
		for _, d := range a.Derivatives {
			du := &domain.MediaDerivativeURLs{}
			switch d.Format {
			case "jpeg":
				du.JPEG = uc.s3.CDNURLForKey(d.ObjectKey)
			case "webp":
				du.WebP = uc.s3.CDNURLForKey(d.ObjectKey)
			}
			switch d.Variant {
			case domain.MediaVariantThumb:
				if urls.Thumb == nil {
					urls.Thumb = &domain.MediaDerivativeURLs{}
				}
				mergeDerivativeURLs(urls.Thumb, d.Format, uc.s3.CDNURLForKey(d.ObjectKey))
			case domain.MediaVariantMedium:
				if urls.Medium == nil {
					urls.Medium = &domain.MediaDerivativeURLs{}
				}
				mergeDerivativeURLs(urls.Medium, d.Format, uc.s3.CDNURLForKey(d.ObjectKey))
			case domain.MediaVariantLarge:
				if urls.Large == nil {
					urls.Large = &domain.MediaDerivativeURLs{}
				}
				mergeDerivativeURLs(urls.Large, d.Format, uc.s3.CDNURLForKey(d.ObjectKey))
			}
		}
		resp.URLs = urls
	}
	return resp
}

func mergeDerivativeURLs(du *domain.MediaDerivativeURLs, format, url string) {
	switch format {
	case "jpeg":
		du.JPEG = url
	case "webp":
		du.WebP = url
	}
}

func mimeToExt(mime string) string {
	switch mime {
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	case "video/mp4":
		return "mp4"
	case "video/webm":
		return "webm"
	default:
		return "jpg"
	}
}

// newUUID generates a random UUID v4 using crypto/rand.
func newUUID() string {
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err != nil {
		panic(fmt.Sprintf("crypto/rand failed: %v", err))
	}
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16])
}

// sourceUUIDFromStagingKey extracts the UUID from "uploads/tmp/{uuid}".
func sourceUUIDFromStagingKey(key string) string {
	const prefix = "uploads/tmp/"
	if len(key) > len(prefix) {
		return key[len(prefix):]
	}
	return key
}
