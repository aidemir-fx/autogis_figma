package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

type ProfessionalApplicationHandler struct {
	uc        *usecase.ProfessionalApplicationUseCase
	validator *validator.Validate
}

func NewProfessionalApplicationHandler(uc *usecase.ProfessionalApplicationUseCase) *ProfessionalApplicationHandler {
	return &ProfessionalApplicationHandler{
		uc:        uc,
		validator: validator.New(),
	}
}

func (h *ProfessionalApplicationHandler) GetActiveSchema(c *gin.Context) {
	schemaKey := strings.TrimSpace(c.Param("schemaKey"))
	if schemaKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "schemaKey is required"})
		return
	}

	resp, err := h.uc.GetActiveSchema(c.Request.Context(), schemaKey)
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

func (h *ProfessionalApplicationHandler) Submit(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.ProfessionalApplicationEnvelopeRequest
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

func (h *ProfessionalApplicationHandler) GetMine(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.uc.GetMyApplications(c.Request.Context(), userIDValue.(string))
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

func (h *ProfessionalApplicationHandler) Resubmit(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.ProfessionalApplicationEnvelopeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	resp, err := h.uc.Resubmit(c.Request.Context(), userIDValue.(string), c.Param("id"), &req)
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

func (h *ProfessionalApplicationHandler) ListModerationCases(c *gin.Context) {
	if !ensureModeratorOrAdmin(c) {
		return
	}

	limit, _ := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("limit", "20")))
	offset, _ := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("offset", "0")))

	filters := domain.ModerationCasesListFilters{
		Domain: strings.TrimSpace(c.DefaultQuery("domain", domain.ModerationDomainProfessionalApplication)),
		Limit:  limit,
		Offset: offset,
	}
	if queueStatus := strings.TrimSpace(c.Query("queueStatus")); queueStatus != "" {
		parsed := domain.ModerationQueueStatus(queueStatus)
		filters.QueueStatus = &parsed
	}
	if decisionStatus := strings.TrimSpace(c.Query("decisionStatus")); decisionStatus != "" {
		parsed := domain.ProfessionalApplicationStatus(decisionStatus)
		filters.DecisionStatus = &parsed
	}
	if assigneeUserID := strings.TrimSpace(c.Query("assigneeUserId")); assigneeUserID != "" {
		filters.AssigneeUserID = &assigneeUserID
	}
	if activityGroupCode := strings.TrimSpace(c.Query("activityGroupCode")); activityGroupCode != "" {
		filters.ActivityGroupCode = &activityGroupCode
	}
	if activitySubtypeCode := strings.TrimSpace(c.Query("activitySubtypeCode")); activitySubtypeCode != "" {
		filters.ActivitySubtypeCode = &activitySubtypeCode
	}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		filters.Query = &q
	}
	if dateFrom := strings.TrimSpace(c.Query("dateFrom")); dateFrom != "" {
		filters.DateFrom = &dateFrom
	}
	if dateTo := strings.TrimSpace(c.Query("dateTo")); dateTo != "" {
		filters.DateTo = &dateTo
	}

	resp, err := h.uc.ListModerationCases(c.Request.Context(), filters)
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

func (h *ProfessionalApplicationHandler) GetModerationCaseDetail(c *gin.Context) {
	if !ensureModeratorOrAdmin(c) {
		return
	}

	actorUserIDValue, _ := c.Get("user_id")
	resp, err := h.uc.GetModerationCaseDetail(c.Request.Context(), actorUserIDValue.(string), c.Param("caseId"))
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

func (h *ProfessionalApplicationHandler) AssignModerationCase(c *gin.Context) {
	if !ensureModeratorOrAdmin(c) {
		return
	}

	var req domain.AssignModerationCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	actorUserIDValue, _ := c.Get("user_id")
	if err := h.uc.AssignModerationCase(c.Request.Context(), actorUserIDValue.(string), c.Param("caseId"), req.AssigneeUserID); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.Status(http.StatusOK)
}

func (h *ProfessionalApplicationHandler) Decide(c *gin.Context) {
	if !ensureModeratorOrAdmin(c) {
		return
	}

	var req domain.ProfessionalApplicationDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	actorUserIDValue, _ := c.Get("user_id")
	if err := h.uc.Decide(c.Request.Context(), actorUserIDValue.(string), c.Param("id"), &req); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.Status(http.StatusOK)
}

func (h *ProfessionalApplicationHandler) ReleaseModerationCase(c *gin.Context) {
	if !ensureModeratorOrAdmin(c) {
		return
	}

	actorUserIDValue, _ := c.Get("user_id")
	if err := h.uc.ReleaseModerationCase(c.Request.Context(), actorUserIDValue.(string), c.Param("caseId")); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.Status(http.StatusOK)
}
