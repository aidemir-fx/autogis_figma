package domain

type ProfessionalApplicationEnvelopeRequest struct {
	SchemaKey     string  `json:"schemaKey" validate:"required,max=128"`
	SchemaVersion int     `json:"schemaVersion" validate:"required,min=1"`
	Payload       JSONMap `json:"payload" validate:"required"`
}

type ProfessionalApplicationSchemaResponse struct {
	SchemaKey     string  `json:"schemaKey"`
	SchemaVersion int     `json:"schemaVersion"`
	JSONSchema    JSONMap `json:"jsonSchema"`
	UISchema      JSONMap `json:"uiSchema,omitempty"`
}

type ProfessionalApplicationRevisionResponse struct {
	ID            string  `json:"id"`
	RevisionNo    int     `json:"revisionNo"`
	SchemaKey     string  `json:"schemaKey"`
	SchemaVersion int     `json:"schemaVersion"`
	Payload       JSONMap `json:"payload"`
	CreatedAt     string  `json:"createdAt"`
}

type ProfessionalApplicationsMeCurrentResponse struct {
	ID               string                                   `json:"id"`
	Status           ProfessionalApplicationStatus            `json:"status"`
	DecisionComment  *string                                  `json:"decisionComment,omitempty"`
	LastSubmissionAt string                                   `json:"lastSubmissionAt"`
	CurrentRevision  *ProfessionalApplicationRevisionResponse `json:"currentRevision,omitempty"`
}

type ProfessionalApplicationsMeHistoryItem struct {
	ID              string                        `json:"id"`
	Status          ProfessionalApplicationStatus `json:"status"`
	DecisionComment *string                       `json:"decisionComment,omitempty"`
	ResolvedAt      *string                       `json:"resolvedAt,omitempty"`
}

type ProfessionalApplicationsMeResponse struct {
	Current *ProfessionalApplicationsMeCurrentResponse `json:"current,omitempty"`
	History []*ProfessionalApplicationsMeHistoryItem   `json:"history"`
}

type ModerationCasesListFilters struct {
	Domain              string
	QueueStatus         *ModerationQueueStatus
	DecisionStatus      *ProfessionalApplicationStatus
	AssigneeUserID      *string
	ActivityGroupCode   *string
	ActivitySubtypeCode *string
	Query               *string
	DateFrom            *string
	DateTo              *string
	Limit               int
	Offset              int
}

type ModerationCaseResponse struct {
	ID                   string                        `json:"id"`
	Domain               string                        `json:"domain"`
	SubjectID            string                        `json:"subjectId"`
	QueueStatus          ModerationQueueStatus         `json:"queueStatus"`
	DecisionStatus       ProfessionalApplicationStatus `json:"decisionStatus"`
	Priority             ModerationPriority            `json:"priority"`
	AssigneeUserID       *string                       `json:"assigneeUserId,omitempty"`
	AssigneeDisplayName  *string                       `json:"assigneeDisplayName,omitempty"`
	ReviewTakenAt        *string                       `json:"reviewTakenAt,omitempty"`
	OpenedAt             string                        `json:"openedAt"`
	LastActivityAt       string                        `json:"lastActivityAt"`
	ResolvedAt           *string                       `json:"resolvedAt,omitempty"`
	CreatedAt            string                        `json:"createdAt"`
	ApplicantDisplayName string                        `json:"applicantDisplayName"`
	ActivityGroupCode    *string                       `json:"activityGroupCode,omitempty"`
	ActivitySubtypeCode  *string                       `json:"activitySubtypeCode,omitempty"`
	ContactPhone         *string                       `json:"contactPhone,omitempty"`
	ContactEmail         *string                       `json:"contactEmail,omitempty"`
}

type ModerationCasesListResponse struct {
	Items  []*ModerationCaseResponse `json:"items"`
	Total  int64                     `json:"total"`
	Limit  int                       `json:"limit"`
	Offset int                       `json:"offset"`
}

type ModerationAuditEventResponse struct {
	ID                 string                         `json:"id"`
	CaseID             string                         `json:"caseId"`
	ActorUserID        string                         `json:"actorUserId"`
	ActorDisplayName   *string                        `json:"actorDisplayName,omitempty"`
	EventType          ModerationCaseEventType        `json:"eventType"`
	FromQueueStatus    *ModerationQueueStatus         `json:"fromQueueStatus,omitempty"`
	ToQueueStatus      *ModerationQueueStatus         `json:"toQueueStatus,omitempty"`
	FromDecisionStatus *ProfessionalApplicationStatus `json:"fromDecisionStatus,omitempty"`
	ToDecisionStatus   *ProfessionalApplicationStatus `json:"toDecisionStatus,omitempty"`
	Comment            *string                        `json:"comment,omitempty"`
	CreatedAt          string                         `json:"createdAt"`
}

type ModerationCaseApplicantInfo struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Phone       string `json:"phone"`
}

type ModerationCaseSubjectDetail struct {
	ID               string                                     `json:"id"`
	Status           ProfessionalApplicationStatus              `json:"status"`
	DecisionComment  *string                                    `json:"decisionComment,omitempty"`
	LastSubmissionAt string                                     `json:"lastSubmissionAt"`
	UpdatedAt        string                                     `json:"updatedAt"`
	CurrentRevision  *ProfessionalApplicationRevisionResponse   `json:"currentRevision,omitempty"`
	RevisionHistory  []*ProfessionalApplicationRevisionResponse `json:"revisionHistory"`
}

type ModerationCaseDetailResponse struct {
	ModerationCaseResponse
	Subject       *ModerationCaseSubjectDetail    `json:"subject"`
	AuditEvents   []*ModerationAuditEventResponse `json:"auditEvents"`
	ApplicantInfo *ModerationCaseApplicantInfo    `json:"applicantInfo"`
}

type AssignModerationCaseRequest struct {
	AssigneeUserID *string `json:"assigneeUserId"`
}

type ProfessionalApplicationDecision string

const (
	ProfessionalApplicationDecisionApprove       ProfessionalApplicationDecision = "approve"
	ProfessionalApplicationDecisionReject        ProfessionalApplicationDecision = "reject"
	ProfessionalApplicationDecisionNeedsRevision ProfessionalApplicationDecision = "needs_revision"
)

type ProfessionalApplicationDecisionRequest struct {
	Decision          ProfessionalApplicationDecision `json:"decision" validate:"required,oneof=approve reject needs_revision"`
	Comment           *string                         `json:"comment,omitempty"`
	ExpectedUpdatedAt string                          `json:"expectedUpdatedAt" validate:"required"`
}
