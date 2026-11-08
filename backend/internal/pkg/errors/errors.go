package errors

import (
	"fmt"
	"net/http"
)

type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

var (
	// Auth errors
	ErrInvalidCredentials = &AppError{
		Code:    "INVALID_CREDENTIALS",
		Message: "Invalid phone or password",
		Status:  http.StatusUnauthorized,
	}

	ErrUserNotFound = &AppError{
		Code:    "USER_NOT_FOUND",
		Message: "User not found",
		Status:  http.StatusNotFound,
	}

	ErrUserExists = &AppError{
		Code:    "USER_EXISTS",
		Message: "User already exists",
		Status:  http.StatusConflict,
	}

	ErrInvalidToken = &AppError{
		Code:    "INVALID_TOKEN",
		Message: "Invalid or expired token",
		Status:  http.StatusUnauthorized,
	}

	ErrUnauthorized = &AppError{
		Code:    "UNAUTHORIZED",
		Message: "Unauthorized",
		Status:  http.StatusUnauthorized,
	}

	// Order errors
	ErrOrderNotFound = &AppError{
		Code:    "ORDER_NOT_FOUND",
		Message: "Order not found",
		Status:  http.StatusNotFound,
	}

	ErrInvalidOrderStatus = &AppError{
		Code:    "INVALID_ORDER_STATUS",
		Message: "Invalid order status",
		Status:  http.StatusBadRequest,
	}

	// General errors
	ErrInternalServer = &AppError{
		Code:    "INTERNAL_SERVER_ERROR",
		Message: "Internal server error",
		Status:  http.StatusInternalServerError,
	}

	ErrValidationFailed = &AppError{
		Code:    "VALIDATION_FAILED",
		Message: "Validation failed",
		Status:  http.StatusBadRequest,
	}

	ErrNotFound = &AppError{
		Code:    "NOT_FOUND",
		Message: "Resource not found",
		Status:  http.StatusNotFound,
	}
)

func New(code, message string, status int) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}
