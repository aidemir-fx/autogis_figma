package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/repository"
)

func TestProfessionalApplicationApproveSetsPrivateExecutorRole(t *testing.T) {
	t.Parallel()

	updatedAt := time.Date(2026, time.April, 22, 10, 11, 12, 0, time.UTC)
	groupCode := "private_executor"
	app := &domain.ProfessionalApplication{
		ID:                "app-1",
		UserID:            "user-1",
		Status:            domain.ProfessionalApplicationStatusPending,
		ActivityGroupCode: &groupCode,
		UpdatedAt:         updatedAt,
	}
	moderationCase := &domain.ModerationCase{
		ID:             "case-1",
		Domain:         domain.ModerationDomainProfessionalApplication,
		SubjectID:      app.ID,
		QueueStatus:    domain.ModerationQueueStatusOpen,
		DecisionStatus: domain.ProfessionalApplicationStatusPending,
		OpenedAt:       updatedAt,
		LastActivityAt: updatedAt,
	}

	repo := &professionalApplicationRepoStub{
		app:            app,
		moderationCase: moderationCase,
	}
	userRepo := &professionalApplicationUserRepoStub{
		user: &domain.User{
			ID:             app.UserID,
			Role:           domain.RoleCustomer,
			IsProfessional: false,
		},
	}
	uc := NewProfessionalApplicationUseCase(repo, userRepo, nil, nil)

	err := uc.Decide(context.Background(), "moderator-1", app.ID, &domain.ProfessionalApplicationDecisionRequest{
		Decision:          domain.ProfessionalApplicationDecisionApprove,
		ExpectedUpdatedAt: updatedAt.Format(time.RFC3339Nano),
	})
	if err != nil {
		t.Fatalf("Decide returned error: %v", err)
	}
	if userRepo.user.Role != domain.RoleMaster {
		t.Fatalf("expected role %q, got %q", domain.RoleMaster, userRepo.user.Role)
	}
	if !userRepo.user.IsProfessional {
		t.Fatal("expected approved user to become professional")
	}
	if repo.tokenInvalidation == nil || repo.tokenInvalidation.UserID != app.UserID {
		t.Fatalf("expected token invalidation for user %q, got %#v", app.UserID, repo.tokenInvalidation)
	}
}

func TestSanitizeJSONValueKeepsQuotesAsText(t *testing.T) {
	if got := sanitizeJSONValue("businessName", `"Мустанг"`); got != `"Мустанг"` {
		t.Fatalf("expected quotes to remain text, got %#v", got)
	}
}

func TestDecodeStoredJSONMapRepairsLegacyHTMLText(t *testing.T) {
	decoded := decodeStoredJSONMap(domain.JSONMap{
		"businessName": "&#34;Мустанг&#34;",
		"nested":       map[string]interface{}{"label": "&amp; сервис"},
	})

	if got := decoded["businessName"]; got != `"Мустанг"` {
		t.Fatalf("expected legacy business name to be decoded, got %#v", got)
	}
	nested, ok := decoded["nested"].(domain.JSONMap)
	if !ok || nested["label"] != "& сервис" {
		t.Fatalf("expected nested legacy text to be decoded, got %#v", decoded["nested"])
	}
}

func TestProfessionalApplicationApproveRepairsStaleRoleWhenProfessionalFlagAlreadySet(t *testing.T) {
	t.Parallel()

	updatedAt := time.Date(2026, time.April, 22, 12, 0, 0, 0, time.UTC)
	groupCode := "private_executor"
	app := &domain.ProfessionalApplication{
		ID:                "app-2",
		UserID:            "user-2",
		Status:            domain.ProfessionalApplicationStatusPending,
		ActivityGroupCode: &groupCode,
		UpdatedAt:         updatedAt,
	}
	moderationCase := &domain.ModerationCase{
		ID:             "case-2",
		Domain:         domain.ModerationDomainProfessionalApplication,
		SubjectID:      app.ID,
		QueueStatus:    domain.ModerationQueueStatusOpen,
		DecisionStatus: domain.ProfessionalApplicationStatusPending,
		OpenedAt:       updatedAt,
		LastActivityAt: updatedAt,
	}

	repo := &professionalApplicationRepoStub{
		app:            app,
		moderationCase: moderationCase,
	}
	userRepo := &professionalApplicationUserRepoStub{
		user: &domain.User{
			ID:             app.UserID,
			Role:           domain.RoleCustomer,
			IsProfessional: true,
		},
	}
	uc := NewProfessionalApplicationUseCase(repo, userRepo, nil, nil)

	err := uc.Decide(context.Background(), "moderator-2", app.ID, &domain.ProfessionalApplicationDecisionRequest{
		Decision:          domain.ProfessionalApplicationDecisionApprove,
		ExpectedUpdatedAt: updatedAt.Format(time.RFC3339Nano),
	})
	if err != nil {
		t.Fatalf("Decide returned error: %v", err)
	}
	if userRepo.user.Role != domain.RoleMaster {
		t.Fatalf("expected stale role to be repaired to %q, got %q", domain.RoleMaster, userRepo.user.Role)
	}
}

type professionalApplicationRepoStub struct {
	app               *domain.ProfessionalApplication
	moderationCase    *domain.ModerationCase
	tokenInvalidation *domain.TokenInvalidation
	caseEvents        []*domain.ModerationCaseEvent
}

func (s *professionalApplicationRepoStub) RunInTx(_ context.Context, fn func(repo repository.ProfessionalApplicationRepository) error) error {
	return fn(s)
}

func (s *professionalApplicationRepoStub) GetActiveSchema(_ context.Context, _ string) (*domain.ProfessionalApplicationSchema, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) GetSchema(_ context.Context, _ string, _ int) (*domain.ProfessionalApplicationSchema, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) CreateApplication(_ context.Context, _ *domain.ProfessionalApplication) error {
	return nil
}

func (s *professionalApplicationRepoStub) UpdateApplication(_ context.Context, app *domain.ProfessionalApplication) error {
	s.app = app
	return nil
}

func (s *professionalApplicationRepoStub) GetApplicationByID(_ context.Context, id string) (*domain.ProfessionalApplication, error) {
	if s.app == nil || s.app.ID != id {
		return nil, nil
	}
	return s.app, nil
}

func (s *professionalApplicationRepoStub) GetLatestApplicationByUserID(_ context.Context, _ string) (*domain.ProfessionalApplication, error) {
	return s.app, nil
}

func (s *professionalApplicationRepoStub) ListApplicationsByUserID(_ context.Context, _ string) ([]*domain.ProfessionalApplication, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) ListApplications(_ context.Context) ([]*domain.ProfessionalApplication, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) CreateRevision(_ context.Context, _ *domain.ProfessionalApplicationRevision) error {
	return nil
}

func (s *professionalApplicationRepoStub) GetRevisionByID(_ context.Context, _ string) (*domain.ProfessionalApplicationRevision, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) GetLatestRevisionByApplicationID(_ context.Context, _ string) (*domain.ProfessionalApplicationRevision, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) ListRevisionsByApplicationID(_ context.Context, _ string) ([]*domain.ProfessionalApplicationRevision, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) CountRevisionsByApplicationID(_ context.Context, _ string) (int64, error) {
	return 0, nil
}

func (s *professionalApplicationRepoStub) CreateCase(_ context.Context, _ *domain.ModerationCase) error {
	return nil
}

func (s *professionalApplicationRepoStub) UpdateCase(_ context.Context, moderationCase *domain.ModerationCase) error {
	s.moderationCase = moderationCase
	return nil
}

func (s *professionalApplicationRepoStub) GetCaseByID(_ context.Context, _ string) (*domain.ModerationCase, error) {
	return s.moderationCase, nil
}

func (s *professionalApplicationRepoStub) GetCaseBySubjectID(_ context.Context, domainName, subjectID string) (*domain.ModerationCase, error) {
	if s.moderationCase == nil || s.moderationCase.Domain != domainName || s.moderationCase.SubjectID != subjectID {
		return nil, nil
	}
	return s.moderationCase, nil
}

func (s *professionalApplicationRepoStub) ListCaseRows(_ context.Context, _ domain.ModerationCasesListFilters) ([]*repository.ModerationCaseListRow, int64, error) {
	return nil, 0, nil
}

func (s *professionalApplicationRepoStub) ListStaleReviewCases(_ context.Context, _ time.Time, _ int) ([]*domain.ModerationCase, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) CreateCaseEvent(_ context.Context, event *domain.ModerationCaseEvent) error {
	s.caseEvents = append(s.caseEvents, event)
	return nil
}

func (s *professionalApplicationRepoStub) ListCaseEventsByCaseID(_ context.Context, _ string) ([]*domain.ModerationCaseEvent, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) ListCaseEventRows(_ context.Context, _ string) ([]*repository.ModerationCaseEventRow, error) {
	return nil, nil
}

func (s *professionalApplicationRepoStub) GetTokenInvalidation(_ context.Context, _ string) (*domain.TokenInvalidation, error) {
	return s.tokenInvalidation, nil
}

func (s *professionalApplicationRepoStub) UpsertTokenInvalidation(_ context.Context, invalidation *domain.TokenInvalidation) error {
	s.tokenInvalidation = invalidation
	return nil
}

type professionalApplicationUserRepoStub struct {
	user *domain.User
}

func (s *professionalApplicationUserRepoStub) Create(_ context.Context, _ *domain.User) error {
	return nil
}

func (s *professionalApplicationUserRepoStub) GetByID(_ context.Context, id string) (*domain.User, error) {
	if s.user == nil || s.user.ID != id {
		return nil, errors.New("not found")
	}
	return s.user, nil
}

func (s *professionalApplicationUserRepoStub) GetByPhone(_ context.Context, _ string) (*domain.User, error) {
	return nil, errors.New("not implemented")
}

func (s *professionalApplicationUserRepoStub) GetAll(_ context.Context) ([]*domain.User, error) {
	return nil, nil
}

func (s *professionalApplicationUserRepoStub) GetByRole(_ context.Context, _ domain.UserRole) ([]*domain.User, error) {
	return nil, nil
}

func (s *professionalApplicationUserRepoStub) Update(_ context.Context, user *domain.User) error {
	s.user = user
	return nil
}

func (s *professionalApplicationUserRepoStub) Delete(_ context.Context, _ string) error {
	return nil
}
