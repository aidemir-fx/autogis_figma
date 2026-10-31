package errors

import "net/http"

type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return e.Message
}

var (
	ErrUnauthorized       = &AppError{Code: "UNAUTHORIZED", Message: "Unauthorized", Status: http.StatusUnauthorized}
	ErrInvalidToken       = &AppError{Code: "INVALID_TOKEN", Message: "Invalid or expired token", Status: http.StatusUnauthorized}
	ErrInvalidCredentials = &AppError{Code: "INVALID_CREDENTIALS", Message: "Invalid phone or password", Status: http.StatusUnauthorized}
	ErrUserNotFound       = &AppError{Code: "USER_NOT_FOUND", Message: "User not found", Status: http.StatusNotFound}
	ErrUserExists         = &AppError{Code: "USER_EXISTS", Message: "User already exists", Status: http.StatusConflict}
	ErrOrderNotFound      = &AppError{Code: "ORDER_NOT_FOUND", Message: "Order not found", Status: http.StatusNotFound}
	ErrInvalidOrderStatus = &AppError{Code: "INVALID_ORDER_STATUS", Message: "Invalid order status", Status: http.StatusBadRequest}
	ErrValidationFailed   = &AppError{Code: "VALIDATION_FAILED", Message: "Validation failed", Status: http.StatusBadRequest}
	ErrInternalServer     = &AppError{Code: "INTERNAL_SERVER", Message: "Internal server error", Status: http.StatusInternalServerError}
	ErrForbidden          = &AppError{Code: "FORBIDDEN", Message: "Forbidden", Status: http.StatusForbidden}
	ErrNotFound           = &AppError{Code: "NOT_FOUND", Message: "Not found", Status: http.StatusNotFound}
	ErrBadRequest         = &AppError{Code: "BAD_REQUEST", Message: "Bad request", Status: http.StatusBadRequest}
)

func New(code, message string, status int) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}
