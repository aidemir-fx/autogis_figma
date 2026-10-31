package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/go-playground/validator/v10"
)

func getActor(c *gin.Context) (string, domain.UserRole, bool) {
	userIDValue, hasUserID := c.Get("user_id")
	roleValue, hasRole := c.Get("role")
	if !hasUserID || !hasRole {
		return "", "", false
	}

	userID, ok := userIDValue.(string)
	if !ok || userID == "" {
		return "", "", false
	}

	roleString, ok := roleValue.(string)
	if !ok {
		return "", "", false
	}

	return userID, domain.UserRole(roleString), true
}

func ensureSelfOrAdmin(c *gin.Context, targetUserID string) bool {
	actorID, actorRole, ok := getActor(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return false
	}

	if actorID != targetUserID && actorRole != domain.RoleAdmin {
		c.JSON(http.StatusForbidden, apperrors.New("FORBIDDEN", "Forbidden", http.StatusForbidden))
		return false
	}

	return true
}

func ensureAdmin(c *gin.Context) bool {
	_, actorRole, ok := getActor(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return false
	}

	if actorRole != domain.RoleAdmin {
		c.JSON(http.StatusForbidden, apperrors.New("FORBIDDEN", "Forbidden", http.StatusForbidden))
		return false
	}

	return true
}

func ensureModeratorOrAdmin(c *gin.Context) bool {
	_, actorRole, ok := getActor(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return false
	}

	if actorRole != domain.RoleAdmin && actorRole != domain.RoleModerator {
		c.JSON(http.StatusForbidden, apperrors.New("FORBIDDEN", "Forbidden", http.StatusForbidden))
		return false
	}

	return true
}

type AuthHandler struct {
	authUseCase *usecase.AuthUseCase
	validator   *validator.Validate
}

func NewAuthHandler(authUseCase *usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
		validator:   validator.New(),
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req domain.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed"})
		return
	}

	resp, err := h.authUseCase.Register(c.Request.Context(), &req)
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

func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed"})
		return
	}

	resp, err := h.authUseCase.Login(c.Request.Context(), &req)
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

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req domain.RefreshTokenRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	resp, err := h.authUseCase.RefreshToken(c.Request.Context(), &req)
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

type UserHandler struct {
	userUseCase *usecase.UserUseCase
	validator   *validator.Validate
}

func NewUserHandler(userUseCase *usecase.UserUseCase) *UserHandler {
	return &UserHandler{
		userUseCase: userUseCase,
		validator:   validator.New(),
	}
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	if !ensureSelfOrAdmin(c, id) {
		return
	}

	resp, err := h.userUseCase.GetUser(c.Request.Context(), id)
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

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.userUseCase.GetUser(c.Request.Context(), userID.(string))
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

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if !ensureSelfOrAdmin(c, id) {
		return
	}

	var req domain.UpdateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	resp, err := h.userUseCase.UpdateUser(c.Request.Context(), id, &req)
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

func (h *UserHandler) UpdateUserRole(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	id := c.Param("id")
	var req domain.UpdateUserRoleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	resp, err := h.userUseCase.UpdateUserRole(c.Request.Context(), id, &req)
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

func (h *UserHandler) UpdateProfessionalStatus(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}
	var req domain.UpdateProfessionalStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	resp, err := h.userUseCase.SetProfessionalStatus(c.Request.Context(), c.Param("id"), req.Enabled)
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

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	resp, err := h.userUseCase.GetAllUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *UserHandler) UpdateCurrentUserProfile(c *gin.Context) {
	// Get user ID from JWT context (set by middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	id := userID.(string)
	var req domain.UpdateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	resp, err := h.userUseCase.UpdateUser(c.Request.Context(), id, &req)
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

func (h *UserHandler) GetCurrentUserActivityTypes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	resp, err := h.userUseCase.GetCurrentUserActivityTypes(c.Request.Context(), userID.(string))
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

func (h *UserHandler) ActivateProfessional(c *gin.Context) {
	// Get user ID from JWT context (set by middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
		return
	}

	var req domain.ActivateProfessionalRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if !req.Confirm {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Confirmation required"})
		return
	}

	id := userID.(string)
	resp, err := h.userUseCase.ActivateProfessional(c.Request.Context(), id)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.Status, appErr)
			return
		}
		c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Профессиональный аккаунт активирован",
		"user":    resp,
	})
}
