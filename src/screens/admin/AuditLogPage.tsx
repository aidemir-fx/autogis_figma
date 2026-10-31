import React, { useState } from "react";
import {
    Alert,
    Box,
    Button as MuiButton,
    Chip,
    CircularProgress,
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
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@modules/admin/components/AdminShell";
import { AdminGuard } from "@modules/admin/components/AdminGuard";
import { fetchModerationCases } from "@modules/admin/api";
import {
    AuditEvent,
    EVENT_TYPE_LABELS,
    EventType,
    ModerationCase,
} from "@modules/admin/types";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru");

function formatDate(iso: string) {
    return dayjs(iso).format("D MMM YYYY, HH:mm");
}

function EventTypeChip({ eventType }: { eventType: EventType }) {
    const colorMap: Partial<
        Record<EventType, "success" | "error" | "warning" | "info" | "default">
    > = {
        decision_approved: "success",
        decision_rejected: "error",
        decision_needs_revision: "warning",
        case_created: "info",
        resubmitted: "info",
    };
    return (
        <Chip
            label={EVENT_TYPE_LABELS[eventType] ?? eventType}
            size="small"
            color={colorMap[eventType] ?? "default"}
            variant="outlined"
        />
    );
}

const PAGE_SIZE = 30;

export function AuditLogPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    // Audit log uses the resolved cases list as a proxy until the backend
    // exposes a dedicated audit endpoint. Each resolved case carries
    // audit events in its detail; this page will be wired properly once
    // the backend is ready.
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "moderation", "cases", "audit-view", appliedSearch, page],
        queryFn: () =>
            fetchModerationCases({
                domain: "professional_application",
                q: appliedSearch || undefined,
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
            }),
        staleTime: 30_000,
        retry: 1,
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    return (
        <AdminGuard>
            <AdminShell title="Журнал действий">
                <Stack spacing={2}>
                    <Paper sx={{ p: 2, borderRadius: "12px" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
                            <TextField
                                size="small"
                                placeholder="Поиск по имени, телефону…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: 240 }}
                            />
                            <Stack direction="row" spacing={1}>
                                <MuiButton
                                    variant="contained"
                                    size="small"
                                    startIcon={<FilterListIcon />}
                                    onClick={() => {
                                        setPage(1);
                                        setAppliedSearch(search.trim());
                                    }}
                                >
                                    Применить
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

                    <Alert severity="info" sx={{ borderRadius: "12px" }}>
                        Полный журнал событий будет доступен после подключения backend-эндпоинта{" "}
                        <code>/api/admin/moderation/audit</code>. Сейчас отображается список
                        кейсов модерации.
                    </Alert>

                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <MuiButton size="small" onClick={() => refetch()}>
                                    Повторить
                                </MuiButton>
                            }
                        >
                            Не удалось загрузить данные.
                        </Alert>
                    )}

                    <TableContainer component={Paper} sx={{ borderRadius: "12px" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Case ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Заявитель</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Текущий статус</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Создан</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Активность</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Ответственный</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading &&
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 7 }).map((__, j) => (
                                                <TableCell key={j}>
                                                    <Skeleton variant="text" width="80%" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                {!isLoading && data?.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary" variant="body2">
                                                Записей не найдено
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading &&
                                    data?.items.map((item: ModerationCase) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: "monospace", fontSize: 11 }}
                                                >
                                                    {item.id.slice(0, 8)}…
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {item.applicantDisplayName || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.decisionStatus}
                                                    size="small"
                                                    color={
                                                        item.decisionStatus === "approved"
                                                            ? "success"
                                                            : item.decisionStatus === "rejected"
                                                              ? "error"
                                                              : "default"
                                                    }
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(item.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(item.lastActivityAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {item.assigneeDisplayName ?? "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <MuiButton
                                                    size="small"
                                                    variant="text"
                                                    onClick={() =>
                                                        navigate(`/admin/moderation/${item.id}`)
                                                    }
                                                >
                                                    Открыть
                                                </MuiButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

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
                </Stack>
            </AdminShell>
        </AdminGuard>
    );
}
