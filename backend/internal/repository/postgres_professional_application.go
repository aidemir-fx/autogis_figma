package repository

import (
	"context"
	"errors"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ModerationCaseListRow struct {
	ID                   string
	Domain               string
	SubjectID            string
	QueueStatus          domain.ModerationQueueStatus
	DecisionStatus       domain.ProfessionalApplicationStatus
	Priority             domain.ModerationPriority
	AssigneeUserID       *string
	AssigneeDisplayName  *string
	ReviewTakenAt        *time.Time
	OpenedAt             time.Time
	LastActivityAt       time.Time
	ResolvedAt           *time.Time
	CreatedAt            time.Time
	ApplicantDisplayName string
	ActivityGroupCode    *string
	ActivitySubtypeCode  *string
	ContactPhone         *string
	ContactEmail         *string
}

type ModerationCaseEventRow struct {
	ID                 string
	CaseID             string
	ActorUserID        string
	ActorDisplayName   *string
	EventType          domain.ModerationCaseEventType
	FromQueueStatus    *domain.ModerationQueueStatus
	ToQueueStatus      *domain.ModerationQueueStatus
	FromDecisionStatus *domain.ProfessionalApplicationStatus
	ToDecisionStatus   *domain.ProfessionalApplicationStatus
	Comment            *string
	CreatedAt          time.Time
}

type ProfessionalApplicationRepository interface {
	RunInTx(ctx context.Context, fn func(repo ProfessionalApplicationRepository) error) error
	GetActiveSchema(ctx context.Context, schemaKey string) (*domain.ProfessionalApplicationSchema, error)
	GetSchema(ctx context.Context, schemaKey string, schemaVersion int) (*domain.ProfessionalApplicationSchema, error)
	CreateApplication(ctx context.Context, app *domain.ProfessionalApplication) error
	UpdateApplication(ctx context.Context, app *domain.ProfessionalApplication) error
	GetApplicationByID(ctx context.Context, id string) (*domain.ProfessionalApplication, error)
	GetLatestApplicationByUserID(ctx context.Context, userID string) (*domain.ProfessionalApplication, error)
	ListApplicationsByUserID(ctx context.Context, userID string) ([]*domain.ProfessionalApplication, error)
	ListApplications(ctx context.Context) ([]*domain.ProfessionalApplication, error)
	CreateRevision(ctx context.Context, revision *domain.ProfessionalApplicationRevision) error
	GetRevisionByID(ctx context.Context, id string) (*domain.ProfessionalApplicationRevision, error)
	GetLatestRevisionByApplicationID(ctx context.Context, applicationID string) (*domain.ProfessionalApplicationRevision, error)
	ListRevisionsByApplicationID(ctx context.Context, applicationID string) ([]*domain.ProfessionalApplicationRevision, error)
	CountRevisionsByApplicationID(ctx context.Context, applicationID string) (int64, error)
	CreateCase(ctx context.Context, moderationCase *domain.ModerationCase) error
	UpdateCase(ctx context.Context, moderationCase *domain.ModerationCase) error
	GetCaseByID(ctx context.Context, id string) (*domain.ModerationCase, error)
	GetCaseBySubjectID(ctx context.Context, domainName, subjectID string) (*domain.ModerationCase, error)
	ListCaseRows(ctx context.Context, filters domain.ModerationCasesListFilters) ([]*ModerationCaseListRow, int64, error)
	ListStaleReviewCases(ctx context.Context, before time.Time, limit int) ([]*domain.ModerationCase, error)
	CreateCaseEvent(ctx context.Context, event *domain.ModerationCaseEvent) error
	ListCaseEventsByCaseID(ctx context.Context, caseID string) ([]*domain.ModerationCaseEvent, error)
	ListCaseEventRows(ctx context.Context, caseID string) ([]*ModerationCaseEventRow, error)
	GetTokenInvalidation(ctx context.Context, userID string) (*domain.TokenInvalidation, error)
	UpsertTokenInvalidation(ctx context.Context, invalidation *domain.TokenInvalidation) error
}

type ProfessionalApplicationRepositoryImpl struct {
	db *gorm.DB
}

func NewProfessionalApplicationRepository(db *gorm.DB) ProfessionalApplicationRepository {
	return &ProfessionalApplicationRepositoryImpl{db: db}
}

func (r *ProfessionalApplicationRepositoryImpl) RunInTx(ctx context.Context, fn func(repo ProfessionalApplicationRepository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(&ProfessionalApplicationRepositoryImpl{db: tx})
	})
}

func (r *ProfessionalApplicationRepositoryImpl) GetActiveSchema(ctx context.Context, schemaKey string) (*domain.ProfessionalApplicationSchema, error) {
	var schema domain.ProfessionalApplicationSchema
	err := r.db.WithContext(ctx).
		Where("schema_key = ? AND is_active = ?", schemaKey, true).
		Order("schema_version DESC").
		First(&schema).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &schema, nil
}

func (r *ProfessionalApplicationRepositoryImpl) GetSchema(ctx context.Context, schemaKey string, schemaVersion int) (*domain.ProfessionalApplicationSchema, error) {
	var schema domain.ProfessionalApplicationSchema
	err := r.db.WithContext(ctx).
		Where("schema_key = ? AND schema_version = ?", schemaKey, schemaVersion).
		First(&schema).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &schema, nil
}

func (r *ProfessionalApplicationRepositoryImpl) CreateApplication(ctx context.Context, app *domain.ProfessionalApplication) error {
	return r.db.WithContext(ctx).Create(app).Error
}

func (r *ProfessionalApplicationRepositoryImpl) UpdateApplication(ctx context.Context, app *domain.ProfessionalApplication) error {
	return r.db.WithContext(ctx).Save(app).Error
}

func (r *ProfessionalApplicationRepositoryImpl) GetApplicationByID(ctx context.Context, id string) (*domain.ProfessionalApplication, error) {
	var app domain.ProfessionalApplication
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&app).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *ProfessionalApplicationRepositoryImpl) GetLatestApplicationByUserID(ctx context.Context, userID string) (*domain.ProfessionalApplication, error) {
	var app domain.ProfessionalApplication
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("last_submission_at DESC, created_at DESC").
		First(&app).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *ProfessionalApplicationRepositoryImpl) ListApplicationsByUserID(ctx context.Context, userID string) ([]*domain.ProfessionalApplication, error) {
	var apps []*domain.ProfessionalApplication
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("last_submission_at DESC, created_at DESC").
		Find(&apps).Error
	return apps, err
}

func (r *ProfessionalApplicationRepositoryImpl) ListApplications(ctx context.Context) ([]*domain.ProfessionalApplication, error) {
	var apps []*domain.ProfessionalApplication
	err := r.db.WithContext(ctx).
		Order("last_submission_at DESC, created_at DESC").
		Find(&apps).Error
	return apps, err
}

func (r *ProfessionalApplicationRepositoryImpl) CreateRevision(ctx context.Context, revision *domain.ProfessionalApplicationRevision) error {
	return r.db.WithContext(ctx).Create(revision).Error
}

func (r *ProfessionalApplicationRepositoryImpl) GetRevisionByID(ctx context.Context, id string) (*domain.ProfessionalApplicationRevision, error) {
	var revision domain.ProfessionalApplicationRevision
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&revision).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &revision, nil
}

func (r *ProfessionalApplicationRepositoryImpl) GetLatestRevisionByApplicationID(ctx context.Context, applicationID string) (*domain.ProfessionalApplicationRevision, error) {
	var revision domain.ProfessionalApplicationRevision
	err := r.db.WithContext(ctx).
		Where("application_id = ?", applicationID).
		Order("revision_no DESC, created_at DESC").
		First(&revision).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &revision, nil
}

func (r *ProfessionalApplicationRepositoryImpl) ListRevisionsByApplicationID(ctx context.Context, applicationID string) ([]*domain.ProfessionalApplicationRevision, error) {
	var revisions []*domain.ProfessionalApplicationRevision
	err := r.db.WithContext(ctx).
		Where("application_id = ?", applicationID).
		Order("revision_no DESC, created_at DESC").
		Find(&revisions).Error
	return revisions, err
}

func (r *ProfessionalApplicationRepositoryImpl) CountRevisionsByApplicationID(ctx context.Context, applicationID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.ProfessionalApplicationRevision{}).
		Where("application_id = ?", applicationID).
		Count(&count).Error
	return count, err
}

func (r *ProfessionalApplicationRepositoryImpl) CreateCase(ctx context.Context, moderationCase *domain.ModerationCase) error {
	return r.db.WithContext(ctx).Create(moderationCase).Error
}

func (r *ProfessionalApplicationRepositoryImpl) UpdateCase(ctx context.Context, moderationCase *domain.ModerationCase) error {
	return r.db.WithContext(ctx).Save(moderationCase).Error
}

func (r *ProfessionalApplicationRepositoryImpl) GetCaseByID(ctx context.Context, id string) (*domain.ModerationCase, error) {
	var moderationCase domain.ModerationCase
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&moderationCase).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &moderationCase, nil
}

func (r *ProfessionalApplicationRepositoryImpl) GetCaseBySubjectID(ctx context.Context, domainName, subjectID string) (*domain.ModerationCase, error) {
	var moderationCase domain.ModerationCase
	err := r.db.WithContext(ctx).
		Where("domain = ? AND subject_id = ?", domainName, subjectID).
		First(&moderationCase).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &moderationCase, nil
}

func (r *ProfessionalApplicationRepositoryImpl) ListCaseRows(ctx context.Context, filters domain.ModerationCasesListFilters) ([]*ModerationCaseListRow, int64, error) {
	limit := filters.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	base := r.db.WithContext(ctx).
		Table("moderation_cases AS mc").
		Joins("JOIN professional_applications AS pa ON pa.id = mc.subject_id").
		Joins("LEFT JOIN users AS assignee ON assignee.id = mc.assignee_user_id")

	if filters.Domain != "" {
		base = base.Where("mc.domain = ?", filters.Domain)
	}
	if filters.QueueStatus != nil {
		base = base.Where("mc.queue_status = ?", *filters.QueueStatus)
	}
	if filters.DecisionStatus != nil {
		base = base.Where("mc.decision_status = ?", *filters.DecisionStatus)
	}
	if filters.AssigneeUserID != nil {
		base = base.Where("mc.assignee_user_id = ?", *filters.AssigneeUserID)
	}
	if filters.ActivityGroupCode != nil {
		base = base.Where("pa.activity_group_code = ?", *filters.ActivityGroupCode)
	}
	if filters.ActivitySubtypeCode != nil {
		base = base.Where("pa.activity_subtype_code = ?", *filters.ActivitySubtypeCode)
	}
	if filters.Query != nil && *filters.Query != "" {
		q := "%" + *filters.Query + "%"
		base = base.Where(
			"(pa.applicant_display_name ILIKE ? OR pa.contact_phone ILIKE ? OR COALESCE(pa.contact_email, '') ILIKE ?)",
			q,
			q,
			q,
		)
	}
	if filters.DateFrom != nil && *filters.DateFrom != "" {
		base = base.Where("mc.last_activity_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil && *filters.DateTo != "" {
		base = base.Where("mc.last_activity_at <= ?", *filters.DateTo)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]*ModerationCaseListRow, 0, limit)
	err := base.
		Select(`
			mc.id,
			mc.domain,
			mc.subject_id,
			mc.queue_status,
			mc.decision_status,
			mc.priority,
			mc.assignee_user_id,
			NULLIF(COALESCE(assignee.name, assignee.phone), '') AS assignee_display_name,
			mc.review_taken_at,
			mc.opened_at,
			mc.last_activity_at,
			mc.resolved_at,
			mc.created_at,
			pa.applicant_display_name,
			pa.activity_group_code,
			pa.activity_subtype_code,
			NULLIF(pa.contact_phone, '') AS contact_phone,
			pa.contact_email
		`).
		Order("mc.last_activity_at DESC, mc.created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *ProfessionalApplicationRepositoryImpl) ListStaleReviewCases(ctx context.Context, before time.Time, limit int) ([]*domain.ModerationCase, error) {
	if limit <= 0 {
		limit = 100
	}
	var cases []*domain.ModerationCase
	err := r.db.WithContext(ctx).
		Where("queue_status = ? AND review_taken_at IS NOT NULL AND review_taken_at < ?", domain.ModerationQueueStatusInReview, before).
		Order("review_taken_at ASC").
		Limit(limit).
		Find(&cases).Error
	return cases, err
}

func (r *ProfessionalApplicationRepositoryImpl) CreateCaseEvent(ctx context.Context, event *domain.ModerationCaseEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *ProfessionalApplicationRepositoryImpl) ListCaseEventsByCaseID(ctx context.Context, caseID string) ([]*domain.ModerationCaseEvent, error) {
	var events []*domain.ModerationCaseEvent
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("created_at ASC").
		Find(&events).Error
	return events, err
}

func (r *ProfessionalApplicationRepositoryImpl) ListCaseEventRows(ctx context.Context, caseID string) ([]*ModerationCaseEventRow, error) {
	rows := make([]*ModerationCaseEventRow, 0)
	err := r.db.WithContext(ctx).
		Table("moderation_case_events AS mce").
		Joins("LEFT JOIN users AS actor ON actor.id = mce.actor_user_id").
		Where("mce.case_id = ?", caseID).
		Order("mce.created_at ASC").
		Select(`
			mce.id,
			mce.case_id,
			mce.actor_user_id,
			NULLIF(COALESCE(actor.name, actor.phone), '') AS actor_display_name,
			mce.event_type,
			mce.from_queue_status,
			mce.to_queue_status,
			mce.from_decision_status,
			mce.to_decision_status,
			mce.comment,
			mce.created_at
		`).
		Scan(&rows).Error
	return rows, err
}

func (r *ProfessionalApplicationRepositoryImpl) GetTokenInvalidation(ctx context.Context, userID string) (*domain.TokenInvalidation, error) {
	var invalidation domain.TokenInvalidation
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&invalidation).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &invalidation, nil
}

func (r *ProfessionalApplicationRepositoryImpl) UpsertTokenInvalidation(ctx context.Context, invalidation *domain.TokenInvalidation) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"invalidated_at": invalidation.InvalidatedAt,
				"updated_at":     time.Now(),
			}),
		}).
		Create(invalidation).Error
}
