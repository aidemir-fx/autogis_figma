package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/usecase"
)

func (h *AuthHandler) ConfigurePhoneVerification(service *usecase.PhoneVerification, privacy, terms string, disconnectUser func(string)) {
	h.phoneVerification = service
	h.privacyText = privacy
	h.termsText = terms
	h.disconnectUser = disconnectUser
}

func (h *AuthHandler) LegalDocument(c *gin.Context) {
	var text string
	switch c.Param("kind") {
	case "privacy":
		text = h.privacyText
	case "terms":
		text = h.termsText
	}
	if text == "" {
		c.JSON(http.StatusNotFound, apperrors.ErrNotFound)
		return
	}
	c.JSON(http.StatusOK, gin.H{"text": text})
}

func (h *AuthHandler) PhoneVerificationConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"enabled": h.phoneVerification != nil})
}

func (h *AuthHandler) verificationAvailable(c *gin.Context) bool {
	if h.phoneVerification == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": "PHONE_VERIFICATION_UNAVAILABLE"})
		return false
	}
	c.Header("Cache-Control", "no-store")
	return true
}

func (h *AuthHandler) StartPhoneVerification(c *gin.Context) {
	if !h.verificationAvailable(c) {
		return
	}
	var req struct {
		Phone   string `json:"phone"`
		Purpose string `json:"purpose"`
	}
	if !bindPhoneRequest(c, &req) {
		return
	}
	result, err := h.phoneVerification.Start(c.Request.Context(), req.Phone, req.Purpose)
	writePhoneResult(c, result, err)
}

func (h *AuthHandler) PhoneVerificationStatus(c *gin.Context) {
	if !h.verificationAvailable(c) {
		return
	}
	var req struct {
		ID string `json:"id"`
	}
	if !bindPhoneRequest(c, &req) {
		return
	}
	result, err := h.phoneVerification.Status(c.Request.Context(), req.ID)
	writePhoneResult(c, result, err)
}

func (h *AuthHandler) PhoneVerificationCode(c *gin.Context) {
	if !h.verificationAvailable(c) {
		return
	}
	var req struct {
		ID   string `json:"id"`
		Code string `json:"code"`
	}
	if !bindPhoneRequest(c, &req) {
		return
	}
	result, err := h.phoneVerification.Code(c.Request.Context(), req.ID, req.Code)
	writePhoneResult(c, result, err)
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	if !h.verificationAvailable(c) {
		return
	}
	var req struct {
		Phone          string `json:"phone"`
		Password       string `json:"password"`
		VerificationID string `json:"verificationId"`
	}
	if !bindPhoneRequest(c, &req) {
		return
	}
	userID, err := h.phoneVerification.Reset(c.Request.Context(), req.VerificationID, req.Phone, req.Password)
	if err == nil && h.disconnectUser != nil {
		h.disconnectUser(userID)
	}
	writePhoneResult(c, gin.H{"success": true}, err)
}

func bindPhoneRequest(c *gin.Context, request any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4<<10)
	if err := c.ShouldBindJSON(request); err != nil {
		c.JSON(http.StatusBadRequest, apperrors.ErrValidationFailed)
		return false
	}
	return true
}

func writePhoneResult(c *gin.Context, result any, err error) {
	if err == nil {
		c.JSON(http.StatusOK, result)
		return
	}
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErr.Status, appErr)
		return
	}
	c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
}
