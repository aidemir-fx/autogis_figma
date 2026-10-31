package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gmt061/autogis-backend/internal/config"
	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/handler"
	"github.com/gmt061/autogis-backend/internal/middleware"
	"github.com/gmt061/autogis-backend/internal/pkg/jwt"
	"github.com/gmt061/autogis-backend/internal/pkg/ratelimit"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/realtime"
	"github.com/gmt061/autogis-backend/internal/repository"
	"github.com/gmt061/autogis-backend/internal/usecase"
	"github.com/gmt061/autogis-backend/internal/worker"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// shutdownTimeout caps the drain window for in-flight HTTP requests.
// Keep it below orchestrator-level SIGKILL deadlines (systemd default 90s, k8s 30s).
const shutdownTimeout = 25 * time.Second

func main() {
	// Root context is cancelled on SIGINT/SIGTERM. All long-running goroutines
	// (maintenance jobs, HTTP server drain) hang off this context so a single
	// signal drives coordinated shutdown.
	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database. Compose waits for the PostgreSQL healthcheck, but a
	// brief startup race can still happen while PostgreSQL finishes recovery.
	var db *gorm.DB
	for attempt := 1; attempt <= 30; attempt++ {
		db, err = initDB(cfg)
		if err == nil {
			break
		}
		if attempt == 30 {
			log.Fatalf("Failed to initialize database after %d attempts: %v", attempt, err)
		}
		log.Printf("Database is not ready (attempt %d/30): %v; retrying in 2s", attempt, err)
		select {
		case <-time.After(2 * time.Second):
		case <-rootCtx.Done():
			return
		}
	}
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Create repositories
	userRepo := repository.NewUserRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	activityTypeRepo := repository.NewActivityTypeRepository(db)
	userActivityTypeRepo := repository.NewUserActivityTypeRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	chatMessageRepo := repository.NewChatMessageRepository(db)
	masterRepo := repository.NewMasterRepository(db)
	autoWashRepo := repository.NewAutoWashRepository(db)
	autoShopRepo := repository.NewAutoShopRepository(db)
	autoServiceRepo := repository.NewAutoServiceRepository(db)
	professionalApplicationRepo := repository.NewProfessionalApplicationRepository(db)
	mediaRepo := repository.NewMediaRepository(db)
	activityGroupRepo := repository.NewActivityGroupRepository(db)
	activitySubtypeRepo := repository.NewActivitySubtypeRepository(db)
	userActivityProfileRepo := repository.NewUserActivityProfileRepository(db)
	activityAuditLogRepo := repository.NewActivityAuditLogRepository(db)
	catalogRepo := repository.NewCatalogRepository(db)
	storyRepo := repository.NewStoryRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)

	// Create JWT service
	jwtService := jwt.New(cfg.JWTSecret)

	// Initialize S3 client
	s3Client, err := s3client.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize S3 client: %v", err)
	}
	if cfg.S3Endpoint != "" {
		for attempt := 1; attempt <= 30; attempt++ {
			err = s3Client.EnsureBucket(rootCtx, cfg.S3PublicRead)
			if err == nil {
				break
			}
			if attempt == 30 {
				log.Fatalf("Failed to initialize S3 bucket after %d attempts: %v", attempt, err)
			}
			log.Printf("S3 storage is not ready (attempt %d/30): %v; retrying in 2s", attempt, err)
			select {
			case <-time.After(2 * time.Second):
			case <-rootCtx.Done():
				return
			}
		}
	}

	// Story/media processing gets its own file so upload and FFmpeg behaviour can
	// be inspected without filtering the general backend log.
	storyLogger, logErr := storylog.New(cfg.StoryLogPath)
	if logErr != nil {
		log.Printf("Story log is unavailable at %s: %v", cfg.StoryLogPath, logErr)
	} else {
		defer storyLogger.Close()
	}

	// Create media worker pool (starts background goroutines)
	mediaWorker := worker.New(s3Client, mediaRepo, storyLogger)
	defer mediaWorker.Shutdown()

	// Create use cases
	authUseCase := usecase.NewAuthUseCase(userRepo, professionalApplicationRepo, jwtService, cfg.JWTAccessExpire, cfg.JWTRefreshExpire)
	userUseCase := usecase.NewUserUseCase(userRepo, userActivityTypeRepo, professionalApplicationRepo)
	orderUseCase := usecase.NewOrderUseCase(orderRepo, userRepo, activityTypeRepo, userActivityTypeRepo, chatMessageRepo, professionalApplicationRepo, userActivityProfileRepo)
	chatUseCase := usecase.NewChatUseCase(orderRepo, userRepo, chatMessageRepo)
	searchUseCase := usecase.NewSearchUseCase(masterRepo, autoWashRepo, autoShopRepo, autoServiceRepo, userActivityTypeRepo, userRepo, activityTypeRepo)
	activityTypeUseCase := usecase.NewActivityTypeUseCase(activityTypeRepo)
	reviewUseCase := usecase.NewReviewUseCase(reviewRepo, userRepo, orderRepo, masterRepo, autoWashRepo, autoShopRepo, autoServiceRepo)
	masterUseCase := usecase.NewMasterUseCase(
		userRepo, masterRepo, autoWashRepo, autoShopRepo, autoServiceRepo,
		activityTypeRepo, userActivityTypeRepo,
		activityGroupRepo, activitySubtypeRepo, userActivityProfileRepo, activityAuditLogRepo,
	)
	professionalApplicationUseCase := usecase.NewProfessionalApplicationUseCase(
		professionalApplicationRepo,
		userRepo,
		activityGroupRepo,
		activitySubtypeRepo,
	)
	businessApplicationUseCase := usecase.NewBusinessApplicationUseCase(professionalApplicationUseCase, masterUseCase)
	mediaUseCase := usecase.NewMediaUseCase(mediaRepo, orderRepo, s3Client, mediaWorker, storyLogger)
	activityUseCase := usecase.NewActivityUseCase(activityGroupRepo, activitySubtypeRepo)
	catalogUseCase := usecase.NewCatalogUseCase(catalogRepo)
	storyUseCase := usecase.NewStoryUseCase(storyRepo, subscriptionRepo, mediaRepo, mediaUseCase, storyLogger)

	// Create handlers
	authHandler := handler.NewAuthHandler(authUseCase)
	userHandler := handler.NewUserHandler(userUseCase)
	orderHandler := handler.NewOrderHandler(orderUseCase)
	searchHandler := handler.NewSearchHandler(searchUseCase, activityTypeUseCase, reviewUseCase)
	reviewHandler := handler.NewReviewHandler(reviewUseCase)
	masterHandler := handler.NewMasterHandler(masterUseCase)
	businessApplicationHandler := handler.NewBusinessApplicationHandler(businessApplicationUseCase)
	professionalApplicationHandler := handler.NewProfessionalApplicationHandler(professionalApplicationUseCase)
	mediaHandler := handler.NewMediaHandler(mediaUseCase)
	activityHandler := handler.NewActivityHandler(activityUseCase)
	catalogHandler := handler.NewCatalogHandler(catalogUseCase)
	storyHandler := handler.NewStoryHandler(storyUseCase)
	notificationHandler := handler.NewNotificationHandler(db)
	chatHub := realtime.NewHub()
	chatWSHandler := realtime.NewChatWSHandler(chatHub, chatUseCase, jwtService, cfg.FrontendURL)
	chatHandler := handler.NewChatHandler(chatUseCase, chatHub)
	supportChatHandler := handler.NewSupportChatHandler(db, chatHub)
	orderHandler.SetHub(chatHub)

	// Start background maintenance jobs. They honour rootCtx and exit when it's
	// cancelled, so a signal doesn't leak goroutines.
	startMaintenanceJobs(rootCtx, mediaUseCase, professionalApplicationUseCase, storyUseCase)

	// Create Gin router
	router := gin.Default()

	// Apply middleware
	router.Use(middleware.CORSMiddleware(cfg.FrontendURL))

	// Setup routes
	setupRoutes(router, authHandler, userHandler, orderHandler, searchHandler, reviewHandler, masterHandler, chatHandler, chatWSHandler, businessApplicationHandler, professionalApplicationHandler, mediaHandler, activityHandler, catalogHandler, storyHandler, notificationHandler, supportChatHandler, jwtService, professionalApplicationRepo, db)

	// Build the HTTP server explicitly (instead of router.Run) so we can hook
	// into Shutdown() for graceful drain.
	// Read/Write timeouts are intentionally loose because /ws/chat upgrades to
	// a long-lived WebSocket; tight timeouts would kill live chats. Handlers
	// should enforce their own per-request deadlines for heavy work.
	srv := &http.Server{
		Addr:    cfg.Host + ":" + strconv.Itoa(cfg.Port),
		Handler: router,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("Server starting on %s:%d", cfg.Host, cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	// Block until either the server fails outright or we catch a termination signal.
	select {
	case err := <-serverErr:
		if err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	case <-rootCtx.Done():
		log.Printf("Shutdown signal received, draining in-flight requests (timeout: %s)", shutdownTimeout)
	}

	// Phase 1: stop accepting new connections and wait for in-flight handlers
	// to return. New connections get ECONNREFUSED; existing requests keep their
	// DB and S3 access via their own request contexts.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		// Timeout: some handlers didn't finish in time. Log and continue —
		// deferred workers still need to flush.
		log.Printf("HTTP shutdown error: %v", err)
	} else {
		log.Printf("HTTP server stopped cleanly")
	}

	// Phase 2: workers close on deferred mediaWorker.Shutdown() above; maintenance
	// goroutines observe rootCtx cancellation and exit on their next tick.
}

func initDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.GetDSN()
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(25)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	// Run migrations
	if err := runMigrations(db, cfg); err != nil {
		return nil, err
	}

	return db, nil
}

func runMigrations(db *gorm.DB, cfg *config.Config) error {
	if !cfg.EnableRuntimeMigrations {
		log.Printf("Runtime migrations are disabled (ENABLE_RUNTIME_MIGRATIONS=false)")
		return nil
	}

	postgisReady := false
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS postgis").Error; err != nil {
		if cfg.RequirePostGIS {
			return fmt.Errorf("failed to enable postgis extension: %w", err)
		}
		log.Printf("WARNING: PostGIS extension unavailable, continuing in degraded mode: %v", err)
	} else {
		var postgisVersion string
		if err := db.Raw("SELECT postgis_version()").Scan(&postgisVersion).Error; err != nil {
			if cfg.RequirePostGIS {
				return fmt.Errorf("postgis is required but unavailable: %w", err)
			}
			log.Printf("WARNING: PostGIS verification failed, continuing in degraded mode: %v", err)
		} else {
			postgisReady = true
			log.Printf("PostGIS detected: %s", postgisVersion)
		}
	}

	// Auto migrate all models
	err := db.AutoMigrate(
		&domain.User{},
		&domain.Master{},
		&domain.ActivityType{},
		&domain.UserActivityType{},
		&domain.Order{},
		&domain.OrderInvitation{},
		&domain.Review{},
		&domain.ChatMessage{},
		&domain.SupportMessage{},
		&domain.AutoWash{},
		&domain.AutoShop{},
		&domain.AutoService{},
		&domain.BusinessApplication{},
		&domain.ProfessionalApplication{},
		&domain.ProfessionalApplicationRevision{},
		&domain.ModerationCase{},
		&domain.ModerationCaseEvent{},
		&domain.ProfessionalApplicationSchema{},
		&domain.TokenInvalidation{},
		// Activity hierarchy tables (see spec §3).
		&domain.ActivityGroup{},
		&domain.ActivitySubtype{},
		&domain.UserActivityProfile{},
		&domain.ActivityAuditLog{},
		&domain.CatalogProfession{},
		&domain.CatalogService{},
		&domain.VehicleBrand{},
		&domain.VehicleModel{},
		&domain.Story{},
		&domain.StoryFrame{},
		&domain.StoryHighlight{},
		&domain.StoryHighlightStory{},
		&domain.Subscription{},
		&domain.StoryView{},
		&domain.StoryReport{},
		// S3 media tables
		&domain.PendingIntent{},
		&domain.MediaAsset{},
		&domain.MediaDerivative{},
	)
	if err != nil {
		return err
	}
	if err := applyDirectChatMigration(db); err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_order_author
		ON reviews(order_id, from_id)
		WHERE order_id IS NOT NULL
	`).Error; err != nil {
		return fmt.Errorf("review uniqueness migration failed: %w", err)
	}

	// Constraints, которые GORM не умеет декларативно, создаём руками.
	// Идемпотентно: каждый шаг оборачиваем в DROP CONSTRAINT IF EXISTS + ADD.
	if err := applyActivityHierarchyConstraints(db); err != nil {
		return err
	}
	if err := applyBusinessApplicationV2BridgeMigration(db); err != nil {
		return err
	}
	if err := applyProfessionalApplicationMigration(db); err != nil {
		return err
	}
	if err := applyProviderScheduleStatusMigration(db); err != nil {
		return err
	}

	// Migrate working_phone data to contact_number and drop working_phone column
	if db.Migrator().HasColumn(&domain.User{}, "working_phone") {
		// Copy data from working_phone to contact_number if contact_number is empty
		if err := db.Exec("UPDATE users SET contact_number = working_phone WHERE contact_number IS NULL AND working_phone IS NOT NULL").Error; err != nil {
			return err
		}
		// Drop the old column
		err := db.Migrator().DropColumn(&domain.User{}, "working_phone")
		if err != nil {
			return err
		}
	}

	if err := db.Exec(`
		ALTER TABLE masters
		ALTER COLUMN work_from TYPE VARCHAR(5)
		USING CASE
			WHEN work_from IS NULL THEN NULL
			ELSE LEFT(work_from::text, 5)
		END
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		ALTER TABLE masters
		ALTER COLUMN work_to TYPE VARCHAR(5)
		USING CASE
			WHEN work_to IS NULL THEN NULL
			ELSE LEFT(work_to::text, 5)
		END
	`).Error; err != nil {
		return err
	}

	// Spatial indexes for scalable ST_DWithin queries on jsonb coordinates.
	if postgisReady {
		spatialIndexes := []string{
			`CREATE INDEX IF NOT EXISTS idx_masters_coordinates_geog ON masters USING GIST ((ST_SetSRID(ST_MakePoint((coordinates->'coordinates'->>0)::double precision, (coordinates->'coordinates'->>1)::double precision), 4326)::geography))`,
			`CREATE INDEX IF NOT EXISTS idx_auto_washes_coordinates_geog ON auto_washes USING GIST ((ST_SetSRID(ST_MakePoint((coordinates->'coordinates'->>0)::double precision, (coordinates->'coordinates'->>1)::double precision), 4326)::geography))`,
			`CREATE INDEX IF NOT EXISTS idx_auto_shops_coordinates_geog ON auto_shops USING GIST ((ST_SetSRID(ST_MakePoint((coordinates->'coordinates'->>0)::double precision, (coordinates->'coordinates'->>1)::double precision), 4326)::geography))`,
			`CREATE INDEX IF NOT EXISTS idx_auto_services_coordinates_geog ON auto_services USING GIST ((ST_SetSRID(ST_MakePoint((coordinates->'coordinates'->>0)::double precision, (coordinates->'coordinates'->>1)::double precision), 4326)::geography))`,
		}
		for _, sql := range spatialIndexes {
			if err := db.Exec(sql).Error; err != nil {
				return err
			}
		}
	}

	defaultActivityTypes := []string{
		"master",
		"auto_wash",
		"auto_service",
		"auto_shop",
	}

	for _, activityTypeName := range defaultActivityTypes {
		var count int64
		if err := db.Model(&domain.ActivityType{}).Where("name = ?", activityTypeName).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			if err := db.Create(&domain.ActivityType{
				Name:     activityTypeName,
				IsActive: true,
			}).Error; err != nil {
				return err
			}
		}
	}

	// Seed новой иерархии и backfill существующих данных.
	if err := seedActivityHierarchy(db); err != nil {
		return err
	}
	if err := backfillActivityHierarchy(db); err != nil {
		return err
	}
	if err := seedCatalog(db); err != nil {
		return fmt.Errorf("catalog seed failed: %w", err)
	}

	return nil
}

// applyDirectChatMigration makes the chat id stable for a customer/provider pair.
// Older installations used one order id as the chat id, so this also folds those
// historical orders into the same direct conversation without touching messages.
func applyDirectChatMigration(db *gorm.DB) error {
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_orders_direct_chat_pair
			ON orders(customer_id, provider_id, created_at)
	`).Error; err != nil {
		return fmt.Errorf("direct chat index migration failed: %w", err)
	}

	if err := db.Exec(`
		UPDATE orders AS target
		SET chat_id = canonical.chat_id
		FROM (
			SELECT customer_id, provider_id, MIN(chat_id::text)::uuid AS chat_id
			FROM orders
			WHERE provider_id IS NOT NULL AND chat_id IS NOT NULL
			GROUP BY customer_id, provider_id
		) AS canonical
		WHERE target.customer_id = canonical.customer_id
		  AND target.provider_id = canonical.provider_id
		  AND target.chat_id IS DISTINCT FROM canonical.chat_id
	`).Error; err != nil {
		return fmt.Errorf("direct chat data migration failed: %w", err)
	}
	return nil
}

func applyProviderScheduleStatusMigration(db *gorm.DB) error {
	statements := []string{
		`ALTER TABLE masters ALTER COLUMN status SET DEFAULT 'schedule'`,
		`ALTER TABLE masters ALTER COLUMN current_status SET DEFAULT 'unavailable'`,
		`ALTER TABLE auto_washes ALTER COLUMN status SET DEFAULT 'schedule'`,
		`ALTER TABLE auto_shops ALTER COLUMN status SET DEFAULT 'schedule'`,
		`ALTER TABLE auto_services ALTER COLUMN status SET DEFAULT 'schedule'`,
		`UPDATE masters SET status = 'schedule' WHERE status = 'available'`,
		`UPDATE masters SET current_status = 'unavailable' WHERE current_status IN ('available', 'schedule')`,
		`UPDATE auto_washes SET status = 'schedule' WHERE status = 'available'`,
		`UPDATE auto_shops SET status = 'schedule' WHERE status = 'available'`,
		`UPDATE auto_services SET status = 'schedule' WHERE status = 'available'`,
	}
	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("provider schedule status migration failed: %w", err)
		}
	}
	return nil
}

// applyActivityHierarchyConstraints добавляет ограничения БД, которые GORM не выражает
// в struct-тегах: UNIQUE (id, group_id) и композитный FK (subtype_id, group_id), partial
// UNIQUE на is_primary, CHECK allow-list для payments.
//
// Все проверки идемпотентные: если constraint с таким именем уже есть — пропускаем.
// Нельзя слепо DROP + ADD: от UNIQUE(id, group_id) зависит FK fk_uap_subtype_group,
// и DROP сломается с SQLSTATE 2BP01.
func applyActivityHierarchyConstraints(db *gorm.DB) error {
	type constraintDef struct {
		name string
		sql  string
	}
	constraints := []constraintDef{
		{
			name: "uq_activity_subtypes_group_code",
			sql: `ALTER TABLE activity_subtypes
				ADD CONSTRAINT uq_activity_subtypes_group_code UNIQUE (group_id, code)`,
		},
		{
			// UNIQUE (id, group_id) — таргет композитного FK.
			name: "uq_activity_subtypes_id_group",
			sql: `ALTER TABLE activity_subtypes
				ADD CONSTRAINT uq_activity_subtypes_id_group UNIQUE (id, group_id)`,
		},
		{
			// UNIQUE (user_id, activity_group_id, activity_subtype_id) — идемпотентность профилей.
			name: "uq_user_activity_profiles",
			sql: `ALTER TABLE user_activity_profiles
				ADD CONSTRAINT uq_user_activity_profiles
				UNIQUE (user_id, activity_group_id, activity_subtype_id)`,
		},
		{
			// Композитный FK: гарантирует, что subtype принадлежит указанной группе.
			name: "fk_uap_subtype_group",
			sql: `ALTER TABLE user_activity_profiles
				ADD CONSTRAINT fk_uap_subtype_group
				FOREIGN KEY (activity_subtype_id, activity_group_id)
				REFERENCES activity_subtypes(id, group_id)
				ON DELETE RESTRICT`,
		},
		{
			// CHECK allow-list для payments на auto_washes.
			name: "chk_auto_washes_payments_allowed",
			sql: `ALTER TABLE auto_washes
				ADD CONSTRAINT chk_auto_washes_payments_allowed
				CHECK (payments IS NULL OR payments <@ ARRAY['cash','card','qr','sbp','apple_pay','google_pay']::text[])`,
		},
	}

	for _, c := range constraints {
		var exists bool
		if err := db.Raw(
			`SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = ?)`, c.name,
		).Scan(&exists).Error; err != nil {
			return fmt.Errorf("check constraint %s: %w", c.name, err)
		}
		if exists {
			continue
		}
		if err := db.Exec(c.sql).Error; err != nil {
			return fmt.Errorf("add constraint %s: %w", c.name, err)
		}
	}

	// Partial UNIQUE: ровно один primary профиль на пользователя.
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_uap_primary_per_user
			ON user_activity_profiles(user_id)
			WHERE is_primary = TRUE
	`).Error; err != nil {
		return fmt.Errorf("partial unique on user_activity_profiles failed: %w", err)
	}

	return nil
}

func applyBusinessApplicationV2BridgeMigration(db *gorm.DB) error {
	statements := []string{
		`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS activity_group_code VARCHAR(64)`,
		`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS activity_subtype_code VARCHAR(64)`,
		`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(255)`,
		`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS yandex_maps_url TEXT`,
		`ALTER TABLE business_applications ALTER COLUMN business_name DROP NOT NULL`,
		`ALTER TABLE business_applications ALTER COLUMN contact_person DROP NOT NULL`,
		`CREATE INDEX IF NOT EXISTS idx_business_applications_group_status ON business_applications(activity_group_code, status)`,
		`CREATE INDEX IF NOT EXISTS idx_business_applications_subtype_status ON business_applications(activity_subtype_code, status)`,
		`UPDATE business_applications
		 SET activity_group_code = CASE business_type
			WHEN 'auto_service' THEN 'auto_service'
			WHEN 'tire_fitting' THEN 'auto_service'
			WHEN 'detailing' THEN 'auto_service'
			WHEN 'station' THEN 'auto_service'
			WHEN 'auto_wash' THEN 'auto_wash'
			WHEN 'master' THEN 'private_executor'
			ELSE activity_group_code
		 END
		 WHERE activity_group_code IS NULL`,
		`UPDATE business_applications
		 SET activity_subtype_code = CASE business_type
			WHEN 'auto_service' THEN 'general_service'
			WHEN 'tire_fitting' THEN 'tire_fitting'
			WHEN 'detailing' THEN 'detailing'
			WHEN 'station' THEN 'general_service'
			WHEN 'auto_wash' THEN 'classic'
			WHEN 'master' THEN 'master'
			ELSE activity_subtype_code
		 END
		 WHERE activity_subtype_code IS NULL`,
	}

	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}

	return nil
}

// seedActivityHierarchy сидит группы и подтипы с помощью UPSERT (идемпотентно).
// Коды должны совпадать с ожиданиями usecase (resolveActivity, backfill).
func seedActivityHierarchy(db *gorm.DB) error {
	type subtypeSeed struct {
		GroupCode        string
		Code             string
		DisplayName      string
		Description      string
		SortOrder        int
		CabinetSchemaKey string
	}

	groups := []domain.ActivityGroup{
		{Code: "auto_wash", DisplayName: "Автомойка", IsActive: true, SortOrder: 10},
		{Code: "auto_service", DisplayName: "Автосервис", IsActive: true, SortOrder: 20},
		{Code: "private_executor", DisplayName: "Частный исполнитель", IsActive: true, SortOrder: 30},
		{Code: "auto_shop", DisplayName: "Автомагазин", IsActive: true, SortOrder: 40},
	}
	for i := range groups {
		g := groups[i]
		if err := activityGroupUpsert(db, &g); err != nil {
			return err
		}
	}

	// Карта code→id, чтобы resolved вставить подтипы.
	var all []domain.ActivityGroup
	if err := db.Find(&all).Error; err != nil {
		return err
	}
	groupIDByCode := make(map[string]string, len(all))
	for _, g := range all {
		groupIDByCode[g.Code] = g.ID
	}

	subtypes := []subtypeSeed{
		{"auto_wash", "classic", "Классическая мойка", "Ручная мойка с персоналом", 10, "auto_wash.classic"},
		{"auto_wash", "self_service", "Мойка самообслуживания", "Боксы самообслуживания", 20, "auto_wash.self_service"},
		{"auto_wash", "truck_wash", "Мойка грузовиков", "Мойка крупногабаритного транспорта", 30, "auto_wash.truck_wash"},
		{"auto_service", "general_service", "Общий сервис", "Общий авто-ремонт и диагностика", 10, "auto_service.general"},
		{"auto_service", "tire_fitting", "Шиномонтаж", "Шиномонтаж и балансировка", 20, "auto_service.tire_fitting"},
		{"auto_service", "detailing", "Детейлинг", "Полировка, химчистка, керамика", 30, "auto_service.detailing"},
		{"private_executor", "master", "Частный мастер", "Индивидуальный мастер", 10, "private_executor.master"},
		{"private_executor", "washer", "Мойщик", "Мобильный мойщик", 20, "private_executor.washer"},
		{"private_executor", "tire_specialist", "Шиномонтажник", "Мобильный шиномонтажник", 30, "private_executor.tire_specialist"},
		{"auto_shop", "general", "Автомагазин", "Магазин автозапчастей, шин, расходников и автохимии", 10, "auto_shop.general"},
	}
	for _, s := range subtypes {
		gID, ok := groupIDByCode[s.GroupCode]
		if !ok {
			return fmt.Errorf("seed: activity group %q not found", s.GroupCode)
		}
		desc := s.Description
		sub := domain.ActivitySubtype{
			GroupID:          gID,
			Code:             s.Code,
			DisplayName:      s.DisplayName,
			Description:      &desc,
			IsActive:         true,
			SortOrder:        s.SortOrder,
			CabinetSchemaKey: s.CabinetSchemaKey,
		}
		if err := activitySubtypeUpsert(db, &sub); err != nil {
			return err
		}
	}
	return nil
}

func activityGroupUpsert(db *gorm.DB, g *domain.ActivityGroup) error {
	// Используем raw SQL, т.к. в текущем файле нет доступа к репозиторию.
	return db.Exec(`
		INSERT INTO activity_groups (code, display_name, is_active, sort_order, created_at, updated_at)
		VALUES (?, ?, ?, ?, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			is_active    = EXCLUDED.is_active,
			sort_order   = EXCLUDED.sort_order,
			updated_at   = NOW()
	`, g.Code, g.DisplayName, g.IsActive, g.SortOrder).Error
}

func activitySubtypeUpsert(db *gorm.DB, s *domain.ActivitySubtype) error {
	var descr interface{}
	if s.Description != nil {
		descr = *s.Description
	}
	return db.Exec(`
		INSERT INTO activity_subtypes
			(group_id, code, display_name, description, is_active, sort_order, cabinet_schema_key, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		ON CONFLICT (group_id, code) DO UPDATE SET
			display_name       = EXCLUDED.display_name,
			description        = EXCLUDED.description,
			is_active          = EXCLUDED.is_active,
			sort_order         = EXCLUDED.sort_order,
			cabinet_schema_key = EXCLUDED.cabinet_schema_key,
			updated_at         = NOW()
	`, s.GroupID, s.Code, s.DisplayName, descr, s.IsActive, s.SortOrder, s.CabinetSchemaKey).Error
}

// backfillActivityHierarchy — проставляет activity_subtype_id существующим записям
// в auto_washes/auto_services/masters по дефолтам и создаёт первичные user_activity_profiles.
func backfillActivityHierarchy(db *gorm.DB) error {
	backfillProfile := []struct {
		Table     string
		GroupCode string
		Code      string
	}{
		{"auto_washes", "auto_wash", "classic"},
		{"auto_services", "auto_service", "general_service"},
		{"masters", "private_executor", "master"},
	}
	for _, b := range backfillProfile {
		sql := fmt.Sprintf(`
			UPDATE %s t
			SET activity_subtype_id = s.id
			FROM activity_subtypes s
			JOIN activity_groups g ON g.id = s.group_id
			WHERE t.activity_subtype_id IS NULL
			  AND g.code = ?
			  AND s.code = ?
		`, b.Table)
		if err := db.Exec(sql, b.GroupCode, b.Code).Error; err != nil {
			return fmt.Errorf("backfill %s: %w", b.Table, err)
		}
	}

	// Шаг 1: вставляем все профили с is_primary=FALSE, чтобы не конфликтовать с
	// partial unique (uq_uap_primary_per_user). У пользователя с auto_wash + auto_service
	// нельзя одновременно ставить оба как primary в одном INSERT.
	backfillUAP := []string{"auto_washes", "auto_services", "masters"}
	for _, table := range backfillUAP {
		sql := fmt.Sprintf(`
			INSERT INTO user_activity_profiles
				(user_id, activity_group_id, activity_subtype_id, is_primary, created_at, updated_at)
			SELECT t.user_id, s.group_id, s.id, FALSE, NOW(), NOW()
			FROM %s t
			JOIN activity_subtypes s ON s.id = t.activity_subtype_id
			WHERE t.activity_subtype_id IS NOT NULL
			ON CONFLICT (user_id, activity_group_id, activity_subtype_id) DO NOTHING
		`, table)
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("backfill user_activity_profiles from %s: %w", table, err)
		}
	}

	// Шаг 2: для каждого пользователя без primary выбираем самый ранний профиль
	// и помечаем его primary. DISTINCT ON гарантирует ровно один профиль на пользователя.
	if err := db.Exec(`
		UPDATE user_activity_profiles
		SET is_primary = TRUE, updated_at = NOW()
		WHERE id IN (
			SELECT DISTINCT ON (user_id) id
			FROM user_activity_profiles
			WHERE user_id NOT IN (
				SELECT user_id FROM user_activity_profiles WHERE is_primary = TRUE
			)
			ORDER BY user_id, created_at ASC, id ASC
		)
	`).Error; err != nil {
		return fmt.Errorf("promote primary user_activity_profiles: %w", err)
	}
	return nil
}

// startMaintenanceJobs launches periodic background tasks. They exit when parent
// is cancelled (typically on SIGINT/SIGTERM), so shutdown doesn't leak goroutines
// or leave half-run DB transactions behind.
func startMaintenanceJobs(
	parent context.Context,
	mediaUseCase *usecase.MediaUseCase,
	professionalApplicationUseCase *usecase.ProfessionalApplicationUseCase,
	storyUseCase *usecase.StoryUseCase,
) {
	// Remove expired stories and their image objects from PostgreSQL and S3.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-parent.Done():
				log.Printf("[maintenance] cleanup-stories stopping")
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(parent, 5*time.Minute)
				if err := storyUseCase.CleanupExpiredStories(ctx); err != nil {
					log.Printf("[maintenance] cleanup expired stories: %v", err)
				}
				cancel()
			}
		}
	}()

	// Cleanup expired intents every 10 minutes.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-parent.Done():
				log.Printf("[maintenance] cleanup-intents stopping")
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(parent, 30*time.Second)
				if err := mediaUseCase.CleanupExpiredIntents(ctx); err != nil {
					log.Printf("[maintenance] cleanup expired intents: %v", err)
				}
				cancel()
			}
		}
	}()

	// Hard delete assets after grace period, runs once per hour.
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-parent.Done():
				log.Printf("[maintenance] hard-delete stopping")
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(parent, 5*time.Minute)
				if err := mediaUseCase.RunHardDeleteJob(ctx); err != nil {
					log.Printf("[maintenance] hard delete job: %v", err)
				}
				cancel()
			}
		}
	}()

	// Requeue image processing jobs that were lost on process restart or queue overflow.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-parent.Done():
				log.Printf("[maintenance] requeue-media stopping")
				return
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(parent, time.Minute)
				requeued, err := mediaUseCase.RequeueStaleProcessingJobs(ctx, 15*time.Minute, 100)
				if err != nil {
					log.Printf("[maintenance] requeue stale media jobs: %v", err)
				} else if requeued > 0 {
					log.Printf("[maintenance] requeued stale media jobs=%d", requeued)
				}
				cancel()
			}
		}
	}()

	// Auto-release moderation cases left in review for more than 24 hours.
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-parent.Done():
				log.Printf("[maintenance] moderation auto-release stopping")
				return
			case <-ticker.C:
				if professionalApplicationUseCase == nil {
					continue
				}
				ctx, cancel := context.WithTimeout(parent, 2*time.Minute)
				released, err := professionalApplicationUseCase.AutoReleaseExpiredReviews(ctx)
				if err != nil {
					log.Printf("[maintenance] moderation auto-release: %v", err)
				} else if released > 0 {
					log.Printf("[maintenance] moderation auto-release released=%d", released)
				}
				cancel()
			}
		}
	}()
}

func setupRoutes(
	router *gin.Engine,
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	orderHandler *handler.OrderHandler,
	searchHandler *handler.SearchHandler,
	reviewHandler *handler.ReviewHandler,
	masterHandler *handler.MasterHandler,
	chatHandler *handler.ChatHandler,
	chatWSHandler *realtime.ChatWSHandler,
	businessApplicationHandler *handler.BusinessApplicationHandler,
	professionalApplicationHandler *handler.ProfessionalApplicationHandler,
	mediaHandler *handler.MediaHandler,
	activityHandler *handler.ActivityHandler,
	catalogHandler *handler.CatalogHandler,
	storyHandler *handler.StoryHandler,
	notificationHandler *handler.NotificationHandler,
	supportChatHandler *handler.SupportChatHandler,
	jwtService *jwt.JWTService,
	professionalApplicationRepo repository.ProfessionalApplicationRepository,
	db *gorm.DB,
) {
	healthHandler := func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
	router.GET("/healthz", healthHandler)
	router.HEAD("/healthz", healthHandler)
	router.GET("/readyz", func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		if err := sqlDB.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	router.GET("/ws/chat", chatWSHandler.Serve)

	// Public activity hierarchy references (кэшируется ETag, см. spec §10.2).
	activityRefGroup := router.Group("/api/activity-groups")
	{
		activityRefGroup.GET("", activityHandler.GetActivityGroups)
		activityRefGroup.GET("/:groupCode/subtypes", activityHandler.GetActivitySubtypes)
	}

	catalogGroup := router.Group("/api/catalog")
	{
		catalogGroup.GET("/professions", catalogHandler.ListProfessions)
		catalogGroup.GET("/services", catalogHandler.ListServices)
		catalogGroup.GET("/vehicle-brands", catalogHandler.ListVehicleBrands)
	}

	// Public profile stories are visible when a user opens a professional profile.
	// The protected home feed contains all active professional stories for now;
	// subscription-based filtering can be enabled later when the audience grows.
	storyPublicGroup := router.Group("/api/stories")
	{
		storyPublicGroup.GET("/author/:authorId", storyHandler.GetAuthorStories)
		storyPublicGroup.GET("/highlights/author/:authorId", storyHandler.GetAuthorHighlights)
	}

	// Public routes
	// Rate-limit auth endpoints to mitigate brute-force / credential stuffing.
	// login/register: 10 attempts / 5 minutes per client IP.
	// refresh:        60 attempts / 1 minute  per client IP (legitimate clients may refresh bursty).
	authAttemptLimiter := ratelimit.New(10, 5*time.Minute)
	authRefreshLimiter := ratelimit.New(60, time.Minute)
	authGroup := router.Group("/api/auth")
	{
		authGroup.POST("/register",
			middleware.RateLimit(authAttemptLimiter, middleware.ClientIPKey),
			authHandler.Register,
		)
		authGroup.POST("/login",
			middleware.RateLimit(authAttemptLimiter, middleware.ClientIPKey),
			authHandler.Login,
		)
		authGroup.POST("/refresh",
			middleware.RateLimit(authRefreshLimiter, middleware.ClientIPKey),
			authHandler.RefreshToken,
		)
	}

	// Search routes (public)
	searchGroup := router.Group("/api/search")
	{
		searchGroup.POST("/providers", searchHandler.FindCombinedProviders)
		searchGroup.GET("/combined", searchHandler.FindCombinedProvidersQuery)
		searchGroup.GET("/provider/:activityType/:id", searchHandler.GetProviderByTypeAndID)
		searchGroup.GET("/activity-types", searchHandler.GetActivityTypes)
	}

	masterPublicGroup := router.Group("/api/masters")
	{
		masterPublicGroup.GET("", masterHandler.GetAllMasters)
		masterPublicGroup.GET("/:id", masterHandler.GetMasterByID)
	}

	// Provider reviews are public, just like provider profiles.
	router.GET("/api/reviews/:toId", reviewHandler.GetReviewsByToID)

	// Public media read proxy for media used in provider cards.
	router.GET("/api/v1/media/files/*key", mediaHandler.ServeFile)

	// Protected routes
	apiGroup := router.Group("/api")
	apiGroup.Use(middleware.JWTMiddleware(jwtService, professionalApplicationRepo))
	{
		// User routes
		userGroup := apiGroup.Group("/users")
		{
			userGroup.PUT("/profile", userHandler.UpdateCurrentUserProfile)
			userGroup.PUT("/profile/me", userHandler.UpdateCurrentUserProfile)
			userGroup.GET("/profile/me", userHandler.GetCurrentUser)
			userGroup.GET("/activity-types/me", userHandler.GetCurrentUserActivityTypes)
			userGroup.POST("/professional/activate", userHandler.ActivateProfessional)
			userGroup.GET("/:id", userHandler.GetUser)
			userGroup.PUT("/:id", userHandler.UpdateUser)
			userGroup.PUT("/:id/role", userHandler.UpdateUserRole)
			userGroup.GET("", userHandler.GetAllUsers)
		}

		// Notification routes
		apiGroup.GET("/notifications", notificationHandler.GetNotifications)
		apiGroup.POST("/notifications", notificationHandler.CreateNotification)
		apiGroup.DELETE("/notifications/:id", notificationHandler.DeleteNotification)
		apiGroup.DELETE("/notifications", notificationHandler.ClearAllNotifications)

		// Support Chat routes
		apiGroup.GET("/support/chat", supportChatHandler.GetMyChat)
		apiGroup.POST("/support/chat", supportChatHandler.SendMessage)
		apiGroup.GET("/support/chats", supportChatHandler.GetAllChats)
		apiGroup.GET("/support/unread-count", supportChatHandler.GetUnreadCount)

		apiGroup.GET("/activity-types", searchHandler.GetActivityTypes)
		apiGroup.GET("/user-activity-types/my", userHandler.GetCurrentUserActivityTypes)

		storyGroup := apiGroup.Group("/stories")
		{
			storyGroup.GET("/home", storyHandler.GetHomeFeed)
			storyGroup.POST("", storyHandler.Create)
			storyGroup.DELETE("/:storyId", storyHandler.Delete)
			storyGroup.POST("/:storyId/highlight", storyHandler.AddToHighlight)
			storyGroup.DELETE("/:storyId/highlight/:highlightId", storyHandler.RemoveFromHighlight)
			storyGroup.POST("/:storyId/view", storyHandler.View)
			storyGroup.POST("/:storyId/report", storyHandler.Report)
		}

		subscriptionGroup := apiGroup.Group("/subscriptions")
		{
			subscriptionGroup.GET("/me", storyHandler.GetMySubscriptionStats)
			subscriptionGroup.GET("/:authorId", storyHandler.IsFollowing)
			subscriptionGroup.POST("/:authorId", storyHandler.Follow)
			subscriptionGroup.DELETE("/:authorId", storyHandler.Unfollow)
		}

		// Order routes
		orderGroup := apiGroup.Group("/orders")
		{
			orderGroup.POST("", orderHandler.CreateOrder)
			orderGroup.POST("/:id/accept", orderHandler.AcceptInvitation)
			orderGroup.GET("/my", orderHandler.GetMyCustomerOrders)
			orderGroup.GET("/provider", orderHandler.GetMyProviderOrders)
			orderGroup.GET("/:id", orderHandler.GetOrder)
			orderGroup.GET("/customer/:customerId", orderHandler.GetCustomerOrders)
			orderGroup.GET("/provider/:providerId", orderHandler.GetProviderOrders)
			orderGroup.PUT("/:id/status", orderHandler.UpdateOrderStatus)
			orderGroup.POST("/:id/review", reviewHandler.CreateOrderReview)
			orderGroup.GET("/:id/review", reviewHandler.GetMyReviewForOrder)
			orderGroup.PUT("/:id/review", reviewHandler.UpdateOrderReview)
			orderGroup.DELETE("/:id/review", reviewHandler.DeleteOrderReview)
			orderGroup.DELETE("/:id", orderHandler.DeleteOrder)
		}

		chatGroup := apiGroup.Group("/chat-messages")
		{
			chatGroup.GET("/unread-count", chatHandler.GetUnreadCounts)
			chatGroup.GET("/order/:orderId", chatHandler.GetOrderChat)
			chatGroup.POST("/order/:orderId", chatHandler.SendOrderMessage)
		}

		// Review routes
		reviewGroup := apiGroup.Group("/reviews")
		{
			reviewGroup.POST("", reviewHandler.CreateReview)
		}

		// Activity Type routes (admin)
		activityTypeGroup := apiGroup.Group("/activity-types")
		{
			activityTypeGroup.POST("", searchHandler.CreateActivityType)
		}

		// Master activity registration and management
		masterGroup := apiGroup.Group("/masters")
		{
			masterGroup.POST("/register", masterHandler.RegisterActivity)
			masterGroup.GET("/profile/me", masterHandler.GetMasterProfile)
			masterGroup.PUT("/profile/me", masterHandler.UpdateMasterProfile)
			masterGroup.PATCH("/profile/me/status", masterHandler.UpdateMasterStatus)
		}

		autoServiceGroup := apiGroup.Group("/auto_services")
		{
			autoServiceGroup.GET("/profile/me", masterHandler.GetAutoServiceProfile)
			autoServiceGroup.PUT("/profile/me", masterHandler.UpdateAutoServiceProfile)
			autoServiceGroup.PUT("/status", masterHandler.UpdateAutoServiceStatus)
		}

		autoShopGroup := apiGroup.Group("/auto_shops")
		{
			autoShopGroup.GET("/profile/me", masterHandler.GetAutoShopProfile)
			autoShopGroup.PUT("/profile/me", masterHandler.UpdateAutoShopProfile)
			autoShopGroup.PUT("/status", masterHandler.UpdateAutoShopStatus)
			autoShopGroup.GET("/additional-services", masterHandler.GetAutoShopAdditionalServices)
		}

		businessApplicationGroup := apiGroup.Group("/business-applications")
		{
			businessApplicationGroup.POST("", businessApplicationHandler.Submit)
			businessApplicationGroup.GET("/me", businessApplicationHandler.GetMyLatest)
			businessApplicationGroup.GET("", businessApplicationHandler.GetAll)
			businessApplicationGroup.PATCH("/:id/status", businessApplicationHandler.UpdateStatus)
		}

		professionalApplicationSchemaGroup := apiGroup.Group("/professional-application-schemas")
		{
			professionalApplicationSchemaGroup.GET("/:schemaKey/active", professionalApplicationHandler.GetActiveSchema)
		}

		submitLimiter := ratelimit.New(3, time.Hour)
		resubmitLimiter := ratelimit.New(5, time.Hour)
		professionalApplicationGroup := apiGroup.Group("/professional-applications")
		{
			professionalApplicationGroup.POST("",
				middleware.RateLimit(submitLimiter, func(c *gin.Context) string {
					return "user:" + c.GetString("user_id")
				}),
				professionalApplicationHandler.Submit,
			)
			professionalApplicationGroup.GET("/me", professionalApplicationHandler.GetMine)
			professionalApplicationGroup.POST("/:id/resubmit",
				middleware.RateLimit(resubmitLimiter, func(c *gin.Context) string {
					return "user:" + c.GetString("user_id")
				}),
				professionalApplicationHandler.Resubmit,
			)
		}

		adminGroup := apiGroup.Group("/admin")
		{
			adminUserGroup := adminGroup.Group("/users")
			{
				adminUserGroup.PATCH("/:id/role", userHandler.UpdateUserRole)
				adminUserGroup.PATCH("/:id/professional-status", userHandler.UpdateProfessionalStatus)
			}

			adminModerationGroup := adminGroup.Group("/moderation")
			{
				adminModerationGroup.GET("/cases", professionalApplicationHandler.ListModerationCases)
				adminModerationGroup.GET("/cases/:caseId", professionalApplicationHandler.GetModerationCaseDetail)
				adminModerationGroup.POST("/cases/:caseId/assign", professionalApplicationHandler.AssignModerationCase)
				adminModerationGroup.POST("/cases/:caseId/release", professionalApplicationHandler.ReleaseModerationCase)
			}

			adminGroup.POST("/professional-applications/:id/decision", professionalApplicationHandler.Decide)
			adminGroup.GET("/stories/reports", storyHandler.ListReports)
		}

		autoWashGroup := apiGroup.Group("/auto_washes")
		{
			autoWashGroup.GET("/profile/me", masterHandler.GetAutoWashProfile)
			autoWashGroup.PUT("/profile/me", masterHandler.UpdateAutoWashProfile)
			autoWashGroup.PUT("/status", masterHandler.UpdateAutoWashStatus)
			autoWashGroup.GET("/additional-services", masterHandler.GetAutoWashAdditionalServices)
		}

		// Media routes (v1)
		mediaGroup := apiGroup.Group("/v1/media")
		{
			mediaGroup.POST("/upload-intent", mediaHandler.CreateUploadIntent)
			mediaGroup.POST("/upload", mediaHandler.UploadFile)
			mediaGroup.POST("/confirm-upload", mediaHandler.ConfirmUpload)
			mediaGroup.GET("/assets/:assetId", mediaHandler.GetAsset)
			mediaGroup.DELETE("/assets/:assetId", mediaHandler.DeleteAsset)
			// List media for entity — auth required but accessible by any authenticated user
			mediaGroup.GET("/:entityType/:entityId", mediaHandler.GetAssetsByEntity)
		}
	}
}
