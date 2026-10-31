package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/ratelimit"
)

// KeyFunc derives the rate-limit key from the request.
type KeyFunc func(c *gin.Context) string

// ClientIPKey returns the client IP address as the key.
// Uses gin's ClientIP() which respects X-Forwarded-For when configured.
func ClientIPKey(c *gin.Context) string {
	return "ip:" + c.ClientIP()
}

// PhoneOrIPKey returns a key that combines IP with the "phone" field from the
// JSON body when present. Falls back to IP-only when body is empty or not JSON.
// Useful for auth endpoints to rate-limit per-login-attempt rather than per-IP
// only (prevents attacker with many IPs from exhausting one account quickly).
func PhoneOrIPKey(c *gin.Context) string {
	ip := c.ClientIP()
	phone := strings.TrimSpace(c.GetString("rl_phone"))
	if phone == "" {
		return "ip:" + ip
	}
	return "ip:" + ip + "|phone:" + phone
}

// RateLimit builds a middleware that blocks requests exceeding the limiter.
// Returns 429 with a standard error payload when the limit is exceeded.
func RateLimit(limiter *ratelimit.Limiter, keyFn KeyFunc) gin.HandlerFunc {
	if keyFn == nil {
		keyFn = ClientIPKey
	}
	return func(c *gin.Context) {
		key := keyFn(c)
		if !limiter.Allow(key) {
			c.JSON(http.StatusTooManyRequests, apperrors.New(
				"RATE_LIMIT_EXCEEDED",
				"Слишком много попыток. Попробуйте позже.",
				http.StatusTooManyRequests,
			))
			c.Abort()
			return
		}
		c.Next()
	}
}
