import { AdminNotificationForm } from "../../components/AdminNotificationForm";
import React, { useState } from "react";
import {
    Alert,
    Box,
    Button as MuiButton,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Pagination,
    Paper,
    Select,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@modules/admin/components/AdminShell";
import { AdminGuard } from "@modules/admin/components/AdminGuard";
import { fetchModerationCases } from "@modules/admin/api";
import {
    ACTIVITY_GROUP_LABELS_MAP,
    ACTIVITY_SUBTYPE_LABELS_MAP,
    CasesListFilters,
    DECISION_STATUS_LABELS,
    DecisionStatus,
    ModerationCase,
    QUEUE_STATUS_LABELS,
    QueueStatus,
} from "@modules/admin/types";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru");

const PAGE_SIZE = 20;

function formatDate(iso: string) {
    return dayjs(iso).format("D MMM YYYY, HH:mm");
}

function QueueStatusChip({ status }: { status: QueueStatus }) {
    const colorMap: Record<QueueStatus, "default" | "info" | "warning" | "success"> = {
        open: "info",
        in_review: "warning",
        waiting_submitter: "default",
        resolved: "success",
    };
    return (
        <Chip
            label={QUEUE_STATUS_LABELS[status]}
            color={colorMap[status]}
            size="small"
            variant="outlined"
        />
    );
}

function DecisionStatusChip({ status }: { status: DecisionStatus }) {
    const colorMap: Record<
        DecisionStatus,
        "default" | "info" | "warning" | "success" | "error"
    > = {
        pending: "info",
        needs_revision: "warning",
        approved: "success",
        rejected: "error",
    };
    return (
        <Chip
            label={DECISION_STATUS_LABELS[status]}
            color={colorMap[status]}
            size="small"
        />
    );
}

function CaseRow({ caseItem, onClick }: { caseItem: ModerationCase; onClick: () => void }) {
    const activityLabel = [
        caseItem.activityGroupCode
            ? ACTIVITY_GROUP_LABELS_MAP[caseItem.activityGroupCode]
            : null,
        caseItem.activitySubtypeCode
            ? ACTIVITY_SUBTYPE_LABELS_MAP[caseItem.activitySubtypeCode]
            : null,
    ]
        .filter(Boolean)
        .join(" / ");

    return (
        <TableRow
            hover
            onClick={onClick}
            sx={{ cursor: "pointer" }}
        >
            <TableCell>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 11 }}>
                    {caseItem.id.slice(0, 8)}…
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {caseItem.applicantDisplayName || "—"}
                </Typography>
                {caseItem.contactPhone && (
                    <Typography variant="caption" color="text.secondary">
                        {caseItem.contactPhone}
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography variant="body2">{activityLabel || "—"}</Typography>
            </TableCell>
            <TableCell>
                <QueueStatusChip status={caseItem.queueStatus} />
            </TableCell>
            <TableCell>
                <DecisionStatusChip status={caseItem.decisionStatus} />
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {formatDate(caseItem.createdAt)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {formatDate(caseItem.lastActivityAt)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2">
                    {caseItem.assigneeDisplayName ?? "—"}
                </Typography>
            </TableCell>
        </TableRow>
    );
}

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                            <Skeleton variant="text" width="80%" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

export function ModerationQueuePage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<CasesListFilters>({
        domain: "professional_application",
        queueStatus: "",
        decisionStatus: "",
        q: "",
    });
    const [appliedFilters, setAppliedFilters] = useState<CasesListFilters>({
        domain: "professional_application",
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "moderation", "cases", appliedFilters, page],
        queryFn: () =>
            fetchModerationCases({
                ...appliedFilters,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
            }),
        staleTime: 30_000,
        retry: 1,
    });

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({
            domain: "professional_application",
            ...(filters.queueStatus ? { queueStatus: filters.queueStatus } : {}),
            ...(filters.decisionStatus ? { decisionStatus: filters.decisionStatus } : {}),
            ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
            ...(filters.activityGroupCode ? { activityGroupCode: filters.activityGroupCode } : {}),
        });
    };

    const handleResetFilters = () => {
        setFilters({ domain: "professional_application", queueStatus: "", decisionStatus: "", q: "" });
        setAppliedFilters({ domain: "professional_application" });
        setPage(1);
    };

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    return (
        <AdminGuard>
            <AdminShell title="Заявки на профессиональный кабинет">
                <Stack spacing={2}>
                    <AdminNotificationForm />
                    {/* Filters */}
                    <Paper sx={{ p: 2, borderRadius: "12px" }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ sm: "flex-end" }}
                            flexWrap="wrap"
                        >
                            <TextField
                                size="small"
                                placeholder="Поиск по имени, телефону…"
                                value={filters.q ?? ""}
                                onChange={(e) =>
                                    setFilters((f) => ({ ...f, q: e.target.value }))
                                }
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: 220 }}
                            />

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Статус очереди</InputLabel>
                                <Select
                                    value={filters.queueStatus ?? ""}
                                    label="Статус очереди"
                                    onChange={(e) =>
                                        setFilters((f) => ({
                                            ...f,
                                            queueStatus: e.target.value as QueueStatus | "",
                                        }))
                                    }
                                    input={<OutlinedInput label="Статус очереди" />}
                                >
                                    <MenuItem value="">Все</MenuItem>
                                    {(Object.keys(QUEUE_STATUS_LABELS) as QueueStatus[]).map(
                                        (s) => (
                                            <MenuItem key={s} value={s}>
                                                {QUEUE_STATUS_LABELS[s]}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Решение</InputLabel>
                                <Select
                                    value={filters.decisionStatus ?? ""}
                                    label="Решение"
                                    onChange={(e) =>
                                        setFilters((f) => ({
                                            ...f,
                                            decisionStatus: e.target.value as DecisionStatus | "",
                                        }))
                                    }
                                    input={<OutlinedInput label="Решение" />}
                                >
                                    <MenuItem value="">Все</MenuItem>
                                    {(
                                        Object.keys(DECISION_STATUS_LABELS) as DecisionStatus[]
                                    ).map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {DECISION_STATUS_LABELS[s]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Тип деятельности</InputLabel>
                                <Select
                                    value={filters.activityGroupCode ?? ""}
                                    label="Тип деятельности"
                                    onChange={(e) =>
                                        setFilters((f) => ({
                                            ...f,
                                            activityGroupCode: e.target.value,
                                        }))
                                    }
                                    input={<OutlinedInput label="Тип деятельности" />}
                                >
                                    <MenuItem value="">Все</MenuItem>
                                    {Object.entries(ACTIVITY_GROUP_LABELS_MAP).map(
                                        ([code, label]) => (
                                            <MenuItem key={code} value={code}>
                                                {label}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>

                            <Stack direction="row" spacing={1}>
                                <MuiButton
                                    variant="contained"
                                    size="small"
                                    startIcon={<FilterListIcon />}
                                    onClick={handleApplyFilters}
                                >
                                    Применить
                                </MuiButton>
                                <MuiButton
                                    variant="text"
                                    size="small"
                                    onClick={handleResetFilters}
                                >
                                    Сбросить
                                </MuiButton>
                                <MuiButton
                                    variant="text"
                                    size="small"
                                    startIcon={
                                        isLoading ? (
                                            <CircularProgress size={14} />
                                        ) : (
                                            <RefreshIcon fontSize="small" />
                                        )
                                    }
                                    onClick={() => refetch()}
                                    disabled={isLoading}
                                >
                                    Обновить
                                </MuiButton>
                            </Stack>
                        </Stack>
                    </Paper>

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
                            Не удалось загрузить список кейсов.
                        </Alert>
                    )}

                    {/* Table */}
                    <TableContainer component={Paper} sx={{ borderRadius: "12px" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Case ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Заявитель</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Деятельность</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Статус очереди</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Решение</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Создана</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Активность</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Ответственный</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && <SkeletonRows />}
                                {!isLoading && data?.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary" variant="body2">
                                                Нет кейсов по заданным фильтрам
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading &&
                                    data?.items.map((item) => (
                                        <CaseRow
                                            key={item.id}
                                            caseItem={item}
                                            onClick={() =>
                                                navigate(`/admin/moderation/${item.id}`)
                                            }
                                        />
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Stack alignItems="center">
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, p) => setPage(p)}
                                color="primary"
                            />
                        </Stack>
                    )}

                    {data && (
                        <Typography variant="caption" color="text.secondary" align="center">
                            Всего кейсов: {data.total}
                        </Typography>
                    )}
                </Stack>
            </AdminShell>
        </AdminGuard>
    );
}
