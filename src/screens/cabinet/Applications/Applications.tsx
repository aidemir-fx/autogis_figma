import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@modules/layout";
import { acceptOrderInvitation } from "@modules/orders/api";
import { hasCapability } from "@common/lib/userAccess";
import {
    ChatOrder,
    NormalizedOrderStatus,
    getProviderOrders,
    updateOrderStatus,
} from "@modules/chats/api";
import { useUserProfile } from "@common/hooks";
import { KPIGrid } from "./components/KPIGrid";
import { OrderAccordionItem } from "./components/OrderAccordionItem";
import { palette, STATUS_META } from "./components/styles";

type StatusFilter = NormalizedOrderStatus | "all";

const STATUS_FILTERS: StatusFilter[] = [
    "all",
    "pending",
    "scheduled",
    "completed",
    "cancelled",
];

export function Applications() {
    const { profile } = useUserProfile();
    const queryClient = useQueryClient();

    const { mutate: handleAcceptTender, isPending: isAcceptingTender } = useMutation({
        mutationFn: acceptOrderInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["provider_orders", profile?.id] });
            toast.success("Заявка успешно взята в работу!");
        },
        onError: (err: any) => {
            if (err.response?.status === 409) {
                toast.error("Эту заявку уже взял другой мастер.");
                queryClient.invalidateQueries({ queryKey: ["provider_orders", profile?.id] });
            } else {
                toast.error("Ошибка при принятии заявки.");
            }
        },
    });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedFromChat = searchParams.get("orderId");
    const statusParam = searchParams.get("status") as StatusFilter | null;
    const hasProfessionalCabinetAccess = hasCapability(
        profile,
        "professionalCabinet",
    );
    const hasApplicationsAccess = hasCapability(profile, "applications");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(
        statusParam && STATUS_FILTERS.includes(statusParam)
            ? statusParam
            : "all"
    );
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
        selectedFromChat
    );
    const [confirmDialogOrder, setConfirmDialogOrder] = useState<ChatOrder | null>(null);
    const [cancelDialogOrder, setCancelDialogOrder] = useState<ChatOrder | null>(null);
    const [confirmedDateTime, setConfirmedDateTime] = useState("");
    const [cancelReason, setCancelReason] = useState("");
    // Refs to close dialogs only on success
    const pendingConfirmRef = useRef<{ order: ChatOrder; dateTime: string } | null>(null);
    const pendingCancelRef = useRef<{ order: ChatOrder; reason: string } | null>(null);

    const { data: orders, isLoading } = useQuery({
        queryKey: ["providerOrders", profile?.id],
        queryFn: getProviderOrders,
        enabled: !!profile?.id && hasApplicationsAccess,
    });

    useEffect(() => {
        if (selectedFromChat) {
            setExpandedOrderId(selectedFromChat);
        }
    }, [selectedFromChat]);

    const updateStatusMutation = useMutation({
        mutationFn: ({
            orderId,
            status,
            confirmedDateTime: confirmedDateTimeValue,
            cancelReason: cancelReasonValue,
            expectedUpdatedAt,
        }: {
            orderId: string;
            status: NormalizedOrderStatus;
            confirmedDateTime?: string;
            cancelReason?: string;
            expectedUpdatedAt?: string;
        }) =>
            updateOrderStatus(orderId, {
                status,
                confirmedDateTime: confirmedDateTimeValue,
                cancelReason: cancelReasonValue,
                expectedUpdatedAt,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["providerOrders", profile?.id] });
            queryClient.invalidateQueries({ queryKey: ["providerOrdersForChat", profile?.id] });
            queryClient.invalidateQueries({ queryKey: ["orderChat"] });
            // Close dialogs only after successful save
            if (pendingConfirmRef.current) {
                setConfirmDialogOrder(null);
                setConfirmedDateTime("");
                pendingConfirmRef.current = null;
                toast.success("Заявка подтверждена");
            }
            if (pendingCancelRef.current) {
                setCancelDialogOrder(null);
                setCancelReason("");
                pendingCancelRef.current = null;
                toast.success("Заявка отменена");
            }
        },
        onError: (error: any) => {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Произошла ошибка";
            toast.error(msg);
        },
    });

    const openConfirmDialog = (order: ChatOrder) => {
        const initial = order.confirmedDateTime
            ? new Date(order.confirmedDateTime).toISOString().slice(0, 16)
            : "";
        setConfirmedDateTime(initial);
        setConfirmDialogOrder(order);
    };

    const openCancelDialog = (order: ChatOrder) => {
        setCancelReason(order.cancelReason ?? "");
        setCancelDialogOrder(order);
    };

    const submitConfirm = () => {
        if (!confirmDialogOrder || !confirmedDateTime) return;
        pendingConfirmRef.current = { order: confirmDialogOrder, dateTime: confirmedDateTime };
        updateStatusMutation.mutate({
            orderId: confirmDialogOrder.id,
            status: "scheduled",
            confirmedDateTime: new Date(confirmedDateTime).toISOString(),
            expectedUpdatedAt: confirmDialogOrder.updatedAt,
        });
    };

    const submitCancel = () => {
        if (!cancelDialogOrder || !cancelReason.trim()) return;
        pendingCancelRef.current = { order: cancelDialogOrder, reason: cancelReason.trim() };
        updateStatusMutation.mutate({
            orderId: cancelDialogOrder.id,
            status: "cancelled",
            cancelReason: cancelReason.trim(),
            expectedUpdatedAt: cancelDialogOrder.updatedAt,
        });
    };

    const markCompleted = (order: ChatOrder) => {
        updateStatusMutation.mutate({
            orderId: order.id,
            status: "completed",
            expectedUpdatedAt: order.updatedAt,
        });
    };

    const goToChat = (order: ChatOrder) => {
        navigate(`/cabinet/chats?tab=professional&orderId=${order.id}`);
    };

    const groupedCounts = useMemo(() => {
        const initial: Record<NormalizedOrderStatus, number> = {
            pending: 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
        };
        for (const order of orders ?? []) {
            initial[order.status] = (initial[order.status] ?? 0) + 1;
        }
        return initial;
    }, [orders]);

    const sortedOrders = useMemo(() => {
        const list = [...(orders ?? [])];
        // Новые/ближайшие сначала: pending>scheduled>completed>cancelled, затем по дате
        const rank: Record<NormalizedOrderStatus, number> = {
            pending: 0,
            scheduled: 1,
            completed: 2,
            cancelled: 3,
        };
        list.sort((a, b) => {
            if (rank[a.status] !== rank[b.status]) {
                return rank[a.status] - rank[b.status];
            }
            return (
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        });
        return list;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (statusFilter === "all") return sortedOrders;
        return sortedOrders.filter((o) => o.status === statusFilter);
    }, [sortedOrders, statusFilter]);

    const listTitle =
        statusFilter === "all" ? "Все заявки" : STATUS_META[statusFilter].label;

    if (!profile) return null;

    if (!hasProfessionalCabinetAccess) {
        return (
            <DashboardLayout title="Заявки">
                <Alert severity="info">
                    Раздел заявок доступен после активации профессионального кабинета.
                </Alert>
            </DashboardLayout>
        );
    }

    if (!hasApplicationsAccess) {
        return (
            <DashboardLayout title="Заявки">
                <Alert severity="info">
                    CRM mini со списком заявок сейчас доступна всем подтипам
                    частного исполнителя. Для бизнес-аккаунтов CRM будет
                    подключаться отдельно, по подписке.
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Заявки">
            <Stack spacing={1.5}>
                <KPIGrid
                    counts={groupedCounts}
                    activeFilter={statusFilter}
                    onSelect={setStatusFilter}
                />

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mt: 0.5,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: palette.textPrimary,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                        }}
                    >
                        {listTitle}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: palette.textSecondary,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Сначала новые
                    </Typography>
                </Box>

                {isLoading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && filteredOrders.length === 0 && (
                    <Box
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            border: `1px solid ${palette.border}`,
                            background: palette.surface,
                        }}
                    >
                        <Typography sx={{ color: palette.textSecondary }}>
                            {statusFilter === "all"
                                ? "Пока нет заявок."
                                : "В этой категории пока нет заявок."}
                        </Typography>
                    </Box>
                )}

                {!isLoading && filteredOrders.length > 0 && (
                    <Stack spacing={0.85}>
                        {filteredOrders.map((order: ChatOrder) => (
                            <OrderAccordionItem
                                key={order.id}
                                order={order}
                                expanded={expandedOrderId === order.id}
                                highlight={selectedFromChat === order.id}
                                onToggle={() =>
                                    setExpandedOrderId((current) =>
                                        current === order.id ? null : order.id
                                    )
                                }
                                onChat={() => goToChat(order)}
                                onConfirm={() => openConfirmDialog(order)}
                                onComplete={() => markCompleted(order)}
                                onCancel={() => openCancelDialog(order)}
                                actionDisabled={updateStatusMutation.isPending}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>

            <Dialog
                open={Boolean(confirmDialogOrder)}
                onClose={() => setConfirmDialogOrder(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Подтвердить заявку</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Дата и время записи"
                        type="datetime-local"
                        fullWidth
                        value={confirmedDateTime}
                        onChange={(event) => setConfirmedDateTime(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOrder(null)}>Отмена</Button>
                    <Button
                        variant="contained"
                        onClick={submitConfirm}
                        disabled={!confirmedDateTime || updateStatusMutation.isPending}
                    >
                        Подтвердить
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(cancelDialogOrder)}
                onClose={() => setCancelDialogOrder(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Отменить заявку</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Причина отмены"
                        fullWidth
                        multiline
                        minRows={3}
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOrder(null)}>Назад</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={submitCancel}
                        disabled={!cancelReason.trim() || updateStatusMutation.isPending}
                    >
                        Отменить заявку
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardLayout>
    );
}
