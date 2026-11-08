package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/usecase"
)

type CatalogHandler struct {
	useCase *usecase.CatalogUseCase
}

func NewCatalogHandler(useCase *usecase.CatalogUseCase) *CatalogHandler {
	return &CatalogHandler{useCase: useCase}
}

func (h *CatalogHandler) ListProfessions(c *gin.Context) {
	items, err := h.useCase.ListProfessions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load professions"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CatalogHandler) ListServices(c *gin.Context) {
	items, err := h.useCase.ListServices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load services"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CatalogHandler) ListVehicleBrands(c *gin.Context) {
	items, err := h.useCase.ListVehicleBrands(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load vehicle brands"})
		return
	}
	c.JSON(http.StatusOK, items)
}
