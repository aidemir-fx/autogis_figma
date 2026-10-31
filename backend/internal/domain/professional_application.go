package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

const ModerationDomainProfessionalApplication = "professional_application"

type JSONMap map[string]interface{}

func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return []byte("null"), nil
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func (m *JSONMap) Scan(value interface{}) error {
	if m == nil {
		return fmt.Errorf("json map scan target is nil")
	}
	switch v := value.(type) {
	case nil:
		*m = nil
		return nil
	case []byte:
		if len(v) == 0 {
			*m = nil
			return nil
		}
		return json.Unmarshal(v, m)
	case string:
		if v == "" {
			*m = nil
			return nil
		}
		return json.Unmarshal([]byte(v), m)
	default:
		return fmt.Errorf("unsupported JSONMap source type %T", value)
	}
}

func (m JSONMap) Clone() JSONMap {
	if m == nil {
		return nil
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return nil
	}
	var cloned JSONMap
	if err := json.Unmarshal(raw, &cloned); err != nil {
		return nil
	}
	return cloned
}

type ProfessionalApplicationStatus string

const (
	ProfessionalApplicationStatusPending       ProfessionalApplicationStatus = "pending"
	ProfessionalApplicationStatusNeedsRevision ProfessionalApplicationStatus = "needs_revision"
	ProfessionalApplicationStatusApproved      ProfessionalApplicationStatus = "approved"
	ProfessionalApplicationStatusRejected      ProfessionalApplicationStatus = "rejected"
)

type ModerationQueueStatus string

const (
	ModerationQueueStatusOpen             ModerationQueueStatus = "open"
	ModerationQueueStatusInReview         ModerationQueueStatus = "in_review"
	ModerationQueueStatusWaitingSubmitter ModerationQueueStatus = "waiting_submitter"
	ModerationQueueStatusResolved         ModerationQueueStatus = "resolved"
)

type ModerationPriority string

const (
	ModerationPriorityNormal ModerationPriority = "normal"
	ModerationPriorityHigh   ModerationPriority = "high"
)

type ModerationCaseEventType string

const (
	ModerationCaseEventTypeCaseCreated           ModerationCaseEventType = "case_created"
	ModerationCaseEventTypeAssigned              ModerationCaseEventType = "assigned"
	ModerationCaseEventTypeTakenIntoReview       ModerationCaseEventType = "taken_into_review"
	ModerationCaseEventTypeReviewReleased        ModerationCaseEventType = "review_released"
	ModerationCaseEventTypeDecisionNeedsRevision ModerationCaseEventType = "decision_needs_revision"
	ModerationCaseEventTypeDecisionApproved      ModerationCaseEventType = "decision_approved"
	ModerationCaseEventTypeDecisionRejected      ModerationCaseEventType = "decision_rejected"
	ModerationCaseEventTypeResubmitted           ModerationCaseEventType = "resubmitted"
)

type ProfessionalApplication struct {
	ID                     string                        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID                 string                        `gorm:"type:uuid;not null;index" json:"userId"`
	Status                 ProfessionalApplicationStatus `gorm:"type:varchar(32);not null;default:'pending';index:idx_prof_apps_status_submission,priority:1" json:"status"`
	CurrentRevisionID      *string                       `gorm:"type:uuid" json:"currentRevisionId,omitempty"`
	ModerationCaseID       *string                       `gorm:"type:uuid" json:"moderationCaseId,omitempty"`
	ActivityGroupCode      *string                       `gorm:"type:varchar(64);index:idx_prof_apps_group_status_submission,priority:1" json:"activityGroupCode,omitempty"`
	ActivitySubtypeCode    *string                       `gorm:"type:varchar(64)" json:"activitySubtypeCode,omitempty"`
	ApplicantDisplayName   string                        `gorm:"type:varchar(255);not null;default:'';index:idx_prof_apps_applicant_name" json:"applicantDisplayName"`
	ContactPhone           string                        `gorm:"type:varchar(64);not null;default:'';index:idx_prof_apps_contact_phone" json:"contactPhone"`
	ContactEmail           *string                       `gorm:"type:varchar(255)" json:"contactEmail,omitempty"`
	City                   *string                       `gorm:"type:varchar(128)" json:"city,omitempty"`
	SubmittedSchemaKey     string                        `gorm:"type:varchar(128);not null" json:"submittedSchemaKey"`
	SubmittedSchemaVersion int                           `gorm:"not null" json:"submittedSchemaVersion"`
	DecisionActorID        *string                       `gorm:"type:uuid" json:"decisionActorId,omitempty"`
	DecisionComment        *string                       `gorm:"type:text" json:"decisionComment,omitempty"`
	LastSubmissionAt       time.Time                     `gorm:"not null;index:idx_prof_apps_status_submission,priority:2,sort:desc;index:idx_prof_apps_group_status_submission,priority:3,sort:desc" json:"lastSubmissionAt"`
	ResolvedAt             *time.Time                    `gorm:"type:timestamptz" json:"resolvedAt,omitempty"`
	CreatedAt              time.Time                     `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt              time.Time                     `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

type ProfessionalApplicationRevision struct {
	ID                string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ApplicationID     string    `gorm:"type:uuid;not null;index:idx_prof_app_revisions_app_revision,priority:1" json:"applicationId"`
	RevisionNo        int       `gorm:"not null;index:idx_prof_app_revisions_app_revision,priority:2,sort:desc" json:"revisionNo"`
	SchemaKey         string    `gorm:"type:varchar(128);not null" json:"schemaKey"`
	SchemaVersion     int       `gorm:"not null" json:"schemaVersion"`
	PayloadJSON       JSONMap   `gorm:"type:jsonb;not null" json:"payload"`
	SummaryJSON       JSONMap   `gorm:"type:jsonb;not null" json:"summary"`
	SubmittedByUserID string    `gorm:"type:uuid;not null" json:"submittedByUserId"`
	CreatedAt         time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type ModerationCase struct {
	ID             string                        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Domain         string                        `gorm:"type:varchar(64);not null;uniqueIndex:uq_moderation_case_domain_subject,priority:1;index:idx_moderation_cases_domain_queue_activity,priority:1" json:"domain"`
	SubjectID      string                        `gorm:"type:uuid;not null;uniqueIndex:uq_moderation_case_domain_subject,priority:2" json:"subjectId"`
	QueueStatus    ModerationQueueStatus         `gorm:"type:varchar(32);not null;default:'open';index:idx_moderation_cases_domain_queue_activity,priority:2;index:idx_moderation_cases_assignee_queue_updated,priority:2" json:"queueStatus"`
	DecisionStatus ProfessionalApplicationStatus `gorm:"type:varchar(32);not null;default:'pending'" json:"decisionStatus"`
	Priority       ModerationPriority            `gorm:"type:varchar(16);not null;default:'normal'" json:"priority"`
	AssigneeUserID *string                       `gorm:"type:uuid;index:idx_moderation_cases_assignee_queue_updated,priority:1" json:"assigneeUserId,omitempty"`
	ReviewTakenAt  *time.Time                    `gorm:"type:timestamptz" json:"reviewTakenAt,omitempty"`
	OpenedAt       time.Time                     `gorm:"not null" json:"openedAt"`
	LastActivityAt time.Time                     `gorm:"not null;index:idx_moderation_cases_domain_queue_activity,priority:3,sort:desc" json:"lastActivityAt"`
	ResolvedAt     *time.Time                    `gorm:"type:timestamptz" json:"resolvedAt,omitempty"`
	CreatedAt      time.Time                     `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt      time.Time                     `gorm:"autoUpdateTime:milli;index:idx_moderation_cases_assignee_queue_updated,priority:3,sort:desc" json:"updatedAt"`
}

type ModerationCaseEvent struct {
	ID                 string                         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	CaseID             string                         `gorm:"type:uuid;not null;index:idx_moderation_case_events_case_created,priority:1" json:"caseId"`
	Domain             string                         `gorm:"type:varchar(64);not null" json:"domain"`
	SubjectID          string                         `gorm:"type:uuid;not null" json:"subjectId"`
	ActorUserID        string                         `gorm:"type:uuid;not null" json:"actorUserId"`
	EventType          ModerationCaseEventType        `gorm:"type:varchar(64);not null" json:"eventType"`
	FromQueueStatus    *ModerationQueueStatus         `gorm:"type:varchar(32)" json:"fromQueueStatus,omitempty"`
	ToQueueStatus      *ModerationQueueStatus         `gorm:"type:varchar(32)" json:"toQueueStatus,omitempty"`
	FromDecisionStatus *ProfessionalApplicationStatus `gorm:"type:varchar(32)" json:"fromDecisionStatus,omitempty"`
	ToDecisionStatus   *ProfessionalApplicationStatus `gorm:"type:varchar(32)" json:"toDecisionStatus,omitempty"`
	Comment            *string                        `gorm:"type:text" json:"comment,omitempty"`
	PayloadJSON        JSONMap                        `gorm:"type:jsonb" json:"payload,omitempty"`
	CreatedAt          time.Time                      `gorm:"autoCreateTime:milli;index:idx_moderation_case_events_case_created,priority:2,sort:desc" json:"createdAt"`
}

type ProfessionalApplicationSchema struct {
	ID            string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	SchemaKey     string    `gorm:"type:varchar(128);not null;uniqueIndex:uq_prof_app_schema_key_version,priority:1;index:idx_prof_app_schema_key_active,priority:1" json:"schemaKey"`
	SchemaVersion int       `gorm:"not null;uniqueIndex:uq_prof_app_schema_key_version,priority:2" json:"schemaVersion"`
	JSONSchema    JSONMap   `gorm:"type:jsonb;not null" json:"jsonSchema"`
	FieldMappings JSONMap   `gorm:"type:jsonb;not null" json:"fieldMappings"`
	UISchema      JSONMap   `gorm:"type:jsonb" json:"uiSchema,omitempty"`
	IsActive      bool      `gorm:"not null;default:false;index:idx_prof_app_schema_key_active,priority:2" json:"isActive"`
	CreatedAt     time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type TokenInvalidation struct {
	UserID        string    `gorm:"primaryKey;type:uuid" json:"userId"`
	InvalidatedAt time.Time `gorm:"not null" json:"invalidatedAt"`
	CreatedAt     time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}
