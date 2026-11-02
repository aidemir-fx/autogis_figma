package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port int
	Host string

	// Database
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// JWT
	JWTSecret        string
	JWTAccessExpire  int // minutes
	JWTRefreshExpire int // hours

	// Environment
	Environment string

	// Yandex Maps reverse geocoding
	YandexMapsAPIKey string

	// Frontend URL for CORS
	FrontendURL string

	// Feature flags
	RequirePostGIS          bool
	EnableRuntimeMigrations bool

	// S3 / Media storage
	S3Bucket          string
	S3Region          string
	S3Endpoint        string // custom endpoint for dev (MinIO / LocalStack); empty = use AWS
	S3UseSSL          bool   // use HTTPS for S3 endpoint
	S3PublicEndpoint  string // public endpoint used when generating browser presigned URLs
	S3PublicRead      bool   // allow anonymous GETs for locally hosted media
	S3AccessKeyID     string // leave empty to use IAM role in production
	S3SecretAccessKey string
	S3KMSKeyID        string // ARN of CMK; empty = no SSE-KMS (dev only)
	CDNBaseURL        string // e.g. https://media.example.com
	StoryLogPath      string // separate Story/media processing log
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:                    parseInt(os.Getenv("PORT"), 3001),
		Host:                    os.Getenv("HOST"),
		DBHost:                  os.Getenv("DB_HOST"),
		DBPort:                  parseInt(os.Getenv("DB_PORT"), 5432),
		DBUser:                  os.Getenv("DB_USERNAME"),
		DBPassword:              os.Getenv("DB_PASSWORD"),
		DBName:                  os.Getenv("DB_NAME"),
		DBSSLMode:               getOrDefault(os.Getenv("DB_SSLMODE"), "disable"),
		JWTSecret:               os.Getenv("JWT_SECRET"),
		JWTAccessExpire:         parseInt(os.Getenv("JWT_ACCESS_EXPIRE"), 15),
		JWTRefreshExpire:        parseInt(os.Getenv("JWT_REFRESH_EXPIRE"), 24),
		Environment:             getOrDefault(os.Getenv("ENVIRONMENT"), "development"),
		YandexMapsAPIKey:        getFirstNonEmpty(os.Getenv("YANDEX_MAPS_API_KEY"), os.Getenv("VITE_YMAPS_API_KEY")),
		FrontendURL:             os.Getenv("FRONTEND_URL"),
		RequirePostGIS:          parseBool(os.Getenv("REQUIRE_POSTGIS"), false),
		EnableRuntimeMigrations: parseBool(os.Getenv("ENABLE_RUNTIME_MIGRATIONS"), false),

		// S3 / Media
		S3Bucket:          getOrDefault(os.Getenv("S3_BUCKET"), "autogis-media-dev"),
		S3Region:          getOrDefault(os.Getenv("S3_REGION"), "us-east-1"),
		S3Endpoint:        os.Getenv("S3_ENDPOINT"),
		S3UseSSL:          parseBool(os.Getenv("S3_USE_SSL"), false),
		S3PublicEndpoint:  os.Getenv("S3_PUBLIC_ENDPOINT"),
		S3PublicRead:      parseBool(os.Getenv("S3_PUBLIC_READ"), false),
		S3AccessKeyID:     os.Getenv("S3_ACCESS_KEY"),
		S3SecretAccessKey: os.Getenv("S3_SECRET_KEY"),
		S3KMSKeyID:        os.Getenv("S3_KMS_KEY_ID"),
		CDNBaseURL:        getOrDefault(os.Getenv("CDN_BASE_URL"), "http://localhost:9000/autogis-media-dev"),
		StoryLogPath:      getOrDefault(os.Getenv("STORIES_LOG_PATH"), "runtime-logs/stories.log"),
	}

	if cfg.JWTSecret == "" {
		if cfg.Environment == "production" {
			return nil, fmt.Errorf("JWT_SECRET is required in production")
		}
		cfg.JWTSecret = generateDevJWTSecret()
	}

	if cfg.FrontendURL == "" {
		cfg.FrontendURL = "http://localhost:5173"
	}

	return cfg, nil
}

func generateDevJWTSecret() string {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "dev-fallback-secret-change-me"
	}
	return base64.RawURLEncoding.EncodeToString(secret)
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost,
		c.DBPort,
		c.DBUser,
		c.DBPassword,
		c.DBName,
		c.DBSSLMode,
	)
}

func parseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return v
}

func getOrDefault(s, defaultVal string) string {
	if s == "" {
		return defaultVal
	}
	return s
}

func getFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func parseBool(s string, defaultVal bool) bool {
	if s == "" {
		return defaultVal
	}
	switch s {
	case "1", "true", "TRUE", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "no", "NO", "off", "OFF":
		return false
	default:
		return defaultVal
	}
}
