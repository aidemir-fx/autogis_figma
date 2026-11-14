package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
)

type MasterFavoriteHandler struct {
	useCase *usecase.MasterFavoriteUseCase
}

func NewMasterFavoriteHandler(useCase *usecase.MasterFavoriteUseCase) *MasterFavoriteHandler {
	return &MasterFavoriteHandler{useCase: useCase}
}

func (h *MasterFavoriteHandler) Get(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	masterID := c.Param("masterId")
	favorite, err := h.useCase.Get(c.Request.Context(), userID, masterID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": favorite})
}

func (h *MasterFavoriteHandler) Add(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Add(c.Request.Context(), userID, c.Param("masterId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": true})
}

func (h *MasterFavoriteHandler) Remove(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Remove(c.Request.Context(), userID, c.Param("masterId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": false})
}

func (h *MasterFavoriteHandler) handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}

type AutoServiceFavoriteHandler struct {
	useCase *usecase.AutoServiceFavoriteUseCase
}

func NewAutoServiceFavoriteHandler(useCase *usecase.AutoServiceFavoriteUseCase) *AutoServiceFavoriteHandler {
	return &AutoServiceFavoriteHandler{useCase: useCase}
}

func (h *AutoServiceFavoriteHandler) Get(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	favorite, err := h.useCase.Get(c.Request.Context(), userID, c.Param("autoServiceId"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": favorite})
}

func (h *AutoServiceFavoriteHandler) Add(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Add(c.Request.Context(), userID, c.Param("autoServiceId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": true})
}

func (h *AutoServiceFavoriteHandler) Remove(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Remove(c.Request.Context(), userID, c.Param("autoServiceId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"isFavorite": false})
}

func (h *AutoServiceFavoriteHandler) handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}
