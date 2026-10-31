import React, { useState } from "react";
import {
    Alert,
    Box,
    Button as MuiButton,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Link,
    Paper,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AdminShell } from "@modules/admin/components/AdminShell";
import { AdminGuard } from "@modules/admin/components/AdminGuard";
import {
    assignCase,
    fetchModerationCaseDetail,
    releaseCase,
    submitDecision,
} from "@modules/admin/api";
import {
    ACTIVITY_GROUP_LABELS_MAP,
    ACTIVITY_SUBTYPE_LABELS_MAP,
    AdminDecision,
    ApplicationRevision,
    AuditEvent,
    DECISION_STATUS_LABELS,
    DecisionStatus,
    EVENT_TYPE_LABELS,
    EventType,
    ModerationCaseDetail,
    QUEUE_STATUS_LABELS,
    QueueStatus,
} from "@modules/admin/types";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("ru");

function formatDate(iso: string) {
    return dayjs(iso).format("D MMM YYYY, HH:mm");
}

// ---------- Schema-aware payload renderer ----------

function renderPayloadField(key: string, value: unknown): React.ReactNode {
    const label = PAYLOAD_FIELD_LABELS[key] ?? key;

    if (typeof value === "boolean") {
        return (
            <Stack key={key} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                    {label}
                </Typography>
                <Chip
                    label={value ? "Да" : "Нет"}
                    size="small"
                    color={value ? "success" : "default"}
                    variant="outlined"
                />
            </Stack>
        );
    }

    if (typeof value === "string" && value.startsWith("http")) {
        return (
            <Stack key={key} direction="row" spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                    {label}
                </Typography>
                <Link href={value} target="_blank" rel="noopener noreferrer" variant="body2">
                    Открыть ссылку
                </Link>
            </Stack>
        );
    }

    return (
        <Stack key={key} direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                {label}
            </Typography>
            <Typography variant="body2">{String(value ?? "—")}</Typography>
        </Stack>
    );
}

const PAYLOAD_FIELD_LABELS: Record<string, string> = {
    activityGroupCode: "Тип деятельности",
    activitySubtypeCode: "Подтип деятельности",
    businessName: "Название бизнеса",
    applicantName: "Имя исполнителя",
    city: "Город",
    address: "Адрес",
    phone: "Телефон",
    yandexMapsUrl: "Яндекс.Карты",
    comment: "Комментарий",
    agreedToTerms: "Согласие с условиями",
    // legacy
    businessType: "Тип бизнеса (устаревшее)",
    contactPerson: "Контактное лицо",
    email: "Email",
};

const DISPLAY_ORDER = [
    "activityGroupCode",
    "activitySubtypeCode",
    "businessName",
    "applicantName",
    "city",
    "address",
    "phone",
    "yandexMapsUrl",
    "comment",
    "agreedToTerms",
    "businessType",
    "contactPerson",
    "email",
];

function PayloadRenderer({ revision }: { revision: ApplicationRevision }) {
    const payload = revision.payload ?? {};
    const enriched = {
        ...payload,
        activityGroupCode: payload.activityGroupCode
            ? (ACTIVITY_GROUP_LABELS_MAP[payload.activityGroupCode as string] ??
              payload.activityGroupCode)
            : undefined,
        activitySubtypeCode: payload.activitySubtypeCode
            ? (ACTIVITY_SUBTYPE_LABELS_MAP[payload.activitySubtypeCode as string] ??
              payload.activitySubtypeCode)
            : undefined,
    };

    const enrichedRecord = enriched as Record<string, unknown>;
    const sorted = DISPLAY_ORDER.filter((k) => enrichedRecord[k] !== undefined && enrichedRecord[k] !== "");
    const rest = Object.keys(enrichedRecord).filter(
        (k) => !DISPLAY_ORDER.includes(k) && enrichedRecord[k] !== undefined && enrichedRecord[k] !== "",
    );

    return (
        <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                    label={`Схема: ${revision.schemaKey} v${revision.schemaVersion}`}
                    size="small"
                    variant="outlined"
                />
                <Chip label={`Ревизия #${revision.revisionNo}`} size="small" />
            </Stack>
            <Divider />
            {[...sorted, ...rest].map((key) =>
                renderPayloadField(key, enrichedRecord[key]),
            )}
        </Stack>
    );
}

// ---------- Audit timeline ----------

function eventColor(eventType: EventType): string {
    if (eventType === "decision_approved") return "#2e7d32";
    if (eventType === "decision_rejected") return "#c62828";
    if (eventType === "decision_needs_revision") return "#e65100";
    return "#1565c0";
}

function AuditTimeline({ events }: { events: AuditEvent[] }) {
    if (events.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                История событий пуста.
            </Typography>
        );
    }

    return (
        <Stack spacing={0}>
            {[...events].reverse().map((event, idx) => (
                <Box
                    key={event.id}
                    sx={{ display: "flex", gap: 2, pb: idx < events.length - 1 ? 2 : 0 }}
                >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                bgcolor: eventColor(event.eventType),
                                mt: "4px",
                                flexShrink: 0,
                            }}
                        />
                        {idx < events.length - 1 && (
                            <Box sx={{ width: 1, flex: 1, bgcolor: "divider", mt: 0.5 }} />
                        )}
                    </Box>
                    <Box sx={{ flex: 1, pb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="baseline">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(event.createdAt)}
                            </Typography>
                        </Stack>
                        {event.actorDisplayName && (
                            <Typography variant="caption" color="text.secondary">
                                {event.actorDisplayName}
                            </Typography>
                        )}
                        {event.comment && (
                            <Paper
                                variant="outlined"
                                sx={{ mt: 0.75, px: 1.5, py: 1, bgcolor: "grey.50" }}
                            >
                                <Typography variant="body2">{event.comment}</Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>
            ))}
        </Stack>
    );
}

// ---------- Decision panel ----------

function DecisionPanel({
    caseDetail,
    onSuccess,
}: {
    caseDetail: ModerationCaseDetail;
    onSuccess: () => void;
}) {
    const [decision, setDecision] = useState<AdminDecision | null>(null);
    const [comment, setComment] = useState("");

    const decisionMutation = useMutation({
        mutationFn: (d: AdminDecision) =>
            submitDecision(caseDetail.subjectId, {
                decision: d,
                comment: comment.trim() || undefined,
                expectedUpdatedAt: caseDetail.subject.updatedAt,
            }),
        onSuccess: (_, d) => {
            const labels: Record<AdminDecision, string> = {
                approve: "Заявка одобрена",
                reject: "Заявка отклонена",
                needs_revision: "Отправлено на доработку",
            };
            toast.success(labels[d]);
            setDecision(null);
            setComment("");
            onSuccess();
        },
        onError: (err: any) => {
            if (err?.response?.status === 409) {
                toast.error(
                    "Данные заявки изменились. Обновите страницу и повторите действие.",
                );
            } else {
                toast.error(err?.response?.data?.message ?? "Произошла ошибка.");
            }
        },
    });

    const releaseMutation = useMutation({
        mutationFn: () => releaseCase(caseDetail.id),
        onSuccess: () => {
            toast.success("Кейс возвращён в очередь");
            onSuccess();
        },
        onError: () => toast.error("Не удалось вернуть кейс в очередь"),
    });

    const isResolved = caseDetail.queueStatus === "resolved";
    const isWaiting = caseDetail.queueStatus === "waiting_submitter";
    const needsComment =
        decision === "reject" || decision === "needs_revision";
    const canSubmit = !needsComment || comment.trim().length > 0;
    const isBusy = decisionMutation.isPending || releaseMutation.isPending;

    if (isResolved) {
        return (
            <Alert severity="success">
                Кейс завершён — дальнейших действий не требуется.
            </Alert>
        );
    }

    if (isWaiting) {
        return (
            <Alert severity="info">
                Ожидание повторной подачи от заявителя.
            </Alert>
        );
    }

    return (
        <Stack spacing={2}>
            {/* Action buttons */}
            {decision === null ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <MuiButton
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => setDecision("approve")}
                        disabled={isBusy}
                    >
                        Одобрить
                    </MuiButton>
                    <MuiButton
                        variant="outlined"
                        color="warning"
                        startIcon={<EditNoteIcon />}
                        onClick={() => setDecision("needs_revision")}
                        disabled={isBusy}
                    >
                        На доработку
                    </MuiButton>
                    <MuiButton
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setDecision("reject")}
                        disabled={isBusy}
                    >
                        Отклонить
                    </MuiButton>
                    {caseDetail.queueStatus === "in_review" && (
                        <MuiButton
                            variant="text"
                            size="small"
                            onClick={() => releaseMutation.mutate()}
                            disabled={isBusy}
                        >
                            Вернуть в очередь
                        </MuiButton>
                    )}
                </Stack>
            ) : (
                <Stack spacing={1.5}>
                    <Alert
                        severity={
                            decision === "approve"
                                ? "success"
                                : decision === "reject"
                                  ? "error"
                                  : "warning"
                        }
                    >
                        {decision === "approve" && "Подтвердите одобрение заявки."}
                        {decision === "needs_revision" && "Укажите что нужно исправить."}
                        {decision === "reject" && "Укажите причину отклонения."}
                    </Alert>

                    <TextField
                        label={
                            needsComment
                                ? "Комментарий (обязателен)"
                                : "Комментарий (по желанию)"
                        }
                        multiline
                        minRows={3}
                        fullWidth
                        required={needsComment}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        error={needsComment && comment.trim().length === 0}
                        helperText={
                            needsComment && comment.trim().length === 0
                                ? "Добавьте комментарий для заявителя"
                                : undefined
                        }
                    />

                    <Stack direction="row" spacing={1}>
                        <MuiButton
                            variant="contained"
                            color={
                                decision === "approve"
                                    ? "success"
                                    : decision === "reject"
                                      ? "error"
                                      : "warning"
                            }
                            onClick={() => decisionMutation.mutate(decision)}
                            disabled={!canSubmit || isBusy}
                            startIcon={isBusy ? <CircularProgress size={16} /> : undefined}
                        >
                            Подтвердить
                        </MuiButton>
                        <MuiButton
                            variant="text"
                            onClick={() => {
                                setDecision(null);
                                setComment("");
                            }}
                            disabled={isBusy}
                        >
                            Отмена
                        </MuiButton>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}

// ---------- Main page ----------

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "12px" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {title}
            </Typography>
            {children}
        </Paper>
    );
}

export function CaseDetailPage() {
    const { caseId } = useParams<{ caseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "moderation", "case", caseId],
        queryFn: () => fetchModerationCaseDetail(caseId!),
        enabled: Boolean(caseId),
        staleTime: 15_000,
        retry: 1,
    });

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "moderation", "case", caseId] });
    };

    return (
        <AdminGuard>
            <AdminShell title="Карточка кейса">
                <Stack spacing={2}>
                    {/* Back */}
                    <Box>
                        <MuiButton
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate("/admin/moderation")}
                            size="small"
                        >
                            Вернуться к очереди
                        </MuiButton>
                    </Box>

                    {/* Loading */}
                    {isLoading && (
                        <Stack spacing={2}>
                            {[1, 2, 3].map((i) => (
                                <Paper key={i} sx={{ p: 3, borderRadius: "12px" }}>
                                    <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
                                    <Skeleton variant="text" width="70%" />
                                    <Skeleton variant="text" width="55%" />
                                    <Skeleton variant="text" width="60%" />
                                </Paper>
                            ))}
                        </Stack>
                    )}

                    {/* Error */}
                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <MuiButton size="small" onClick={() => refetch()}>
                                    Повторить
                                </MuiButton>
                            }
                        >
                            Не удалось загрузить кейс.
                        </Alert>
                    )}

                    {data && (
                        <>
                            {/* Header */}
                            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "12px" }}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    alignItems={{ sm: "flex-start" }}
                                    spacing={2}
                                >
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                            <Typography
                                                variant="caption"
                                                sx={{ fontFamily: "monospace", color: "text.secondary" }}
                                            >
                                                {data.id}
                                            </Typography>
                                            <Chip
                                                label={QUEUE_STATUS_LABELS[data.queueStatus]}
                                                size="small"
                                                color={
                                                    data.queueStatus === "resolved"
                                                        ? "success"
                                                        : data.queueStatus === "in_review"
                                                          ? "warning"
                                                          : "info"
                                                }
                                            />
                                            <Chip
                                                label={DECISION_STATUS_LABELS[data.decisionStatus]}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Stack>

                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {data.applicantDisplayName || "Заявитель"}
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            spacing={2}
                                            sx={{ mt: 0.5 }}
                                            flexWrap="wrap"
                                        >
                                            {data.contactPhone && (
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {data.contactPhone}
                                                    </Typography>
                                                </Stack>
                                            )}
                                            {data.activityGroupCode && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {[
                                                        ACTIVITY_GROUP_LABELS_MAP[data.activityGroupCode],
                                                        data.activitySubtypeCode
                                                            ? ACTIVITY_SUBTYPE_LABELS_MAP[data.activitySubtypeCode]
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" / ")}
                                                </Typography>
                                            )}
                                        </Stack>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.5, display: "block" }}
                                        >
                                            Создан {formatDate(data.createdAt)} · Последняя активность{" "}
                                            {formatDate(data.lastActivityAt)}
                                        </Typography>
                                    </Box>

                                    <Tooltip title="Обновить">
                                        <IconButton onClick={handleRefresh}>
                                            <RefreshIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                {data.assigneeDisplayName && (
                                    <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
                                        <PersonAddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Ответственный: <b>{data.assigneeDisplayName}</b>
                                        </Typography>
                                    </Stack>
                                )}
                            </Paper>

                            {/* Current revision */}
                            {data.subject?.currentRevision && (
                                <Section title="Текущая ревизия заявки">
                                    <PayloadRenderer revision={data.subject.currentRevision} />
                                </Section>
                            )}

                            {/* Revision history */}
                            {data.subject?.revisionHistory &&
                                data.subject.revisionHistory.length > 1 && (
                                    <Section title="История ревизий">
                                        <Stack spacing={2}>
                                            {data.subject.revisionHistory
                                                .filter(
                                                    (r) =>
                                                        r.id !==
                                                        data.subject.currentRevision?.id,
                                                )
                                                .map((revision) => (
                                                    <Box key={revision.id}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500, mb: 1, color: "text.secondary" }}
                                                        >
                                                            Ревизия #{revision.revisionNo} —{" "}
                                                            {formatDate(revision.createdAt)}
                                                        </Typography>
                                                        <PayloadRenderer revision={revision} />
                                                        <Divider sx={{ mt: 2 }} />
                                                    </Box>
                                                ))}
                                        </Stack>
                                    </Section>
                                )}

                            {/* Decision panel */}
                            <Section title="Панель решения">
                                <DecisionPanel
                                    caseDetail={data}
                                    onSuccess={handleRefresh}
                                />
                            </Section>

                            {/* Audit timeline */}
                            <Section title="История модерации">
                                <AuditTimeline events={data.auditEvents ?? []} />
                            </Section>
                        </>
                    )}
                </Stack>
            </AdminShell>
        </AdminGuard>
    );
}
