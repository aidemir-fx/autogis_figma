package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

type MasterHandler struct {
	masterUseCase *usecase.MasterUseCase
	validator     *validator.Validate
}

type updateMasterStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

func NewMasterHandler(masterUseCase *usecase.MasterUseCase) *MasterHandler {
	return &MasterHandler{
		masterUseCase: masterUseCase,
		validator:     validator.New(),
	}
}

// RegisterActivityType registers a new activity for a user
func (h *MasterHandler) RegisterActivity(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.RegisterActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed"})
		return
	}

	resp, err := h.masterUseCase.RegisterMaster(c.Request.Context(), userID.(string), &req)
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

// GetMasterProfile returns the current user's master profile
func (h *MasterHandler) GetMasterProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.masterUseCase.GetMasterProfile(c.Request.Context(), userID.(string))
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

func (h *MasterHandler) GetMasterByID(c *gin.Context) {
	id := c.Param("id")

	resp, err := h.masterUseCase.GetMasterByID(c.Request.Context(), id)
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

func (h *MasterHandler) GetAllMasters(c *gin.Context) {
	resp, err := h.masterUseCase.GetAllMasters(c.Request.Context())
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

// UpdateMasterProfile updates the current user's master profile
func (h *MasterHandler) UpdateMasterProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.UpdateMasterProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	resp, err := h.masterUseCase.UpdateMasterProfile(c.Request.Context(), userID.(string), &req)
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

func (h *MasterHandler) UpdateMasterStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req updateMasterStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed"})
		return
	}

	resp, err := h.masterUseCase.UpdateMasterProfile(c.Request.Context(), userID.(string), &domain.UpdateMasterProfileRequest{
		Status: &req.Status,
	})
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

func (h *MasterHandler) GetAutoServiceProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.masterUseCase.GetAutoServiceProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) UpdateAutoServiceProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoServiceProfile(c.Request.Context(), userID.(string), &req)
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

func (h *MasterHandler) UpdateAutoServiceStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoServiceProfile(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) GetAutoShopProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	resp, err := h.masterUseCase.GetAutoShopProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) UpdateAutoShopProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoShopProfile(c.Request.Context(), userID.(string), &req)
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

func (h *MasterHandler) UpdateAutoShopStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoShopRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoShopProfile(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) GetAutoShopAdditionalServices(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}

func (h *MasterHandler) GetAutoWashProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	resp, err := h.masterUseCase.GetAutoWashProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) UpdateAutoWashProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoWashRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoWashProfile(c.Request.Context(), userID.(string), &req)
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

func (h *MasterHandler) UpdateAutoWashStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}
	var req domain.UpdateAutoWashRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.masterUseCase.UpdateAutoWashProfile(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *MasterHandler) GetAutoWashAdditionalServices(c *gin.Context) {
	c.JSON(http.StatusOK, []interface{}{})
}
