package usecase

import (
	"context"
	"errors"
	"fmt"
	"html"
	"net/http"
	neturl "net/url"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
	"gorm.io/gorm"
)

const (
	defaultProfessionalApplicationSchemaKey = "professional_cabinet.default"
	professionalApplicationRejectCooldown   = 7 * 24 * time.Hour
	autoReleaseActorUserID                  = "00000000-0000-0000-0000-000000000000"
)

type professionalApplicationSummary struct {
	activityGroupCode    *string
	activitySubtypeCode  *string
	applicantDisplayName string
	contactPhone         string
	contactEmail         *string
	city                 *string
	legacyBusinessType   domain.BusinessType
}

type ProfessionalApplicationUseCase struct {
	repo                repository.ProfessionalApplicationRepository
	userRepo            repository.UserRepository
	activityGroupRepo   repository.ActivityGroupRepository
	activitySubtypeRepo repository.ActivitySubtypeRepository
}

// AutoActivate resolves an application immediately after the user completes
// the professional profile form. Admins can later revoke the professional
// status independently from this application history.
func (uc *ProfessionalApplicationUseCase) AutoActivate(ctx context.Context, actorUserID, applicationID string) error {
	app, err := uc.repo.GetApplicationByID(ctx, applicationID)
	if err != nil || app == nil {
		return apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}
	if app.UserID != actorUserID {
		return apperrors.New("FORBIDDEN", "Forbidden", http.StatusForbidden)
	}
	if app.Status == domain.ProfessionalApplicationStatusApproved {
		return uc.ensureProfessionalAccess(ctx, app)
	}
	if err := uc.ensureProfessionalAccess(ctx, app); err != nil {
		return err
	}
	now := time.Now()
	app.Status = domain.ProfessionalApplicationStatusApproved
	app.DecisionActorID = &actorUserID
	comment := "Автоматически активировано после заполнения профиля"
	app.DecisionComment = &comment
	app.ResolvedAt = &now
	if err := uc.repo.UpdateApplication(ctx, app); err != nil {
		return apperrors.ErrInternalServer
	}
	caseRow, err := uc.repo.GetCaseBySubjectID(ctx, domain.ModerationDomainProfessionalApplication, applicationID)
	if err == nil && caseRow != nil {
		caseRow.QueueStatus = domain.ModerationQueueStatusResolved
		caseRow.DecisionStatus = domain.ProfessionalApplicationStatusApproved
		caseRow.ResolvedAt = &now
		caseRow.LastActivityAt = now
		if err := uc.repo.UpdateCase(ctx, caseRow); err != nil {
			return apperrors.ErrInternalServer
		}
	}
	return nil
}

func (uc *ProfessionalApplicationUseCase) ensureProfessionalAccess(ctx context.Context, app *domain.ProfessionalApplication) error {
	role, ok := professionalApplicationRole(app.ActivityGroupCode)
	if !ok {
		return apperrors.New("INVALID_APPLICATION", "Не удалось определить тип профессионального аккаунта", http.StatusBadRequest)
	}
	user, err := uc.userRepo.GetByID(ctx, app.UserID)
	if err != nil {
		return apperrors.ErrUserNotFound
	}
	if user.IsProfessional && user.Role == role {
		return nil
	}
	user.IsProfessional = true
	user.Role = role
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return apperrors.ErrInternalServer
	}
	return nil
}

func professionalApplicationRole(groupCode *string) (domain.UserRole, bool) {
	if groupCode == nil {
		return "", false
	}

	switch strings.TrimSpace(*groupCode) {
	case "private_executor":
		return domain.RoleMaster, true
	case "auto_wash":
		return domain.RoleAutoWash, true
	case "auto_shop":
		return domain.RoleAutoShop, true
	case "auto_service":
		return domain.RoleAutoService, true
	default:
		return "", false
	}
}

func NewProfessionalApplicationUseCase(
	repo repository.ProfessionalApplicationRepository,
	userRepo repository.UserRepository,
	activityGroupRepo repository.ActivityGroupRepository,
	activitySubtypeRepo repository.ActivitySubtypeRepository,
) *ProfessionalApplicationUseCase {
	return &ProfessionalApplicationUseCase{
		repo:                repo,
		userRepo:            userRepo,
		activityGroupRepo:   activityGroupRepo,
		activitySubtypeRepo: activitySubtypeRepo,
	}
}

func (uc *ProfessionalApplicationUseCase) GetActiveSchema(
	ctx context.Context,
	schemaKey string,
) (*domain.ProfessionalApplicationSchemaResponse, error) {
	schema, err := uc.repo.GetActiveSchema(ctx, schemaKey)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if schema == nil {
		return nil, apperrors.New("SCHEMA_NOT_FOUND", "Схема заявки не найдена", http.StatusNotFound)
	}
	return &domain.ProfessionalApplicationSchemaResponse{
		SchemaKey:     schema.SchemaKey,
		SchemaVersion: schema.SchemaVersion,
		JSONSchema:    schema.JSONSchema.Clone(),
		UISchema:      schema.UISchema.Clone(),
	}, nil
}

func (uc *ProfessionalApplicationUseCase) Submit(
	ctx context.Context,
	userID string,
	req *domain.ProfessionalApplicationEnvelopeRequest,
) (*domain.ProfessionalApplicationsMeCurrentResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	latest, err := uc.repo.GetLatestApplicationByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if latest != nil {
		switch latest.Status {
		case domain.ProfessionalApplicationStatusPending, domain.ProfessionalApplicationStatusNeedsRevision:
			return nil, apperrors.New(
				"APPLICATION_ALREADY_ACTIVE",
				"У пользователя уже есть активная заявка",
				http.StatusConflict,
			)
		case domain.ProfessionalApplicationStatusApproved:
			return nil, apperrors.New(
				"APPLICATION_ALREADY_APPROVED",
				"Профессиональный аккаунт уже активирован",
				http.StatusConflict,
			)
		case domain.ProfessionalApplicationStatusRejected:
			if latest.ResolvedAt != nil {
				retryAt := latest.ResolvedAt.Add(professionalApplicationRejectCooldown)
				if retryAt.After(time.Now()) {
					return nil, apperrors.New(
						"REAPPLY_TOO_EARLY",
						fmt.Sprintf("Повторная подача будет доступна после %s", retryAt.Format(time.RFC3339)),
						http.StatusTooManyRequests,
					)
				}
			}
		}
	}

	app, revision, err := uc.submitNewApplication(ctx, user, req)
	if err != nil {
		return nil, err
	}
	return uc.buildCurrentResponse(app, revision), nil
}

func (uc *ProfessionalApplicationUseCase) Resubmit(
	ctx context.Context,
	userID string,
	applicationID string,
	req *domain.ProfessionalApplicationEnvelopeRequest,
) (*domain.ProfessionalApplicationsMeCurrentResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	app, revision, err := uc.resubmitApplication(ctx, user, applicationID, req)
	if err != nil {
		return nil, err
	}
	return uc.buildCurrentResponse(app, revision), nil
}

func (uc *ProfessionalApplicationUseCase) GetMyApplications(
	ctx context.Context,
	userID string,
) (*domain.ProfessionalApplicationsMeResponse, error) {
	apps, err := uc.repo.ListApplicationsByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	resp := &domain.ProfessionalApplicationsMeResponse{
		History: make([]*domain.ProfessionalApplicationsMeHistoryItem, 0),
	}
	for _, app := range apps {
		if app.Status == domain.ProfessionalApplicationStatusRejected {
			resp.History = append(resp.History, uc.buildHistoryResponse(app))
			continue
		}
		if resp.Current == nil {
			revision, err := uc.resolveCurrentRevision(ctx, app)
			if err != nil {
				return nil, apperrors.ErrInternalServer
			}
			resp.Current = uc.buildCurrentResponse(app, revision)
		}
	}
	return resp, nil
}

func (uc *ProfessionalApplicationUseCase) ListModerationCases(
	ctx context.Context,
	filters domain.ModerationCasesListFilters,
) (*domain.ModerationCasesListResponse, error) {
	if filters.Domain == "" {
		filters.Domain = domain.ModerationDomainProfessionalApplication
	}
	rows, total, err := uc.repo.ListCaseRows(ctx, filters)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	items := make([]*domain.ModerationCaseResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, uc.buildModerationCaseResponse(row))
	}

	return &domain.ModerationCasesListResponse{
		Items:  items,
		Total:  total,
		Limit:  normalizeLimit(filters.Limit),
		Offset: normalizeOffset(filters.Offset),
	}, nil
}

func (uc *ProfessionalApplicationUseCase) GetModerationCaseDetail(
	ctx context.Context,
	actorUserID string,
	caseID string,
) (*domain.ModerationCaseDetailResponse, error) {
	if err := uc.takeCaseIntoReviewIfNeeded(ctx, actorUserID, caseID); err != nil {
		return nil, err
	}

	moderationCase, err := uc.repo.GetCaseByID(ctx, caseID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if moderationCase == nil {
		return nil, apperrors.New("CASE_NOT_FOUND", "Кейс не найден", http.StatusNotFound)
	}

	app, err := uc.repo.GetApplicationByID(ctx, moderationCase.SubjectID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if app == nil {
		return nil, apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}

	revisions, err := uc.repo.ListRevisionsByApplicationID(ctx, app.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	currentRevision, err := uc.resolveCurrentRevision(ctx, app)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	events, err := uc.repo.ListCaseEventRows(ctx, moderationCase.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	applicant, err := uc.userRepo.GetByID(ctx, app.UserID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, apperrors.ErrUserNotFound
	}

	var assigneeDisplayName *string
	if moderationCase.AssigneeUserID != nil {
		if assignee, err := uc.userRepo.GetByID(ctx, *moderationCase.AssigneeUserID); err == nil && assignee != nil {
			assigneeDisplayName = userDisplayName(assignee)
		}
	}

	detail := &domain.ModerationCaseDetailResponse{
		ModerationCaseResponse: domain.ModerationCaseResponse{
			ID:                   moderationCase.ID,
			Domain:               moderationCase.Domain,
			SubjectID:            moderationCase.SubjectID,
			QueueStatus:          moderationCase.QueueStatus,
			DecisionStatus:       moderationCase.DecisionStatus,
			Priority:             moderationCase.Priority,
			AssigneeUserID:       moderationCase.AssigneeUserID,
			AssigneeDisplayName:  assigneeDisplayName,
			ReviewTakenAt:        formatTimePtr(moderationCase.ReviewTakenAt),
			OpenedAt:             moderationCase.OpenedAt.Format(time.RFC3339),
			LastActivityAt:       moderationCase.LastActivityAt.Format(time.RFC3339),
			ResolvedAt:           formatTimePtr(moderationCase.ResolvedAt),
			CreatedAt:            moderationCase.CreatedAt.Format(time.RFC3339),
			ApplicantDisplayName: app.ApplicantDisplayName,
			ActivityGroupCode:    app.ActivityGroupCode,
			ActivitySubtypeCode:  app.ActivitySubtypeCode,
			ContactPhone:         stringPtrIfNotEmpty(app.ContactPhone),
			ContactEmail:         app.ContactEmail,
		},
		Subject: &domain.ModerationCaseSubjectDetail{
			ID:               app.ID,
			Status:           app.Status,
			DecisionComment:  app.DecisionComment,
			LastSubmissionAt: app.LastSubmissionAt.Format(time.RFC3339),
			UpdatedAt:        app.UpdatedAt.Format(time.RFC3339Nano),
			CurrentRevision:  uc.buildRevisionResponse(currentRevision),
			RevisionHistory:  uc.buildRevisionHistoryResponses(revisions),
		},
		AuditEvents:   uc.buildAuditEventResponses(events),
		ApplicantInfo: uc.buildApplicantInfo(app, applicant),
	}

	return detail, nil
}

func (uc *ProfessionalApplicationUseCase) AssignModerationCase(
	ctx context.Context,
	actorUserID string,
	caseID string,
	assigneeUserID *string,
) error {
	if assigneeUserID != nil {
		targetUser, err := uc.userRepo.GetByID(ctx, *assigneeUserID)
		if err != nil || targetUser == nil {
			return apperrors.ErrUserNotFound
		}
		if targetUser.Role != domain.RoleAdmin && targetUser.Role != domain.RoleModerator {
			return apperrors.New("INVALID_ASSIGNEE", "Назначить можно только admin или moderator", http.StatusBadRequest)
		}
	}

	return uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		moderationCase, err := txRepo.GetCaseByID(ctx, caseID)
		if err != nil {
			return err
		}
		if moderationCase == nil {
			return apperrors.New("CASE_NOT_FOUND", "Кейс не найден", http.StatusNotFound)
		}
		if moderationCase.QueueStatus == domain.ModerationQueueStatusResolved {
			return apperrors.New("CASE_ALREADY_RESOLVED", "Кейс уже завершён", http.StatusConflict)
		}

		if stringPtrEquals(moderationCase.AssigneeUserID, assigneeUserID) {
			return nil
		}

		now := time.Now()
		moderationCase.AssigneeUserID = assigneeUserID
		moderationCase.LastActivityAt = now
		if err := txRepo.UpdateCase(ctx, moderationCase); err != nil {
			return err
		}

		comment := buildAssignmentComment(assigneeUserID)
		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:      moderationCase.ID,
			Domain:      moderationCase.Domain,
			SubjectID:   moderationCase.SubjectID,
			ActorUserID: actorUserID,
			EventType:   domain.ModerationCaseEventTypeAssigned,
			Comment:     comment,
			CreatedAt:   now,
		})
	})
}

func (uc *ProfessionalApplicationUseCase) Decide(
	ctx context.Context,
	actorUserID string,
	applicationID string,
	req *domain.ProfessionalApplicationDecisionRequest,
) error {
	expectedUpdatedAt, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(req.ExpectedUpdatedAt))
	if err != nil {
		return validationError("Некорректное expectedUpdatedAt")
	}

	comment := normalizeOptionalString(req.Comment)
	if (req.Decision == domain.ProfessionalApplicationDecisionReject || req.Decision == domain.ProfessionalApplicationDecisionNeedsRevision) && comment == nil {
		return validationError("Для отклонения и отправки на доработку комментарий обязателен")
	}

	var invalidateUser bool
	var invalidationUserID string
	err = uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		app, err := txRepo.GetApplicationByID(ctx, applicationID)
		if err != nil {
			return err
		}
		if app == nil {
			return apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
		}
		if !app.UpdatedAt.Equal(expectedUpdatedAt) {
			return apperrors.New("APPLICATION_CONFLICT", "Заявка уже была изменена", http.StatusConflict)
		}

		moderationCase, err := txRepo.GetCaseBySubjectID(ctx, domain.ModerationDomainProfessionalApplication, app.ID)
		if err != nil {
			return err
		}
		if moderationCase == nil {
			return apperrors.New("CASE_NOT_FOUND", "Кейс не найден", http.StatusNotFound)
		}
		if moderationCase.QueueStatus == domain.ModerationQueueStatusResolved {
			return apperrors.New("CASE_ALREADY_RESOLVED", "Кейс уже завершён", http.StatusConflict)
		}
		if moderationCase.QueueStatus == domain.ModerationQueueStatusWaitingSubmitter {
			return apperrors.New("CASE_WAITING_SUBMITTER", "Кейс ожидает повторной подачи от заявителя", http.StatusConflict)
		}

		now := time.Now()
		if moderationCase.QueueStatus == domain.ModerationQueueStatusOpen {
			if moderationCase.AssigneeUserID == nil {
				moderationCase.AssigneeUserID = &actorUserID
				if err := txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
					CaseID:      moderationCase.ID,
					Domain:      moderationCase.Domain,
					SubjectID:   moderationCase.SubjectID,
					ActorUserID: actorUserID,
					EventType:   domain.ModerationCaseEventTypeAssigned,
					Comment:     buildAssignmentComment(moderationCase.AssigneeUserID),
					CreatedAt:   now,
				}); err != nil {
					return err
				}
			}
			fromQueue := moderationCase.QueueStatus
			moderationCase.QueueStatus = domain.ModerationQueueStatusInReview
			moderationCase.ReviewTakenAt = &now
			moderationCase.LastActivityAt = now
			if err := txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
				CaseID:          moderationCase.ID,
				Domain:          moderationCase.Domain,
				SubjectID:       moderationCase.SubjectID,
				ActorUserID:     actorUserID,
				EventType:       domain.ModerationCaseEventTypeTakenIntoReview,
				FromQueueStatus: &fromQueue,
				ToQueueStatus:   &moderationCase.QueueStatus,
				CreatedAt:       now,
			}); err != nil {
				return err
			}
		}

		fromQueue := moderationCase.QueueStatus
		fromDecision := moderationCase.DecisionStatus
		app.DecisionActorID = &actorUserID
		app.DecisionComment = comment
		moderationCase.LastActivityAt = now

		var eventType domain.ModerationCaseEventType
		switch req.Decision {
		case domain.ProfessionalApplicationDecisionApprove:
			app.Status = domain.ProfessionalApplicationStatusApproved
			app.ResolvedAt = &now
			moderationCase.QueueStatus = domain.ModerationQueueStatusResolved
			moderationCase.DecisionStatus = domain.ProfessionalApplicationStatusApproved
			moderationCase.ResolvedAt = &now
			eventType = domain.ModerationCaseEventTypeDecisionApproved
			user, err := uc.userRepo.GetByID(ctx, app.UserID)
			if err != nil {
				return err
			}
			userChanged := false
			if !user.IsProfessional {
				user.IsProfessional = true
				userChanged = true
			}
			if role, ok := professionalApplicationRole(app.ActivityGroupCode); ok && user.Role != role {
				user.Role = role
				userChanged = true
			}
			if userChanged {
				if err := uc.userRepo.Update(ctx, user); err != nil {
					return err
				}
			}
			invalidateUser = true
			invalidationUserID = app.UserID
		case domain.ProfessionalApplicationDecisionReject:
			app.Status = domain.ProfessionalApplicationStatusRejected
			app.ResolvedAt = &now
			moderationCase.QueueStatus = domain.ModerationQueueStatusResolved
			moderationCase.DecisionStatus = domain.ProfessionalApplicationStatusRejected
			moderationCase.ResolvedAt = &now
			eventType = domain.ModerationCaseEventTypeDecisionRejected
			user, err := uc.userRepo.GetByID(ctx, app.UserID)
			if err != nil {
				return err
			}
			if user.IsProfessional {
				user.IsProfessional = false
				if err := uc.userRepo.Update(ctx, user); err != nil {
					return err
				}
			}
			invalidateUser = true
			invalidationUserID = app.UserID
		case domain.ProfessionalApplicationDecisionNeedsRevision:
			app.Status = domain.ProfessionalApplicationStatusNeedsRevision
			app.ResolvedAt = nil
			moderationCase.QueueStatus = domain.ModerationQueueStatusWaitingSubmitter
			moderationCase.DecisionStatus = domain.ProfessionalApplicationStatusNeedsRevision
			moderationCase.ReviewTakenAt = nil
			moderationCase.ResolvedAt = nil
			eventType = domain.ModerationCaseEventTypeDecisionNeedsRevision
		default:
			return validationError("Неизвестное решение модератора")
		}

		if err := txRepo.UpdateApplication(ctx, app); err != nil {
			return err
		}
		if err := txRepo.UpdateCase(ctx, moderationCase); err != nil {
			return err
		}
		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:             moderationCase.ID,
			Domain:             moderationCase.Domain,
			SubjectID:          moderationCase.SubjectID,
			ActorUserID:        actorUserID,
			EventType:          eventType,
			FromQueueStatus:    &fromQueue,
			ToQueueStatus:      &moderationCase.QueueStatus,
			FromDecisionStatus: &fromDecision,
			ToDecisionStatus:   &moderationCase.DecisionStatus,
			Comment:            comment,
			CreatedAt:          now,
		})
	})
	if err != nil {
		return err
	}

	if invalidateUser {
		if err := uc.repo.UpsertTokenInvalidation(ctx, &domain.TokenInvalidation{
			UserID:        invalidationUserID,
			InvalidatedAt: time.Now(),
		}); err != nil {
			return apperrors.ErrInternalServer
		}
	}

	return nil
}

func (uc *ProfessionalApplicationUseCase) ReleaseModerationCase(
	ctx context.Context,
	actorUserID string,
	caseID string,
) error {
	return uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		moderationCase, err := txRepo.GetCaseByID(ctx, caseID)
		if err != nil {
			return err
		}
		if moderationCase == nil {
			return apperrors.New("CASE_NOT_FOUND", "Кейс не найден", http.StatusNotFound)
		}
		if moderationCase.QueueStatus != domain.ModerationQueueStatusInReview {
			return apperrors.New("INVALID_CASE_STATE", "Кейс нельзя вернуть в очередь из текущего статуса", http.StatusConflict)
		}

		now := time.Now()
		fromQueue := moderationCase.QueueStatus
		toQueue := domain.ModerationQueueStatusOpen
		moderationCase.QueueStatus = toQueue
		moderationCase.AssigneeUserID = nil
		moderationCase.ReviewTakenAt = nil
		moderationCase.LastActivityAt = now
		if err := txRepo.UpdateCase(ctx, moderationCase); err != nil {
			return err
		}
		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:          moderationCase.ID,
			Domain:          moderationCase.Domain,
			SubjectID:       moderationCase.SubjectID,
			ActorUserID:     actorUserID,
			EventType:       domain.ModerationCaseEventTypeReviewReleased,
			FromQueueStatus: &fromQueue,
			ToQueueStatus:   &toQueue,
			CreatedAt:       now,
		})
	})
}

func (uc *ProfessionalApplicationUseCase) AutoReleaseExpiredReviews(ctx context.Context) (int, error) {
	before := time.Now().Add(-24 * time.Hour)
	staleCases, err := uc.repo.ListStaleReviewCases(ctx, before, 200)
	if err != nil {
		return 0, apperrors.ErrInternalServer
	}

	released := 0
	for _, staleCase := range staleCases {
		err := uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
			current, err := txRepo.GetCaseByID(ctx, staleCase.ID)
			if err != nil {
				return err
			}
			if current == nil || current.QueueStatus != domain.ModerationQueueStatusInReview || current.ReviewTakenAt == nil || !current.ReviewTakenAt.Before(before) {
				return nil
			}
			now := time.Now()
			fromQueue := current.QueueStatus
			toQueue := domain.ModerationQueueStatusOpen
			current.QueueStatus = toQueue
			current.AssigneeUserID = nil
			current.ReviewTakenAt = nil
			current.LastActivityAt = now
			if err := txRepo.UpdateCase(ctx, current); err != nil {
				return err
			}
			return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
				CaseID:          current.ID,
				Domain:          current.Domain,
				SubjectID:       current.SubjectID,
				ActorUserID:     autoReleaseActorUserID,
				EventType:       domain.ModerationCaseEventTypeReviewReleased,
				FromQueueStatus: &fromQueue,
				ToQueueStatus:   &toQueue,
				Comment:         stringPtr("auto-release after 24h inactivity"),
				CreatedAt:       now,
			})
		})
		if err != nil {
			return released, err
		}
		released++
	}

	return released, nil
}

func (uc *ProfessionalApplicationUseCase) GetLatestApplicationForLegacy(
	ctx context.Context,
	userID string,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	app, err := uc.repo.GetLatestApplicationByUserID(ctx, userID)
	if err != nil || app == nil {
		return app, nil, err
	}
	revision, err := uc.resolveCurrentRevision(ctx, app)
	return app, revision, err
}

func (uc *ProfessionalApplicationUseCase) SubmitFromLegacy(
	ctx context.Context,
	userID string,
	req *domain.CreateBusinessApplicationRequest,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, apperrors.ErrUserNotFound
	}

	envelope, allowInactiveSchema, err := uc.buildEnvelopeFromLegacyRequest(user, req)
	if err != nil {
		return nil, nil, err
	}

	latest, err := uc.repo.GetLatestApplicationByUserID(ctx, userID)
	if err != nil {
		return nil, nil, apperrors.ErrInternalServer
	}
	if latest != nil {
		switch latest.Status {
		case domain.ProfessionalApplicationStatusNeedsRevision:
			return uc.resubmitApplicationWithOptions(ctx, user, latest.ID, envelope, allowInactiveSchema)
		case domain.ProfessionalApplicationStatusPending:
			return nil, nil, apperrors.New("APPLICATION_ALREADY_PENDING", "У вас уже есть заявка на проверке", http.StatusConflict)
		case domain.ProfessionalApplicationStatusApproved:
			return nil, nil, apperrors.New("APPLICATION_ALREADY_APPROVED", "Профессиональный аккаунт уже активирован", http.StatusConflict)
		case domain.ProfessionalApplicationStatusRejected:
			if latest.ResolvedAt != nil {
				retryAt := latest.ResolvedAt.Add(professionalApplicationRejectCooldown)
				if retryAt.After(time.Now()) {
					return nil, nil, apperrors.New(
						"REAPPLY_TOO_EARLY",
						fmt.Sprintf("Повторная подача будет доступна после %s", retryAt.Format(time.RFC3339)),
						http.StatusTooManyRequests,
					)
				}
			}
		}
	}

	return uc.submitNewApplicationWithOptions(ctx, user, envelope, allowInactiveSchema)
}

func (uc *ProfessionalApplicationUseCase) ListApplicationsForLegacy(
	ctx context.Context,
) ([]*domain.ProfessionalApplication, error) {
	apps, err := uc.repo.ListApplications(ctx)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return apps, nil
}

func (uc *ProfessionalApplicationUseCase) LegacyUpdateStatus(
	ctx context.Context,
	actorUserID string,
	applicationID string,
	req *domain.UpdateBusinessApplicationStatusRequest,
) (*domain.ProfessionalApplication, error) {
	app, err := uc.repo.GetApplicationByID(ctx, applicationID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if app == nil {
		return nil, apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}

	switch req.Status {
	case domain.BusinessApplicationStatusApproved:
		comment := normalizeOptionalString(req.RejectionReason)
		err = uc.Decide(ctx, actorUserID, applicationID, &domain.ProfessionalApplicationDecisionRequest{
			Decision:          domain.ProfessionalApplicationDecisionApprove,
			Comment:           comment,
			ExpectedUpdatedAt: app.UpdatedAt.Format(time.RFC3339Nano),
		})
		if err != nil {
			return nil, err
		}
	case domain.BusinessApplicationStatusRejected:
		err = uc.Decide(ctx, actorUserID, applicationID, &domain.ProfessionalApplicationDecisionRequest{
			Decision:          domain.ProfessionalApplicationDecisionReject,
			Comment:           req.RejectionReason,
			ExpectedUpdatedAt: app.UpdatedAt.Format(time.RFC3339Nano),
		})
		if err != nil {
			return nil, err
		}
	case domain.BusinessApplicationStatusNeedsRevision:
		err = uc.Decide(ctx, actorUserID, applicationID, &domain.ProfessionalApplicationDecisionRequest{
			Decision:          domain.ProfessionalApplicationDecisionNeedsRevision,
			Comment:           req.RejectionReason,
			ExpectedUpdatedAt: app.UpdatedAt.Format(time.RFC3339Nano),
		})
		if err != nil {
			return nil, err
		}
	default:
		return nil, validationError("Legacy update status поддерживает только approved/rejected/needs_revision")
	}

	app, err = uc.repo.GetApplicationByID(ctx, applicationID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if app == nil {
		return nil, apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}
	return app, nil
}

func (uc *ProfessionalApplicationUseCase) resolveCurrentRevision(
	ctx context.Context,
	app *domain.ProfessionalApplication,
) (*domain.ProfessionalApplicationRevision, error) {
	if app == nil {
		return nil, nil
	}
	if app.CurrentRevisionID != nil {
		return uc.repo.GetRevisionByID(ctx, *app.CurrentRevisionID)
	}
	return uc.repo.GetLatestRevisionByApplicationID(ctx, app.ID)
}

func (uc *ProfessionalApplicationUseCase) submitNewApplication(
	ctx context.Context,
	user *domain.User,
	req *domain.ProfessionalApplicationEnvelopeRequest,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	return uc.submitNewApplicationWithOptions(ctx, user, req, false)
}

func (uc *ProfessionalApplicationUseCase) submitNewApplicationWithOptions(
	ctx context.Context,
	user *domain.User,
	req *domain.ProfessionalApplicationEnvelopeRequest,
	allowInactiveSchema bool,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	schema, normalizedPayload, summary, err := uc.prepareSchemaAndPayload(ctx, user, req, allowInactiveSchema)
	if err != nil {
		return nil, nil, err
	}

	now := time.Now()
	app := &domain.ProfessionalApplication{
		UserID:                 user.ID,
		Status:                 domain.ProfessionalApplicationStatusPending,
		ActivityGroupCode:      summary.activityGroupCode,
		ActivitySubtypeCode:    summary.activitySubtypeCode,
		ApplicantDisplayName:   summary.applicantDisplayName,
		ContactPhone:           summary.contactPhone,
		ContactEmail:           summary.contactEmail,
		City:                   summary.city,
		SubmittedSchemaKey:     schema.SchemaKey,
		SubmittedSchemaVersion: schema.SchemaVersion,
		LastSubmissionAt:       now,
	}
	revision := &domain.ProfessionalApplicationRevision{
		RevisionNo:        1,
		SchemaKey:         schema.SchemaKey,
		SchemaVersion:     schema.SchemaVersion,
		PayloadJSON:       normalizedPayload.Clone(),
		SummaryJSON:       buildSummaryJSON(summary),
		SubmittedByUserID: user.ID,
		CreatedAt:         now,
	}
	moderationCase := &domain.ModerationCase{
		Domain:         domain.ModerationDomainProfessionalApplication,
		QueueStatus:    domain.ModerationQueueStatusOpen,
		DecisionStatus: domain.ProfessionalApplicationStatusPending,
		Priority:       domain.ModerationPriorityNormal,
		OpenedAt:       now,
		LastActivityAt: now,
	}

	err = uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		if err := txRepo.CreateApplication(ctx, app); err != nil {
			return err
		}

		revision.ApplicationID = app.ID
		if err := txRepo.CreateRevision(ctx, revision); err != nil {
			return err
		}

		moderationCase.SubjectID = app.ID
		if err := txRepo.CreateCase(ctx, moderationCase); err != nil {
			return err
		}

		app.CurrentRevisionID = &revision.ID
		app.ModerationCaseID = &moderationCase.ID
		if err := txRepo.UpdateApplication(ctx, app); err != nil {
			return err
		}

		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:      moderationCase.ID,
			Domain:      moderationCase.Domain,
			SubjectID:   moderationCase.SubjectID,
			ActorUserID: user.ID,
			EventType:   domain.ModerationCaseEventTypeCaseCreated,
			CreatedAt:   now,
		})
	})
	if err != nil {
		return nil, nil, mapProfessionalApplicationError(err)
	}

	return app, revision, nil
}

func (uc *ProfessionalApplicationUseCase) resubmitApplication(
	ctx context.Context,
	user *domain.User,
	applicationID string,
	req *domain.ProfessionalApplicationEnvelopeRequest,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	return uc.resubmitApplicationWithOptions(ctx, user, applicationID, req, false)
}

func (uc *ProfessionalApplicationUseCase) resubmitApplicationWithOptions(
	ctx context.Context,
	user *domain.User,
	applicationID string,
	req *domain.ProfessionalApplicationEnvelopeRequest,
	allowInactiveSchema bool,
) (*domain.ProfessionalApplication, *domain.ProfessionalApplicationRevision, error) {
	app, err := uc.repo.GetApplicationByID(ctx, applicationID)
	if err != nil {
		return nil, nil, apperrors.ErrInternalServer
	}
	if app == nil {
		return nil, nil, apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}
	if app.UserID != user.ID {
		return nil, nil, apperrors.New("FORBIDDEN", "Forbidden", http.StatusForbidden)
	}
	if app.Status != domain.ProfessionalApplicationStatusNeedsRevision {
		return nil, nil, apperrors.New("INVALID_APPLICATION_STATE", "Повторная отправка доступна только после needs_revision", http.StatusConflict)
	}

	schema, normalizedPayload, summary, err := uc.prepareSchemaAndPayload(ctx, user, req, allowInactiveSchema)
	if err != nil {
		return nil, nil, err
	}

	now := time.Now()
	revisionCount, err := uc.repo.CountRevisionsByApplicationID(ctx, app.ID)
	if err != nil {
		return nil, nil, apperrors.ErrInternalServer
	}

	revision := &domain.ProfessionalApplicationRevision{
		ApplicationID:     app.ID,
		RevisionNo:        int(revisionCount) + 1,
		SchemaKey:         schema.SchemaKey,
		SchemaVersion:     schema.SchemaVersion,
		PayloadJSON:       normalizedPayload.Clone(),
		SummaryJSON:       buildSummaryJSON(summary),
		SubmittedByUserID: user.ID,
		CreatedAt:         now,
	}

	err = uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		if err := txRepo.CreateRevision(ctx, revision); err != nil {
			return err
		}

		app.Status = domain.ProfessionalApplicationStatusPending
		app.CurrentRevisionID = &revision.ID
		app.ActivityGroupCode = summary.activityGroupCode
		app.ActivitySubtypeCode = summary.activitySubtypeCode
		app.ApplicantDisplayName = summary.applicantDisplayName
		app.ContactPhone = summary.contactPhone
		app.ContactEmail = summary.contactEmail
		app.City = summary.city
		app.SubmittedSchemaKey = schema.SchemaKey
		app.SubmittedSchemaVersion = schema.SchemaVersion
		app.DecisionActorID = nil
		app.DecisionComment = nil
		app.LastSubmissionAt = now
		app.ResolvedAt = nil
		if err := txRepo.UpdateApplication(ctx, app); err != nil {
			return err
		}

		moderationCase, err := txRepo.GetCaseBySubjectID(ctx, domain.ModerationDomainProfessionalApplication, app.ID)
		if err != nil {
			return err
		}
		if moderationCase == nil {
			moderationCase = &domain.ModerationCase{
				Domain:         domain.ModerationDomainProfessionalApplication,
				SubjectID:      app.ID,
				QueueStatus:    domain.ModerationQueueStatusOpen,
				DecisionStatus: domain.ProfessionalApplicationStatusPending,
				Priority:       domain.ModerationPriorityNormal,
				OpenedAt:       now,
				LastActivityAt: now,
			}
			if err := txRepo.CreateCase(ctx, moderationCase); err != nil {
				return err
			}
			app.ModerationCaseID = &moderationCase.ID
			if err := txRepo.UpdateApplication(ctx, app); err != nil {
				return err
			}
		} else {
			moderationCase.QueueStatus = domain.ModerationQueueStatusOpen
			moderationCase.DecisionStatus = domain.ProfessionalApplicationStatusPending
			moderationCase.AssigneeUserID = nil
			moderationCase.ReviewTakenAt = nil
			moderationCase.LastActivityAt = now
			moderationCase.ResolvedAt = nil
			if err := txRepo.UpdateCase(ctx, moderationCase); err != nil {
				return err
			}
		}

		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:             *app.ModerationCaseID,
			Domain:             domain.ModerationDomainProfessionalApplication,
			SubjectID:          app.ID,
			ActorUserID:        user.ID,
			EventType:          domain.ModerationCaseEventTypeResubmitted,
			FromDecisionStatus: statusPtr(domain.ProfessionalApplicationStatusNeedsRevision),
			ToDecisionStatus:   statusPtr(domain.ProfessionalApplicationStatusPending),
			CreatedAt:          now,
		})
	})
	if err != nil {
		return nil, nil, mapProfessionalApplicationError(err)
	}

	return app, revision, nil
}

func (uc *ProfessionalApplicationUseCase) takeCaseIntoReviewIfNeeded(
	ctx context.Context,
	actorUserID string,
	caseID string,
) error {
	return uc.repo.RunInTx(ctx, func(txRepo repository.ProfessionalApplicationRepository) error {
		moderationCase, err := txRepo.GetCaseByID(ctx, caseID)
		if err != nil {
			return err
		}
		if moderationCase == nil {
			return apperrors.New("CASE_NOT_FOUND", "Кейс не найден", http.StatusNotFound)
		}
		if moderationCase.QueueStatus != domain.ModerationQueueStatusOpen {
			return nil
		}

		now := time.Now()
		if moderationCase.AssigneeUserID == nil {
			moderationCase.AssigneeUserID = &actorUserID
			if err := txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
				CaseID:      moderationCase.ID,
				Domain:      moderationCase.Domain,
				SubjectID:   moderationCase.SubjectID,
				ActorUserID: actorUserID,
				EventType:   domain.ModerationCaseEventTypeAssigned,
				Comment:     buildAssignmentComment(moderationCase.AssigneeUserID),
				CreatedAt:   now,
			}); err != nil {
				return err
			}
		}

		fromQueue := moderationCase.QueueStatus
		toQueue := domain.ModerationQueueStatusInReview
		moderationCase.QueueStatus = toQueue
		moderationCase.ReviewTakenAt = &now
		moderationCase.LastActivityAt = now
		if err := txRepo.UpdateCase(ctx, moderationCase); err != nil {
			return err
		}
		return txRepo.CreateCaseEvent(ctx, &domain.ModerationCaseEvent{
			CaseID:          moderationCase.ID,
			Domain:          moderationCase.Domain,
			SubjectID:       moderationCase.SubjectID,
			ActorUserID:     actorUserID,
			EventType:       domain.ModerationCaseEventTypeTakenIntoReview,
			FromQueueStatus: &fromQueue,
			ToQueueStatus:   &toQueue,
			CreatedAt:       now,
		})
	})
}

func (uc *ProfessionalApplicationUseCase) prepareSchemaAndPayload(
	ctx context.Context,
	user *domain.User,
	req *domain.ProfessionalApplicationEnvelopeRequest,
	allowInactiveSchema bool,
) (*domain.ProfessionalApplicationSchema, domain.JSONMap, professionalApplicationSummary, error) {
	if req == nil {
		return nil, nil, professionalApplicationSummary{}, validationError("Тело запроса обязательно")
	}
	schema, err := uc.repo.GetSchema(ctx, strings.TrimSpace(req.SchemaKey), req.SchemaVersion)
	if err != nil {
		return nil, nil, professionalApplicationSummary{}, apperrors.ErrInternalServer
	}
	if schema == nil {
		return nil, nil, professionalApplicationSummary{}, apperrors.New("SCHEMA_NOT_FOUND", "Схема заявки не найдена", http.StatusUnprocessableEntity)
	}
	if !allowInactiveSchema && !schema.IsActive {
		return nil, nil, professionalApplicationSummary{}, apperrors.New("SCHEMA_INACTIVE", "Указанная версия схемы больше не активна", http.StatusUnprocessableEntity)
	}

	normalizedPayload, summary, err := uc.validateAndNormalizePayload(ctx, user, schema, req.Payload.Clone())
	if err != nil {
		return nil, nil, professionalApplicationSummary{}, err
	}
	return schema, normalizedPayload, summary, nil
}

func (uc *ProfessionalApplicationUseCase) validateAndNormalizePayload(
	ctx context.Context,
	user *domain.User,
	schema *domain.ProfessionalApplicationSchema,
	payload domain.JSONMap,
) (domain.JSONMap, professionalApplicationSummary, error) {
	payload = sanitizeJSONMap(payload)
	switch schema.SchemaVersion {
	case 1:
		return uc.validateLegacyPayload(payload)
	case 2:
		return uc.validateV2Payload(ctx, user, payload)
	default:
		return nil, professionalApplicationSummary{}, apperrors.New("UNSUPPORTED_SCHEMA_VERSION", "Версия схемы не поддерживается", http.StatusUnprocessableEntity)
	}
}

func (uc *ProfessionalApplicationUseCase) validateLegacyPayload(
	payload domain.JSONMap,
) (domain.JSONMap, professionalApplicationSummary, error) {
	businessTypeRaw, _ := payload["businessType"].(string)
	businessType := domain.BusinessType(strings.TrimSpace(businessTypeRaw))
	if businessType == "" {
		return nil, professionalApplicationSummary{}, validationError("Укажите тип бизнеса")
	}

	businessName := normalizeOptionalString(stringValuePtr(payload, "businessName"))
	if businessName == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите название бизнеса")
	}

	city := normalizeOptionalString(stringValuePtr(payload, "city"))
	if city == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите город")
	}

	phone := normalizeOptionalString(stringValuePtr(payload, "phone"))
	if phone == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите телефон")
	}

	agreedToTerms, ok := payload["agreedToTerms"].(bool)
	if !ok || !agreedToTerms {
		return nil, professionalApplicationSummary{}, validationError("Необходимо согласие с условиями")
	}

	var activityGroupCode *string
	var activitySubtypeCode *string
	if mapped, exists := legacyBusinessTypeToApplicationActivity[businessType]; exists {
		activityGroupCode = stringPtr(mapped.groupCode)
		activitySubtypeCode = stringPtr(mapped.subtypeCode)
	}

	normalized := domain.JSONMap{
		"businessType":  string(businessType),
		"businessName":  *businessName,
		"city":          *city,
		"phone":         *phone,
		"agreedToTerms": true,
	}
	if address := normalizeOptionalString(stringValuePtr(payload, "address")); address != nil {
		normalized["address"] = *address
	}
	if contactPerson := normalizeOptionalString(stringValuePtr(payload, "contactPerson")); contactPerson != nil {
		normalized["contactPerson"] = *contactPerson
	}
	if email := normalizeOptionalString(stringValuePtr(payload, "email")); email != nil {
		normalized["email"] = *email
	}
	if comment := normalizeOptionalString(stringValuePtr(payload, "comment")); comment != nil {
		normalized["comment"] = *comment
	}

	return normalized, professionalApplicationSummary{
		activityGroupCode:    activityGroupCode,
		activitySubtypeCode:  activitySubtypeCode,
		applicantDisplayName: *businessName,
		contactPhone:         *phone,
		contactEmail:         normalizeOptionalString(stringValuePtr(payload, "email")),
		city:                 city,
		legacyBusinessType:   businessType,
	}, nil
}

func (uc *ProfessionalApplicationUseCase) validateV2Payload(
	ctx context.Context,
	user *domain.User,
	payload domain.JSONMap,
) (domain.JSONMap, professionalApplicationSummary, error) {
	groupCode := normalizeOptionalString(stringValuePtr(payload, "activityGroupCode"))
	if groupCode == nil {
		return nil, professionalApplicationSummary{}, validationError("Выберите главный тип деятельности")
	}
	subtypeCode := normalizeOptionalString(stringValuePtr(payload, "activitySubtypeCode"))
	if subtypeCode == nil {
		return nil, professionalApplicationSummary{}, validationError("Выберите подтип деятельности")
	}

	resolvedBusinessType, err := uc.resolveActivity(ctx, *groupCode, *subtypeCode)
	if err != nil {
		return nil, professionalApplicationSummary{}, err
	}

	city := normalizeOptionalString(stringValuePtr(payload, "city"))
	if city == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите город")
	}
	phone := normalizeOptionalString(stringValuePtr(payload, "phone"))
	if phone == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите телефон")
	}
	agreedToTerms, ok := payload["agreedToTerms"].(bool)
	if !ok || !agreedToTerms {
		return nil, professionalApplicationSummary{}, validationError("Необходимо согласие с условиями")
	}

	normalized := domain.JSONMap{
		"activityGroupCode":   *groupCode,
		"activitySubtypeCode": *subtypeCode,
		"city":                *city,
		"phone":               *phone,
		"agreedToTerms":       true,
	}
	if address := normalizeOptionalString(stringValuePtr(payload, "address")); address != nil {
		normalized["address"] = *address
	}
	if comment := normalizeOptionalString(stringValuePtr(payload, "comment")); comment != nil {
		normalized["comment"] = *comment
	}

	summary := professionalApplicationSummary{
		activityGroupCode:   groupCode,
		activitySubtypeCode: subtypeCode,
		contactPhone:        *phone,
		city:                city,
		legacyBusinessType:  resolvedBusinessType,
	}

	if *groupCode == "private_executor" {
		applicantName := normalizeOptionalString(stringValuePtr(payload, "applicantName"))
		if applicantName == nil && user != nil && user.Name != nil {
			applicantName = normalizeOptionalString(user.Name)
		}
		if applicantName == nil {
			return nil, professionalApplicationSummary{}, validationError("Укажите имя исполнителя")
		}
		normalized["applicantName"] = *applicantName
		summary.applicantDisplayName = *applicantName
		return normalized, summary, nil
	}

	businessName := normalizeOptionalString(stringValuePtr(payload, "businessName"))
	if businessName == nil {
		return nil, professionalApplicationSummary{}, validationError("Укажите название бизнеса")
	}
	yandexMapsURL := normalizeOptionalString(stringValuePtr(payload, "yandexMapsUrl"))
	if yandexMapsURL != nil {
		if err := validateYandexMapsURL(*yandexMapsURL); err != nil {
			return nil, professionalApplicationSummary{}, err
		}
	}

	normalized["businessName"] = *businessName
	if yandexMapsURL != nil {
		normalized["yandexMapsUrl"] = *yandexMapsURL
	}
	summary.applicantDisplayName = *businessName
	return normalized, summary, nil
}

func (uc *ProfessionalApplicationUseCase) resolveActivity(
	ctx context.Context,
	groupCode string,
	subtypeCode string,
) (domain.BusinessType, error) {
	group, err := uc.activityGroupRepo.GetByCode(ctx, groupCode)
	if err != nil || group == nil || !group.IsActive {
		return "", validationError("Выбранный главный тип деятельности недоступен")
	}
	subtype, err := uc.activitySubtypeRepo.GetByGroupAndCode(ctx, group.ID, subtypeCode)
	if err != nil || subtype == nil || !subtype.IsActive {
		return "", validationError("Выбранный подтип не относится к указанному типу деятельности")
	}
	allowedSubtypes, ok := supportedBusinessApplicationSubtypes[group.Code]
	if !ok {
		return "", validationError("Выбранный тип деятельности пока не поддерживается формой заявки")
	}
	derivedBusinessType, ok := allowedSubtypes[subtype.Code]
	if !ok {
		return "", validationError("Выбранный подтип деятельности пока не поддерживается формой заявки")
	}
	return derivedBusinessType, nil
}

func (uc *ProfessionalApplicationUseCase) buildEnvelopeFromLegacyRequest(
	user *domain.User,
	req *domain.CreateBusinessApplicationRequest,
) (*domain.ProfessionalApplicationEnvelopeRequest, bool, error) {
	if req == nil {
		return nil, false, validationError("Тело запроса обязательно")
	}

	if strings.TrimSpace(req.ActivityGroupCode) != "" || strings.TrimSpace(req.ActivitySubtypeCode) != "" {
		payload := domain.JSONMap{
			"activityGroupCode":   strings.TrimSpace(req.ActivityGroupCode),
			"activitySubtypeCode": strings.TrimSpace(req.ActivitySubtypeCode),
			"city":                strings.TrimSpace(req.City),
			"phone":               strings.TrimSpace(req.Phone),
			"agreedToTerms":       req.AgreedToTerms,
		}
		if address := normalizeOptionalString(req.Address); address != nil {
			payload["address"] = *address
		}
		if comment := normalizeOptionalString(req.Comment); comment != nil {
			payload["comment"] = *comment
		}
		if strings.TrimSpace(req.ActivityGroupCode) == "private_executor" {
			if applicantName := resolvedApplicantName(user, req.ApplicantName); applicantName != nil {
				payload["applicantName"] = *applicantName
			}
		} else {
			if businessName := normalizeOptionalString(req.BusinessName); businessName != nil {
				payload["businessName"] = *businessName
			}
			if yandexMapsURL := normalizeOptionalString(req.YandexMapsURL); yandexMapsURL != nil {
				payload["yandexMapsUrl"] = *yandexMapsURL
			}
		}
		return &domain.ProfessionalApplicationEnvelopeRequest{
			SchemaKey:     defaultProfessionalApplicationSchemaKey,
			SchemaVersion: 2,
			Payload:       payload,
		}, false, nil
	}

	payload := domain.JSONMap{
		"businessType":  string(req.BusinessType),
		"city":          strings.TrimSpace(req.City),
		"phone":         strings.TrimSpace(req.Phone),
		"agreedToTerms": req.AgreedToTerms,
	}
	if businessName := normalizeOptionalString(req.BusinessName); businessName != nil {
		payload["businessName"] = *businessName
	}
	if address := normalizeOptionalString(req.Address); address != nil {
		payload["address"] = *address
	}
	if contactPerson := normalizeOptionalString(req.ContactPerson); contactPerson != nil {
		payload["contactPerson"] = *contactPerson
	}
	if email := normalizeOptionalString(req.Email); email != nil {
		payload["email"] = *email
	}
	if comment := normalizeOptionalString(req.Comment); comment != nil {
		payload["comment"] = *comment
	}
	return &domain.ProfessionalApplicationEnvelopeRequest{
		SchemaKey:     defaultProfessionalApplicationSchemaKey,
		SchemaVersion: 1,
		Payload:       payload,
	}, true, nil
}

func (uc *ProfessionalApplicationUseCase) buildCurrentResponse(
	app *domain.ProfessionalApplication,
	revision *domain.ProfessionalApplicationRevision,
) *domain.ProfessionalApplicationsMeCurrentResponse {
	if app == nil {
		return nil
	}
	return &domain.ProfessionalApplicationsMeCurrentResponse{
		ID:               app.ID,
		Status:           app.Status,
		DecisionComment:  app.DecisionComment,
		LastSubmissionAt: app.LastSubmissionAt.Format(time.RFC3339),
		CurrentRevision:  uc.buildRevisionResponse(revision),
	}
}

func (uc *ProfessionalApplicationUseCase) buildHistoryResponse(
	app *domain.ProfessionalApplication,
) *domain.ProfessionalApplicationsMeHistoryItem {
	return &domain.ProfessionalApplicationsMeHistoryItem{
		ID:              app.ID,
		Status:          app.Status,
		DecisionComment: app.DecisionComment,
		ResolvedAt:      formatTimePtr(app.ResolvedAt),
	}
}

func (uc *ProfessionalApplicationUseCase) buildModerationCaseResponse(
	row *repository.ModerationCaseListRow,
) *domain.ModerationCaseResponse {
	if row == nil {
		return nil
	}
	return &domain.ModerationCaseResponse{
		ID:                   row.ID,
		Domain:               row.Domain,
		SubjectID:            row.SubjectID,
		QueueStatus:          row.QueueStatus,
		DecisionStatus:       row.DecisionStatus,
		Priority:             row.Priority,
		AssigneeUserID:       row.AssigneeUserID,
		AssigneeDisplayName:  row.AssigneeDisplayName,
		ReviewTakenAt:        formatTimePtr(row.ReviewTakenAt),
		OpenedAt:             row.OpenedAt.Format(time.RFC3339),
		LastActivityAt:       row.LastActivityAt.Format(time.RFC3339),
		ResolvedAt:           formatTimePtr(row.ResolvedAt),
		CreatedAt:            row.CreatedAt.Format(time.RFC3339),
		ApplicantDisplayName: row.ApplicantDisplayName,
		ActivityGroupCode:    row.ActivityGroupCode,
		ActivitySubtypeCode:  row.ActivitySubtypeCode,
		ContactPhone:         row.ContactPhone,
		ContactEmail:         row.ContactEmail,
	}
}

func (uc *ProfessionalApplicationUseCase) buildRevisionResponse(
	revision *domain.ProfessionalApplicationRevision,
) *domain.ProfessionalApplicationRevisionResponse {
	if revision == nil {
		return nil
	}
	return &domain.ProfessionalApplicationRevisionResponse{
		ID:            revision.ID,
		RevisionNo:    revision.RevisionNo,
		SchemaKey:     revision.SchemaKey,
		SchemaVersion: revision.SchemaVersion,
		Payload:       decodeStoredJSONMap(revision.PayloadJSON),
		CreatedAt:     revision.CreatedAt.Format(time.RFC3339),
	}
}

func (uc *ProfessionalApplicationUseCase) buildRevisionHistoryResponses(
	revisions []*domain.ProfessionalApplicationRevision,
) []*domain.ProfessionalApplicationRevisionResponse {
	out := make([]*domain.ProfessionalApplicationRevisionResponse, 0, len(revisions))
	for _, revision := range revisions {
		out = append(out, uc.buildRevisionResponse(revision))
	}
	return out
}

func (uc *ProfessionalApplicationUseCase) buildAuditEventResponses(
	rows []*repository.ModerationCaseEventRow,
) []*domain.ModerationAuditEventResponse {
	out := make([]*domain.ModerationAuditEventResponse, 0, len(rows))
	for _, row := range rows {
		out = append(out, &domain.ModerationAuditEventResponse{
			ID:                 row.ID,
			CaseID:             row.CaseID,
			ActorUserID:        row.ActorUserID,
			ActorDisplayName:   row.ActorDisplayName,
			EventType:          row.EventType,
			FromQueueStatus:    row.FromQueueStatus,
			ToQueueStatus:      row.ToQueueStatus,
			FromDecisionStatus: row.FromDecisionStatus,
			ToDecisionStatus:   row.ToDecisionStatus,
			Comment:            row.Comment,
			CreatedAt:          row.CreatedAt.Format(time.RFC3339),
		})
	}
	return out
}

func (uc *ProfessionalApplicationUseCase) buildApplicantInfo(
	app *domain.ProfessionalApplication,
	user *domain.User,
) *domain.ModerationCaseApplicantInfo {
	if app == nil {
		return nil
	}
	displayName := decodeStoredString(app.ApplicantDisplayName)
	if displayName == "" && user != nil {
		if fallback := userDisplayName(user); fallback != nil {
			displayName = *fallback
		}
	}
	phone := app.ContactPhone
	if phone == "" && user != nil {
		phone = user.Phone
	}
	return &domain.ModerationCaseApplicantInfo{
		UserID:      app.UserID,
		DisplayName: displayName,
		Phone:       phone,
	}
}

func buildSummaryJSON(summary professionalApplicationSummary) domain.JSONMap {
	result := domain.JSONMap{
		"applicantDisplayName": summary.applicantDisplayName,
		"contactPhone":         summary.contactPhone,
	}
	if summary.activityGroupCode != nil {
		result["activityGroupCode"] = *summary.activityGroupCode
	}
	if summary.activitySubtypeCode != nil {
		result["activitySubtypeCode"] = *summary.activitySubtypeCode
	}
	if summary.contactEmail != nil {
		result["contactEmail"] = *summary.contactEmail
	}
	if summary.city != nil {
		result["city"] = *summary.city
	}
	return result
}

func sanitizeJSONMap(input domain.JSONMap) domain.JSONMap {
	if input == nil {
		return domain.JSONMap{}
	}
	out := make(domain.JSONMap, len(input))
	for key, value := range input {
		out[key] = sanitizeJSONValue(key, value)
	}
	return out
}

func sanitizeJSONValue(key string, value interface{}) interface{} {
	switch v := value.(type) {
	case string:
		clean := strings.TrimSpace(v)
		clean = strings.ReplaceAll(clean, "\u0000", "")
		if strings.Contains(strings.ToLower(key), "url") {
			if parsed, err := neturl.Parse(clean); err == nil {
				scheme := strings.ToLower(parsed.Scheme)
				if scheme == "http" || scheme == "https" {
					return clean
				}
			}
			return ""
		}
		// JSON/API values are not HTML. React and API consumers escape text at
		// the rendering boundary; storing escaped values makes quotes visible as
		// strings such as "&#34;". Unescape once for compatibility with old data.
		return html.UnescapeString(clean)
	case map[string]interface{}:
		return sanitizeJSONMap(domain.JSONMap(v))
	case []interface{}:
		out := make([]interface{}, 0, len(v))
		for _, item := range v {
			out = append(out, sanitizeJSONValue(key, item))
		}
		return out
	default:
		return value
	}
}

// decodeStoredJSONMap restores text saved by the former HTML escaping layer.
// It keeps new values unchanged and repairs legacy values such as
// "&#34;Мустанг&#34;" when they are read back from the database.
func decodeStoredJSONMap(input domain.JSONMap) domain.JSONMap {
	if input == nil {
		return nil
	}
	out := make(domain.JSONMap, len(input))
	for key, value := range input {
		out[key] = decodeStoredJSONValue(value)
	}
	return out
}

func decodeStoredJSONValue(value interface{}) interface{} {
	switch v := value.(type) {
	case string:
		return decodeStoredString(v)
	case map[string]interface{}:
		return decodeStoredJSONMap(domain.JSONMap(v))
	case []interface{}:
		out := make([]interface{}, 0, len(v))
		for _, item := range v {
			out = append(out, decodeStoredJSONValue(item))
		}
		return out
	default:
		return value
	}
}

func decodeStoredString(value string) string {
	return html.UnescapeString(value)
}

func stringValuePtr(payload domain.JSONMap, key string) *string {
	if payload == nil {
		return nil
	}
	raw, ok := payload[key]
	if !ok || raw == nil {
		return nil
	}
	value, ok := raw.(string)
	if !ok {
		return nil
	}
	return &value
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func normalizeOffset(offset int) int {
	if offset < 0 {
		return 0
	}
	return offset
}

func userDisplayName(user *domain.User) *string {
	if user == nil {
		return nil
	}
	if normalized := normalizeOptionalString(user.Name); normalized != nil {
		return normalized
	}
	if phone := strings.TrimSpace(user.Phone); phone != "" {
		return &phone
	}
	return nil
}

func buildAssignmentComment(assigneeUserID *string) *string {
	if assigneeUserID == nil {
		return stringPtr("assignment cleared")
	}
	return stringPtr("assignment updated")
}

func stringPtrIfNotEmpty(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return &value
}

func formatTimePtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(time.RFC3339)
	return &formatted
}

func stringPtrEquals(left, right *string) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return *left == *right
}

func statusPtr(status domain.ProfessionalApplicationStatus) *domain.ProfessionalApplicationStatus {
	return &status
}

func mapProfessionalApplicationError(err error) error {
	if err == nil {
		return nil
	}
	if appErr, ok := err.(*apperrors.AppError); ok {
		return appErr
	}
	return apperrors.ErrInternalServer
}
