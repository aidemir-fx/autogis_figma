package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

type BusinessApplicationHandler struct {
	uc        *usecase.BusinessApplicationUseCase
	validator *validator.Validate
}

func NewBusinessApplicationHandler(uc *usecase.BusinessApplicationUseCase) *BusinessApplicationHandler {
	return &BusinessApplicationHandler{
		uc:        uc,
		validator: validator.New(),
	}
}

// Submit creates a new business application for the current user.
func (h *BusinessApplicationHandler) Submit(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.CreateBusinessApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	resp, err := h.uc.Submit(c.Request.Context(), userIDValue.(string), &req)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetMyLatest returns the most recent business application for the current user.
// Responds with 200 + null-like payload ({"application": null}) when none exists.
func (h *BusinessApplicationHandler) GetMyLatest(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.uc.GetMyLatest(c.Request.Context(), userIDValue.(string))
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusOK, gin.H{"application": resp})
}

// UpdateStatus updates the status of a business application (admin-only).
func (h *BusinessApplicationHandler) UpdateStatus(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	id := c.Param("id")
	var req domain.UpdateBusinessApplicationStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	actorUserIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.uc.UpdateStatus(c.Request.Context(), actorUserIDValue.(string), id, &req)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetAll returns all business applications (admin-only).
func (h *BusinessApplicationHandler) GetAll(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	resp, err := h.uc.GetAll(c.Request.Context())
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusOK, resp)
}
