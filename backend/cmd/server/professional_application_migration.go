package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const migrationProfessionalApplicationSchemaKey = "professional_cabinet.default"
const migrationSystemActorUserID = "00000000-0000-0000-0000-000000000000"

func applyProfessionalApplicationMigration(db *gorm.DB) error {
	indexStatements := []string{
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_applications_active_user
			ON professional_applications(user_id)
			WHERE status IN ('pending', 'needs_revision')`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_application_revisions_application_revision
			ON professional_application_revisions(application_id, revision_no)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_application_schemas_active_key
			ON professional_application_schemas(schema_key)
			WHERE is_active = TRUE`,
	}
	for _, statement := range indexStatements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}

	if err := seedProfessionalApplicationSchemas(db); err != nil {
		return err
	}

	if err := migrateLegacyBusinessApplications(db); err != nil {
		return err
	}
	if err := syncApprovedProfessionalUsers(db); err != nil {
		return err
	}
	return validateMigrationCounts(db)
}

func syncApprovedProfessionalUsers(db *gorm.DB) error {
	return db.Exec(`
		WITH latest_approved AS (
			SELECT DISTINCT ON (user_id)
				user_id,
				activity_group_code
			FROM professional_applications
			WHERE status = 'approved'
			ORDER BY user_id, last_submission_at DESC, updated_at DESC, created_at DESC
		),
		resolved_roles AS (
			SELECT
				user_id,
				CASE activity_group_code
					WHEN 'private_executor' THEN 'master'
					WHEN 'auto_wash' THEN 'auto_wash'
					WHEN 'auto_shop' THEN 'auto_shop'
					WHEN 'auto_service' THEN 'auto_service'
					ELSE NULL
				END AS resolved_role
			FROM latest_approved
		)
		UPDATE users AS u
		SET
			is_professional = TRUE,
			role = COALESCE(r.resolved_role, u.role),
			updated_at = NOW()
		FROM resolved_roles AS r
		WHERE u.id = r.user_id
			AND u.role NOT IN ('admin', 'moderator')
			AND (
				u.is_professional IS DISTINCT FROM TRUE
				OR (r.resolved_role IS NOT NULL AND u.role IS DISTINCT FROM r.resolved_role)
			)
	`).Error
}

func seedProfessionalApplicationSchemas(db *gorm.DB) error {
	schemas := []*domain.ProfessionalApplicationSchema{
		{
			SchemaKey:     migrationProfessionalApplicationSchemaKey,
			SchemaVersion: 1,
			JSONSchema: domain.JSONMap{
				"type": "object",
				"required": []string{
					"businessType",
					"businessName",
					"city",
					"phone",
					"agreedToTerms",
				},
				"properties": domain.JSONMap{
					"businessType":  domain.JSONMap{"type": "string"},
					"businessName":  domain.JSONMap{"type": "string"},
					"city":          domain.JSONMap{"type": "string"},
					"address":       domain.JSONMap{"type": "string"},
					"phone":         domain.JSONMap{"type": "string"},
					"contactPerson": domain.JSONMap{"type": "string"},
					"email":         domain.JSONMap{"type": "string"},
					"comment":       domain.JSONMap{"type": "string"},
					"agreedToTerms": domain.JSONMap{"type": "boolean"},
				},
			},
			FieldMappings: domain.JSONMap{
				"applicantDisplayName": "businessName",
				"contactPhone":         "phone",
				"contactEmail":         "email",
				"city":                 "city",
				"activityGroupCode":    "legacy_business_type_lookup",
			},
			UISchema: domain.JSONMap{
				"variant": "legacy_v1",
			},
			IsActive: false,
		},
		{
			SchemaKey:     migrationProfessionalApplicationSchemaKey,
			SchemaVersion: 2,
			JSONSchema: domain.JSONMap{
				"type": "object",
				"required": []string{
					"activityGroupCode",
					"activitySubtypeCode",
					"city",
					"phone",
					"agreedToTerms",
				},
				"properties": domain.JSONMap{
					"activityGroupCode":   domain.JSONMap{"type": "string"},
					"activitySubtypeCode": domain.JSONMap{"type": "string"},
					"businessName":        domain.JSONMap{"type": "string"},
					"applicantName":       domain.JSONMap{"type": "string"},
					"city":                domain.JSONMap{"type": "string"},
					"address":             domain.JSONMap{"type": "string"},
					"phone":               domain.JSONMap{"type": "string"},
					"yandexMapsUrl":       domain.JSONMap{"type": "string"},
					"comment":             domain.JSONMap{"type": "string"},
					"agreedToTerms":       domain.JSONMap{"type": "boolean"},
				},
			},
			FieldMappings: domain.JSONMap{
				"applicantDisplayName": "businessName|applicantName",
				"contactPhone":         "phone",
				"city":                 "city",
				"activityGroupCode":    "activityGroupCode",
				"activitySubtypeCode":  "activitySubtypeCode",
			},
			UISchema: domain.JSONMap{
				"variant": "v2",
			},
			IsActive: true,
		},
	}

	for _, schema := range schemas {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "schema_key"},
				{Name: "schema_version"},
			},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"json_schema":    schema.JSONSchema,
				"field_mappings": schema.FieldMappings,
				"ui_schema":      schema.UISchema,
				"is_active":      schema.IsActive,
			}),
		}).Create(schema).Error; err != nil {
			return err
		}
	}

	return nil
}

func migrateLegacyBusinessApplications(db *gorm.DB) error {
	var legacyApps []*domain.BusinessApplication
	if err := db.Order("created_at ASC").Find(&legacyApps).Error; err != nil {
		return err
	}

	for _, legacyApp := range legacyApps {
		var exists int64
		if err := db.Model(&domain.ProfessionalApplication{}).
			Where("id = ?", legacyApp.ID).
			Count(&exists).Error; err != nil {
			return err
		}
		if exists > 0 {
			continue
		}

		payload, schemaVersion := buildLegacyMigrationPayload(legacyApp)
		summary := buildLegacyMigrationSummary(legacyApp, payload)
		now := legacyApp.UpdatedAt
		resolvedAt := legacyResolvedAt(legacyApp)

		app := &domain.ProfessionalApplication{
			ID:                     legacyApp.ID,
			UserID:                 legacyApp.UserID,
			Status:                 mapLegacyApplicationStatus(legacyApp.Status),
			ActivityGroupCode:      summary.activityGroupCode,
			ActivitySubtypeCode:    summary.activitySubtypeCode,
			ApplicantDisplayName:   summary.applicantDisplayName,
			ContactPhone:           summary.contactPhone,
			ContactEmail:           summary.contactEmail,
			City:                   summary.city,
			SubmittedSchemaKey:     migrationProfessionalApplicationSchemaKey,
			SubmittedSchemaVersion: schemaVersion,
			DecisionComment:        legacyApp.RejectionReason,
			LastSubmissionAt:       legacyApp.CreatedAt,
			ResolvedAt:             resolvedAt,
			CreatedAt:              legacyApp.CreatedAt,
			UpdatedAt:              now,
		}

		revision := &domain.ProfessionalApplicationRevision{
			ApplicationID:     legacyApp.ID,
			RevisionNo:        1,
			SchemaKey:         migrationProfessionalApplicationSchemaKey,
			SchemaVersion:     schemaVersion,
			PayloadJSON:       payload,
			SummaryJSON:       buildMigrationSummaryJSON(summary),
			SubmittedByUserID: legacyApp.UserID,
			CreatedAt:         legacyApp.CreatedAt,
		}

		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(app).Error; err != nil {
				return err
			}
			if err := tx.Create(revision).Error; err != nil {
				return err
			}

			app.CurrentRevisionID = &revision.ID
			if legacyApp.Status == domain.BusinessApplicationStatusPending || legacyApp.Status == domain.BusinessApplicationStatusNeedsRevision {
				queueStatus := domain.ModerationQueueStatusOpen
				if legacyApp.Status == domain.BusinessApplicationStatusNeedsRevision {
					queueStatus = domain.ModerationQueueStatusWaitingSubmitter
				}
				moderationCase := &domain.ModerationCase{
					Domain:         domain.ModerationDomainProfessionalApplication,
					SubjectID:      app.ID,
					QueueStatus:    queueStatus,
					DecisionStatus: mapLegacyApplicationStatus(legacyApp.Status),
					Priority:       domain.ModerationPriorityNormal,
					OpenedAt:       legacyApp.CreatedAt,
					LastActivityAt: legacyCaseLastActivityAt(legacyApp),
					ResolvedAt:     legacyResolvedAt(legacyApp),
					CreatedAt:      legacyApp.CreatedAt,
					UpdatedAt:      legacyApp.UpdatedAt,
				}
				if err := tx.Create(moderationCase).Error; err != nil {
					return err
				}
				app.ModerationCaseID = &moderationCase.ID
				if err := tx.Create(&domain.ModerationCaseEvent{
					CaseID:      moderationCase.ID,
					Domain:      moderationCase.Domain,
					SubjectID:   moderationCase.SubjectID,
					ActorUserID: legacyApp.UserID,
					EventType:   domain.ModerationCaseEventTypeCaseCreated,
					CreatedAt:   legacyApp.CreatedAt,
				}).Error; err != nil {
					return err
				}
				if legacyApp.Status == domain.BusinessApplicationStatusNeedsRevision {
					fromDecision := domain.ProfessionalApplicationStatusPending
					toDecision := domain.ProfessionalApplicationStatusNeedsRevision
					fromQueue := domain.ModerationQueueStatusOpen
					toQueue := domain.ModerationQueueStatusWaitingSubmitter
					if err := tx.Create(&domain.ModerationCaseEvent{
						CaseID:             moderationCase.ID,
						Domain:             moderationCase.Domain,
						SubjectID:          moderationCase.SubjectID,
						ActorUserID:        migrationSystemActorUserID,
						EventType:          domain.ModerationCaseEventTypeDecisionNeedsRevision,
						FromQueueStatus:    &fromQueue,
						ToQueueStatus:      &toQueue,
						FromDecisionStatus: &fromDecision,
						ToDecisionStatus:   &toDecision,
						Comment:            legacyApp.RejectionReason,
						CreatedAt:          legacyCaseLastActivityAt(legacyApp),
					}).Error; err != nil {
						return err
					}
				}
			}

			return tx.Model(&domain.ProfessionalApplication{}).
				Where("id = ?", app.ID).
				Updates(map[string]interface{}{
					"current_revision_id": app.CurrentRevisionID,
					"moderation_case_id":  app.ModerationCaseID,
				}).Error
		}); err != nil {
			return err
		}
	}

	return nil
}

func buildLegacyMigrationPayload(app *domain.BusinessApplication) (domain.JSONMap, int) {
	isV2Shape := (app.ActivityGroupCode != nil && *app.ActivityGroupCode != "") ||
		(app.ActivitySubtypeCode != nil && *app.ActivitySubtypeCode != "") ||
		app.ApplicantName != nil ||
		app.YandexMapsURL != nil

	if isV2Shape {
		payload := domain.JSONMap{
			"city":          app.City,
			"phone":         app.Phone,
			"agreedToTerms": app.AgreedToTerms,
		}
		if app.ActivityGroupCode != nil {
			payload["activityGroupCode"] = *app.ActivityGroupCode
		}
		if app.ActivitySubtypeCode != nil {
			payload["activitySubtypeCode"] = *app.ActivitySubtypeCode
		}
		if app.BusinessName != nil {
			payload["businessName"] = *app.BusinessName
		}
		if app.ApplicantName != nil {
			payload["applicantName"] = *app.ApplicantName
		}
		if app.Address != nil {
			payload["address"] = *app.Address
		}
		if app.YandexMapsURL != nil {
			payload["yandexMapsUrl"] = *app.YandexMapsURL
		}
		if app.Comment != nil {
			payload["comment"] = *app.Comment
		}
		return payload, 2
	}

	payload := domain.JSONMap{
		"businessType":  string(app.BusinessType),
		"city":          app.City,
		"phone":         app.Phone,
		"agreedToTerms": app.AgreedToTerms,
	}
	if app.BusinessName != nil {
		payload["businessName"] = *app.BusinessName
	}
	if app.Address != nil {
		payload["address"] = *app.Address
	}
	if app.ContactPerson != nil {
		payload["contactPerson"] = *app.ContactPerson
	}
	if app.Email != nil {
		payload["email"] = *app.Email
	}
	if app.Comment != nil {
		payload["comment"] = *app.Comment
	}
	return payload, 1
}

func buildLegacyMigrationSummary(
	app *domain.BusinessApplication,
	payload domain.JSONMap,
) professionalApplicationSummaryMigration {
	summary := professionalApplicationSummaryMigration{
		applicantDisplayName: strings.TrimSpace(stringValueFromMap(payload, "businessName")),
		contactPhone:         strings.TrimSpace(stringValueFromMap(payload, "phone")),
		city:                 stringPtrOrNil(app.City),
	}

	if email := strings.TrimSpace(stringValueFromMap(payload, "email")); email != "" {
		summary.contactEmail = &email
	}

	if activityGroupCode := strings.TrimSpace(stringValueFromMap(payload, "activityGroupCode")); activityGroupCode != "" {
		summary.activityGroupCode = &activityGroupCode
	}
	if activitySubtypeCode := strings.TrimSpace(stringValueFromMap(payload, "activitySubtypeCode")); activitySubtypeCode != "" {
		summary.activitySubtypeCode = &activitySubtypeCode
	}
	if applicantName := strings.TrimSpace(stringValueFromMap(payload, "applicantName")); applicantName != "" {
		summary.applicantDisplayName = applicantName
	}
	if summary.activityGroupCode == nil {
		if mapped, ok := legacyBusinessTypeToApplicationActivity[app.BusinessType]; ok {
			summary.activityGroupCode = &mapped.groupCode
			if summary.activitySubtypeCode == nil && mapped.subtypeCode != "" {
				summary.activitySubtypeCode = &mapped.subtypeCode
			}
		}
	}
	return summary
}

type professionalApplicationSummaryMigration struct {
	activityGroupCode    *string
	activitySubtypeCode  *string
	applicantDisplayName string
	contactPhone         string
	contactEmail         *string
	city                 *string
}

func buildMigrationSummaryJSON(summary professionalApplicationSummaryMigration) domain.JSONMap {
	out := domain.JSONMap{
		"applicantDisplayName": summary.applicantDisplayName,
		"contactPhone":         summary.contactPhone,
	}
	if summary.activityGroupCode != nil {
		out["activityGroupCode"] = *summary.activityGroupCode
	}
	if summary.activitySubtypeCode != nil {
		out["activitySubtypeCode"] = *summary.activitySubtypeCode
	}
	if summary.contactEmail != nil {
		out["contactEmail"] = *summary.contactEmail
	}
	if summary.city != nil {
		out["city"] = *summary.city
	}
	return out
}

func mapLegacyApplicationStatus(status domain.BusinessApplicationStatus) domain.ProfessionalApplicationStatus {
	switch status {
	case domain.BusinessApplicationStatusApproved:
		return domain.ProfessionalApplicationStatusApproved
	case domain.BusinessApplicationStatusRejected:
		return domain.ProfessionalApplicationStatusRejected
	case domain.BusinessApplicationStatusNeedsRevision:
		return domain.ProfessionalApplicationStatusNeedsRevision
	default:
		return domain.ProfessionalApplicationStatusPending
	}
}

func legacyResolvedAt(app *domain.BusinessApplication) *time.Time {
	switch app.Status {
	case domain.BusinessApplicationStatusApproved, domain.BusinessApplicationStatusRejected:
		if app.ReviewedAt != nil {
			return app.ReviewedAt
		}
		if !app.UpdatedAt.IsZero() {
			resolvedAt := app.UpdatedAt
			return &resolvedAt
		}
	}
	return nil
}

func legacyCaseLastActivityAt(app *domain.BusinessApplication) time.Time {
	if app.ReviewedAt != nil {
		return *app.ReviewedAt
	}
	if !app.UpdatedAt.IsZero() {
		return app.UpdatedAt
	}
	return app.CreatedAt
}

func stringValueFromMap(payload domain.JSONMap, key string) string {
	if value, ok := payload[key].(string); ok {
		return value
	}
	return ""
}

func stringPtrOrNil(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

var legacyBusinessTypeToApplicationActivity = map[domain.BusinessType]struct {
	groupCode   string
	subtypeCode string
}{
	domain.BusinessTypeAutoService: {groupCode: "auto_service", subtypeCode: "general_service"},
	domain.BusinessTypeAutoWash:    {groupCode: "auto_wash", subtypeCode: "classic"},
	domain.BusinessTypeAutoShop:    {groupCode: "auto_shop", subtypeCode: "general"},
	domain.BusinessTypeTireFitting: {groupCode: "auto_service", subtypeCode: "tire_fitting"},
	domain.BusinessTypeDetailing:   {groupCode: "auto_service", subtypeCode: "detailing"},
	domain.BusinessTypeStation:     {groupCode: "auto_service", subtypeCode: "general_service"},
	domain.BusinessTypeMaster:      {groupCode: "private_executor", subtypeCode: "master"},
}

func validateMigrationCounts(db *gorm.DB) error {
	var sourceCount int64
	if err := db.Model(&domain.BusinessApplication{}).Count(&sourceCount).Error; err != nil {
		return err
	}
	var targetCount int64
	if err := db.Model(&domain.ProfessionalApplication{}).Count(&targetCount).Error; err != nil {
		return err
	}
	if sourceCount > 0 && targetCount < sourceCount {
		return fmt.Errorf("professional application migration incomplete: source=%d target=%d", sourceCount, targetCount)
	}
	return nil
}
