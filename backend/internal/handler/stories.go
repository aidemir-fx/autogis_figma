package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

type StoryHandler struct {
	useCase  *usecase.StoryUseCase
	validate *validator.Validate
}

func NewStoryHandler(useCase *usecase.StoryUseCase) *StoryHandler {
	return &StoryHandler{useCase: useCase, validate: validator.New()}
}

func (h *StoryHandler) GetHomeFeed(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	response, err := h.useCase.GetHomeFeed(c.Request.Context(), userID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *StoryHandler) GetAuthorStories(c *gin.Context) {
	viewerID := ""
	if raw, exists := c.Get("user_id"); exists {
		viewerID, _ = raw.(string)
	}
	response, err := h.useCase.GetAuthorStories(c.Request.Context(), c.Param("authorId"), viewerID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *StoryHandler) GetAuthorHighlights(c *gin.Context) {
	viewerID := ""
	if raw, exists := c.Get("user_id"); exists {
		viewerID, _ = raw.(string)
	}
	response, err := h.useCase.GetAuthorHighlights(c.Request.Context(), c.Param("authorId"), viewerID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"highlights": response})
}

func (h *StoryHandler) AddToHighlight(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	var request struct {
		Title string `json:"title" validate:"required,max=48"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || h.validate.Struct(request) != nil {
		c.JSON(http.StatusBadRequest, apperrors.New("INVALID_HIGHLIGHT", "Укажите название подборки", http.StatusBadRequest))
		return
	}
	response, err := h.useCase.AddStoryToHighlight(c.Request.Context(), userID, c.Param("storyId"), request.Title)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, response)
}

func (h *StoryHandler) RemoveFromHighlight(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.RemoveStoryFromHighlight(
		c.Request.Context(),
		userID,
		c.Param("storyId"),
		c.Param("highlightId"),
	); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) Create(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	var request domain.CreateStoryRequest
	if err := c.ShouldBindJSON(&request); err != nil || h.validate.Struct(request) != nil {
		c.JSON(http.StatusBadRequest, apperrors.New("INVALID_STORY", "Некорректные данные сторис", http.StatusBadRequest))
		return
	}
	response, err := h.useCase.CreateStory(c.Request.Context(), userID, &request)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, response)
}

func (h *StoryHandler) Delete(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.DeleteStory(c.Request.Context(), userID, c.Param("storyId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) View(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.RecordView(c.Request.Context(), userID, c.Param("storyId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) Report(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	var request domain.CreateStoryReportRequest
	if err := c.ShouldBindJSON(&request); err != nil || h.validate.Struct(request) != nil {
		c.JSON(http.StatusBadRequest, apperrors.New("INVALID_REPORT", "Выберите причину жалобы", http.StatusBadRequest))
		return
	}
	if err := h.useCase.ReportStory(c.Request.Context(), userID, c.Param("storyId"), request.Reason); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) Follow(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Follow(c.Request.Context(), userID, c.Param("authorId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) Unfollow(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	if err := h.useCase.Unfollow(c.Request.Context(), userID, c.Param("authorId")); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *StoryHandler) IsFollowing(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	following, err := h.useCase.IsFollowing(c.Request.Context(), userID, c.Param("authorId"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"following": following})
}

func (h *StoryHandler) GetMySubscriptionStats(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}
	stats, err := h.useCase.GetSubscriptionStats(c.Request.Context(), userID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *StoryHandler) ListReports(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	reports, err := h.useCase.ListReports(c.Request.Context(), limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": reports, "limit": limit, "offset": offset})
}

func (h *StoryHandler) handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}
