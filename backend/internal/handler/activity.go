// Package handler: ActivityHandler — публичные HTTP-эндпоинты для справочников
// классификации деятельности (activity_groups, activity_subtypes). Справочники редко
// меняются, поэтому отдаются с HTTP-кэшированием: клиент присылает If-None-Match,
// сервер возвращает 304 при совпадении (см. spec §10.2).
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
)

const (
	// activityCacheControl — указывает клиенту, что ответ можно кэшировать публично
	// на 60 секунд, и после этого перепроверять ETag.
	activityCacheControl = "public, max-age=60, must-revalidate"
)

type ActivityHandler struct {
	activityUseCase *usecase.ActivityUseCase
}

func NewActivityHandler(activityUseCase *usecase.ActivityUseCase) *ActivityHandler {
	return &ActivityHandler{activityUseCase: activityUseCase}
}

// GetActivityGroups — GET /api/activity-groups. Возвращает активные группы с ETag.
// Поддерживает Conditional GET через If-None-Match → 304 Not Modified.
func (h *ActivityHandler) GetActivityGroups(c *gin.Context) {
	groups, etag, err := h.activityUseCase.GetGroups(c.Request.Context())
	if err != nil {
		writeActivityError(c, err)
		return
	}
	if matched := checkIfNoneMatch(c, etag); matched {
		return
	}
	c.Header("ETag", etag)
	c.Header("Cache-Control", activityCacheControl)
	c.Header("Vary", "Accept-Encoding")
	c.JSON(http.StatusOK, groups)
}

// GetActivitySubtypes — GET /api/activity-groups/:groupCode/subtypes. Возвращает активные
// подтипы конкретной группы.
func (h *ActivityHandler) GetActivitySubtypes(c *gin.Context) {
	groupCode := c.Param("groupCode")
	if groupCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupCode is required"})
		return
	}
	subtypes, etag, err := h.activityUseCase.GetSubtypesByGroupCode(c.Request.Context(), groupCode)
	if err != nil {
		writeActivityError(c, err)
		return
	}
	if matched := checkIfNoneMatch(c, etag); matched {
		return
	}
	c.Header("ETag", etag)
	c.Header("Cache-Control", activityCacheControl)
	c.Header("Vary", "Accept-Encoding")
	c.JSON(http.StatusOK, subtypes)
}

// checkIfNoneMatch — если клиент прислал If-None-Match равный текущему ETag, отдаём 304
// без тела и возвращаем true. RFC 7232: заголовок может содержать несколько значений через
// запятую, но для простоты справочников сравниваем strict-match по всему значению.
func checkIfNoneMatch(c *gin.Context, etag string) bool {
	if etag == "" {
		return false
	}
	if clientETag := c.GetHeader("If-None-Match"); clientETag != "" && clientETag == etag {
		c.Header("ETag", etag)
		c.Header("Cache-Control", activityCacheControl)
		c.Status(http.StatusNotModified)
		return true
	}
	return false
}

func writeActivityError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}
