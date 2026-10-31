// Package worker provides an in-process job queue for async image processing.
//
// Architecture: a buffered channel acts as the queue; a fixed pool of goroutines
// consumes jobs. Failed jobs are retried up to maxRetries times with exponential
// back-off. On final failure the S3 object is moved to quarantine and the DB
// record is marked as failed.
//
// This is a pragmatic v1 implementation. Replace the channel queue with SQS /
// RabbitMQ by swapping the Enqueue / consume logic — the processor and retry
// logic stay unchanged.
package worker

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/pkg/imageprocessor"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/repository"
)

const (
	maxRetries    = 3
	workerCount   = 4
	queueCapacity = 256
)

// MediaWorker manages the in-process processing queue.
type MediaWorker struct {
	jobs       chan domain.ProcessJob
	processor  *imageprocessor.Processor
	s3         *s3client.S3Client
	mediaRepo  repository.MediaRepository
	queueMu    sync.Mutex
	queued     map[string]struct{}
	videoSlots chan struct{}
	storyLog   *storylog.Logger
	wg         sync.WaitGroup
}

// New creates and starts the worker pool. Call Shutdown to drain the queue on exit.
func New(
	s3 *s3client.S3Client,
	mediaRepo repository.MediaRepository,
	logs ...*storylog.Logger,
) *MediaWorker {
	var storyLogger *storylog.Logger
	if len(logs) > 0 {
		storyLogger = logs[0]
	}
	w := &MediaWorker{
		jobs:       make(chan domain.ProcessJob, queueCapacity),
		processor:  imageprocessor.New(s3),
		s3:         s3,
		mediaRepo:  mediaRepo,
		queued:     make(map[string]struct{}),
		videoSlots: make(chan struct{}, 2),
		storyLog:   storyLogger,
	}
	for i := 0; i < workerCount; i++ {
		w.wg.Add(1)
		go w.run()
	}
	return w
}

// Enqueue adds a job to the queue. Returns an error if the queue is full.
func (w *MediaWorker) Enqueue(job domain.ProcessJob) error {
	w.queueMu.Lock()
	defer w.queueMu.Unlock()

	if job.AssetID != "" {
		if _, exists := w.queued[job.AssetID]; exists {
			return nil
		}
	}

	select {
	case w.jobs <- job:
		if job.AssetID != "" {
			w.queued[job.AssetID] = struct{}{}
		}
		return nil
	default:
		return fmt.Errorf("media worker queue full (capacity %d)", queueCapacity)
	}
}

// Shutdown drains the queue and waits for all workers to finish.
func (w *MediaWorker) Shutdown() {
	close(w.jobs)
	w.wg.Wait()
}

func (w *MediaWorker) run() {
	defer w.wg.Done()
	for job := range w.jobs {
		w.handle(job)
	}
}

func (w *MediaWorker) handle(job domain.ProcessJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	log.Printf("[media-worker] processing asset=%s staging=%s attempt=%d",
		job.AssetID, job.StagingKey, job.RetryCount+1)

	err := w.process(ctx, job)
	if err == nil {
		w.markDone(job.AssetID)
		return
	}

	log.Printf("[media-worker] attempt %d failed for asset=%s: %v", job.RetryCount+1, job.AssetID, err)

	if job.RetryCount < maxRetries-1 {
		// Exponential back-off: 5s, 15s, 45s
		backoff := time.Duration(5<<uint(job.RetryCount)) * time.Second
		time.Sleep(backoff)
		job.RetryCount++
		w.markDone(job.AssetID)
		if enqErr := w.Enqueue(job); enqErr != nil {
			log.Printf("[media-worker] re-enqueue failed for asset=%s: %v — quarantining", job.AssetID, enqErr)
			w.quarantine(ctx, job, err)
		}
		return
	}

	// Max retries reached — quarantine
	w.quarantine(ctx, job, err)
	w.markDone(job.AssetID)
}

func (w *MediaWorker) markDone(assetID string) {
	if assetID == "" {
		return
	}
	w.queueMu.Lock()
	delete(w.queued, assetID)
	w.queueMu.Unlock()
}

func (w *MediaWorker) process(ctx context.Context, job domain.ProcessJob) error {
	if job.EntityType == domain.MediaEntityStory && job.MimeType != "" && len(job.MimeType) >= 6 && job.MimeType[:6] == "video/" {
		w.videoSlots <- struct{}{}
		defer func() { <-w.videoSlots }()
		w.storyLog.Printf("%s", storylog.Event("video_processing_started", "asset", job.AssetID, "trim_start", job.TrimStart, "trim_end", job.TrimEnd))
	}
	result, err := w.processor.Process(ctx, job.StagingKey, job.FinalKey, string(job.EntityType), job.EntityID, job.SourceUUID, job.TrimStart, job.TrimEnd)
	if err != nil {
		if job.EntityType == domain.MediaEntityStory {
			w.storyLog.Printf("%s error=%v", storylog.Event("media_processing_failed", "asset", job.AssetID), err)
		}
		return fmt.Errorf("process image: %w", err)
	}

	// Persist derivatives (FirstOrCreate — idempotent on retry)
	for _, d := range result.Derivatives {
		deriv := &domain.MediaDerivative{
			AssetID:   job.AssetID,
			Variant:   d.Variant,
			Format:    d.Format,
			ObjectKey: d.ObjectKey,
			MimeType:  d.MimeType,
			SizeBytes: d.SizeBytes,
			Width:     d.Width,
			Height:    d.Height,
		}
		if err := w.mediaRepo.CreateDerivative(ctx, deriv); err != nil {
			return fmt.Errorf("save derivative %s: %w", d.Variant, err)
		}
	}

	// Update asset record
	asset, err := w.mediaRepo.GetAssetByID(ctx, job.AssetID)
	if err != nil || asset == nil {
		return fmt.Errorf("get asset %s: %w", job.AssetID, err)
	}
	asset.ObjectKey = &result.FinalKey
	asset.MimeType = result.MimeType
	asset.Width = result.Width
	asset.Height = result.Height
	asset.SizeBytes = result.SizeBytes
	asset.ChecksumSHA256 = &result.ChecksumSHA256
	asset.Status = domain.MediaStatusReady
	if err := w.mediaRepo.UpdateAsset(ctx, asset); err != nil {
		return fmt.Errorf("update asset %s: %w", job.AssetID, err)
	}

	// Delete staging key regardless (idempotent)
	if err := w.s3.DeleteObject(ctx, job.StagingKey); err != nil {
		// Non-fatal: lifecycle rule will clean it up within 1 hour
		log.Printf("[media-worker] warn: could not delete staging key %s: %v", job.StagingKey, err)
	}
	if job.IntentID != "" {
		_ = w.mediaRepo.DeleteIntent(ctx, job.IntentID)
	}

	log.Printf("[media-worker] done asset=%s key=%s", job.AssetID, job.FinalKey)
	if job.EntityType == domain.MediaEntityStory {
		w.storyLog.Printf("%s", storylog.Event("media_processing_ready", "asset", job.AssetID, "size_bytes", result.SizeBytes))
	}
	return nil
}

func (w *MediaWorker) quarantine(ctx context.Context, job domain.ProcessJob, origErr error) {
	log.Printf("[media-worker] quarantining asset=%s staging=%s reason=%v", job.AssetID, job.StagingKey, origErr)

	quarantineKey := fmt.Sprintf("quarantine/%s/%s/%s/%s",
		time.Now().Format("2006/01"),
		job.EntityType, job.EntityID,
		job.AssetID,
	)

	if err := w.s3.CopyObject(ctx, job.StagingKey, quarantineKey); err != nil {
		log.Printf("[media-worker] quarantine copy failed for %s: %v", job.StagingKey, err)
	} else {
		_ = w.s3.DeleteObject(ctx, job.StagingKey)
	}

	// Mark asset as failed
	asset, err := w.mediaRepo.GetAssetByID(ctx, job.AssetID)
	if err != nil || asset == nil {
		log.Printf("[media-worker] could not load asset %s to mark failed: %v", job.AssetID, err)
		return
	}
	asset.Status = domain.MediaStatusFailed
	if updateErr := w.mediaRepo.UpdateAsset(ctx, asset); updateErr != nil {
		log.Printf("[media-worker] could not mark asset %s as failed: %v", job.AssetID, updateErr)
	}
	if job.IntentID != "" {
		_ = w.mediaRepo.DeleteIntent(ctx, job.IntentID)
	}
}
