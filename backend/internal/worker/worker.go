package worker

import (
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/repository"
)

type Worker struct {
	s3Client *s3client.Client
	mediaRepo *repository.MediaRepository
	logger    *storylog.Logger
}

func New(s3Client *s3client.Client, mediaRepo *repository.MediaRepository, logger *storylog.Logger) *Worker {
	return &Worker{
		s3Client: s3Client,
		mediaRepo: mediaRepo,
		logger:    logger,
	}
}

func (w *Worker) Shutdown() {
	// Shutdown worker gracefully
}
