export type QueueStatus = "open" | "in_review" | "waiting_submitter" | "resolved";

export type DecisionStatus = "pending" | "needs_revision" | "approved" | "rejected";

export type Priority = "normal" | "high";

export type EventType =
    | "case_created"
    | "assigned"
    | "taken_into_review"
    | "review_released"
    | "decision_needs_revision"
    | "decision_approved"
    | "decision_rejected"
    | "resubmitted";

export type AdminDecision = "approve" | "reject" | "needs_revision";

export interface ApplicationRevision {
    id: string;
    revisionNo: number;
    schemaKey: string;
    schemaVersion: number;
    payload: Record<string, unknown>;
    createdAt: string;
}

export interface ModerationCase {
    id: string;
    domain: string;
    subjectId: string;
    queueStatus: QueueStatus;
    decisionStatus: DecisionStatus;
    priority: Priority;
    assigneeUserId?: string;
    assigneeDisplayName?: string;
    reviewTakenAt?: string;
    openedAt: string;
    lastActivityAt: string;
    resolvedAt?: string;
    createdAt: string;
    applicantDisplayName: string;
    activityGroupCode?: string;
    activitySubtypeCode?: string;
    contactPhone?: string;
    contactEmail?: string;
}

export interface AuditEvent {
    id: string;
    caseId: string;
    actorUserId: string;
    actorDisplayName?: string;
    eventType: EventType;
    fromQueueStatus?: QueueStatus;
    toQueueStatus?: QueueStatus;
    fromDecisionStatus?: DecisionStatus;
    toDecisionStatus?: DecisionStatus;
    comment?: string;
    createdAt: string;
}

export interface ModerationCaseDetail extends ModerationCase {
    subject: {
        id: string;
        status: DecisionStatus;
        decisionComment?: string;
        lastSubmissionAt: string;
        updatedAt: string;
        currentRevision: ApplicationRevision;
        revisionHistory: ApplicationRevision[];
    };
    auditEvents: AuditEvent[];
    applicantInfo: {
        userId: string;
        displayName: string;
        phone: string;
    };
}

export interface CasesListResponse {
    items: ModerationCase[];
    total: number;
    limit: number;
    offset: number;
}

export interface CasesListFilters {
    domain?: string;
    queueStatus?: QueueStatus | "";
    decisionStatus?: DecisionStatus | "";
    assigneeUserId?: string;
    activityGroupCode?: string;
    activitySubtypeCode?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

export interface DecisionRequest {
    decision: AdminDecision;
    comment?: string;
    expectedUpdatedAt: string;
}

export interface AssignRequest {
    assigneeUserId: string | null;
}

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
    open: "Открыт",
    in_review: "На рассмотрении",
    waiting_submitter: "Ожидает заявителя",
    resolved: "Завершён",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
    pending: "На рассмотрении",
    needs_revision: "Нужна доработка",
    approved: "Одобрено",
    rejected: "Отклонено",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    case_created: "Кейс создан",
    assigned: "Назначен ответственный",
    taken_into_review: "Взят на рассмотрение",
    review_released: "Возвращён в очередь",
    decision_needs_revision: "Отправлено на доработку",
    decision_approved: "Заявка одобрена",
    decision_rejected: "Заявка отклонена",
    resubmitted: "Повторная подача",
};

export const ACTIVITY_GROUP_LABELS_MAP: Record<string, string> = {
    private_executor: "Частный исполнитель",
    auto_service: "Автосервис",
    auto_wash: "Автомойка",
};

export const ACTIVITY_SUBTYPE_LABELS_MAP: Record<string, string> = {
    master: "Автомастер",
    washer: "Автомойщик",
    general_service: "Автосервис",
    tire_fitting: "Шиномонтаж",
    detailing: "Детейлинг",
    classic: "Классическая автомойка",
    self_service: "Самомойка",
};
