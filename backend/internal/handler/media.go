package handler

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

// MediaHandler handles all /api/v1/media/* endpoints.
type MediaHandler struct {
	uc        *usecase.MediaUseCase
	validator *validator.Validate
}

// NewMediaHandler creates a MediaHandler.
func NewMediaHandler(uc *usecase.MediaUseCase) *MediaHandler {
	return &MediaHandler{
		uc:        uc,
		validator: validator.New(),
	}
}

// CreateUploadIntent godoc
// POST /api/v1/media/upload-intent
// Validates the request, generates a pre-signed S3 PUT URL and persists the intent.
func (h *MediaHandler) CreateUploadIntent(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	var req domain.UploadIntentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректное тело запроса"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ошибка валидации", "details": err.Error()})
		return
	}

	resp, err := h.uc.CreateUploadIntent(c.Request.Context(), userID, &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// UploadFile godoc
// POST /api/v1/media/upload
// Receives the file through the backend; S3 is kept private on the server.
func (h *MediaHandler) UploadFile(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	intentID := c.Query("intentId")
	stagingKey := c.Query("stagingKey")
	if intentID == "" || stagingKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан upload-intent"})
		return
	}

	// The largest story video is 400 MiB. Add one byte so oversized files
	// are rejected before they can consume unbounded request memory.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 400<<20+1)
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не найден в запросе"})
		return
	}
	defer file.Close()

	if err := h.uc.UploadFile(c.Request.Context(), userID, intentID, stagingKey, header.Header.Get("Content-Type"), file, header.Size); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ServeFile serves public account/work/object media through the backend. The S3
// service itself stays bound to localhost and is never exposed to browsers.
func (h *MediaHandler) ServeFile(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("key"), "/")
	if key == "" || strings.Contains(key, "..") ||
		(!strings.HasPrefix(key, "accounts/") &&
			!strings.HasPrefix(key, "works/") &&
			!strings.HasPrefix(key, "objects/") &&
			!strings.HasPrefix(key, "stories/")) {
		c.Status(http.StatusNotFound)
		return
	}

	body, err := h.uc.GetPublicFile(c.Request.Context(), key)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer body.Close()

	contentType := "application/octet-stream"
	switch strings.ToLower(filepath.Ext(key)) {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".mp4":
		contentType = "video/mp4"
	case ".webm":
		contentType = "video/webm"
	}
	c.Header("Cache-Control", "public, max-age=3600")
	c.DataFromReader(http.StatusOK, -1, contentType, body, nil)
}

// ConfirmUpload godoc
// POST /api/v1/media/confirm-upload
// Verifies the object exists in S3 and enqueues the processing job.
func (h *MediaHandler) ConfirmUpload(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	var req domain.ConfirmUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректное тело запроса"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ошибка валидации", "details": err.Error()})
		return
	}

	resp, err := h.uc.ConfirmUpload(c.Request.Context(), userID, &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GetAsset godoc
// GET /api/v1/media/assets/:assetId
// Returns a single asset with URLs. Used for polling processing status.
func (h *MediaHandler) GetAsset(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	assetID := c.Param("assetId")
	resp, err := h.uc.GetAsset(c.Request.Context(), userID, assetID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GetAssetsByEntity godoc
// GET /api/v1/media/:entityType/:entityId
// Lists all ready/processing assets for an entity. Требует аутентификации.
// Для приватных типов сущностей (object) доступ разрешён только владельцу.
func (h *MediaHandler) GetAssetsByEntity(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	entityType := c.Param("entityType")
	entityID := c.Param("entityId")

	resp, err := h.uc.GetAssetsByEntity(c.Request.Context(), userID, entityType, entityID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// DeleteAsset godoc
// DELETE /api/v1/media/assets/:assetId
// Soft-deletes an asset. Hard delete happens asynchronously after 7 days.
func (h *MediaHandler) DeleteAsset(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	assetID := c.Param("assetId")
	if err := h.uc.DeleteAsset(c.Request.Context(), userID, assetID); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// getUserID extracts user_id from the Gin context (set by JWT middleware).
// Writes 401 and returns false if missing.
func getUserID(c *gin.Context) (string, bool) {
	v, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return "", false
	}
	return v.(string), true
}

func (h *MediaHandler) handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}
