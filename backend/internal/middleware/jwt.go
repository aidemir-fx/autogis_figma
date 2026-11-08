package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/jwt"
	"github.com/gmt061/autogis-backend/internal/repository"
)

func JWTMiddleware(
	jwtService *jwt.JWTService,
	professionalApplicationRepo repository.ProfessionalApplicationRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, apperrors.ErrUnauthorized)
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, apperrors.ErrInvalidToken)
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, apperrors.ErrInvalidToken)
			c.Abort()
			return
		}
		if professionalApplicationRepo != nil {
			invalidation, err := professionalApplicationRepo.GetTokenInvalidation(c.Request.Context(), claims.UserID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, apperrors.ErrInternalServer)
				c.Abort()
				return
			}
			if invalidation != nil && claims.IssuedAt != nil && claims.IssuedAt.Time.Before(invalidation.InvalidatedAt) {
				c.JSON(http.StatusUnauthorized, apperrors.ErrInvalidToken)
				c.Abort()
				return
			}
		}

		// Add user info to context
		c.Set("user_id", claims.UserID)
		c.Set("phone", claims.Phone)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func CORSMiddleware(frontendURL string) gin.HandlerFunc {
	allowedOrigins := buildAllowedOrigins(frontendURL)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowedOrigins[origin]; ok || isNgrokOrigin(origin) {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func isNgrokOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	return err == nil && parsed.Scheme == "https" && strings.HasSuffix(parsed.Hostname(), ".ngrok-free.dev")
}

func buildAllowedOrigins(frontendURL string) map[string]struct{} {
	allowed := map[string]struct{}{
		"http://localhost:5173": {},
		"http://127.0.0.1:5173": {},
	}
	if frontendURL == "" {
		return allowed
	}

	allowed[frontendURL] = struct{}{}
	if parsed, err := url.Parse(frontendURL); err == nil {
		host := parsed.Hostname()
		port := parsed.Port()
		switch host {
		case "localhost":
			allowed[parsed.Scheme+"://127.0.0.1:"+port] = struct{}{}
		case "127.0.0.1":
			allowed[parsed.Scheme+"://localhost:"+port] = struct{}{}
		}
	}

	return allowed
}
