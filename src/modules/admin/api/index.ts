import { http } from "@common/lib/http";
import {
    AssignRequest,
    CasesListFilters,
    CasesListResponse,
    DecisionRequest,
    ModerationCaseDetail,
} from "../types";

export async function fetchModerationCases(
    filters: CasesListFilters = {},
): Promise<CasesListResponse> {
    const params: Record<string, string | number> = {
        limit: filters.limit ?? 20,
        offset: filters.offset ?? 0,
    };
    if (filters.domain) params.domain = filters.domain;
    if (filters.queueStatus) params.queueStatus = filters.queueStatus;
    if (filters.decisionStatus) params.decisionStatus = filters.decisionStatus;
    if (filters.assigneeUserId) params.assigneeUserId = filters.assigneeUserId;
    if (filters.activityGroupCode) params.activityGroupCode = filters.activityGroupCode;
    if (filters.activitySubtypeCode) params.activitySubtypeCode = filters.activitySubtypeCode;
    if (filters.q) params.q = filters.q;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    const response = await http.get<CasesListResponse>("/admin/moderation/cases", { params });
    return response.data;
}

export async function fetchModerationCaseDetail(caseId: string): Promise<ModerationCaseDetail> {
    const response = await http.get<ModerationCaseDetail>(
        `/admin/moderation/cases/${caseId}`,
    );
    return response.data;
}

export async function assignCase(caseId: string, body: AssignRequest): Promise<void> {
    await http.post(`/admin/moderation/cases/${caseId}/assign`, body);
}

export async function submitDecision(
    applicationId: string,
    body: DecisionRequest,
): Promise<void> {
    await http.post(`/admin/professional-applications/${applicationId}/decision`, body);
}

export async function releaseCase(caseId: string): Promise<void> {
    await http.post(`/admin/moderation/cases/${caseId}/release`);
}
