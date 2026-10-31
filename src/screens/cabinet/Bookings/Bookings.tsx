import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    CalendarIcon,
    ChatIcon,
    ClockIcon,
    PhoneIcon,
    WrenchIcon,
} from "@common/icons";
import { useUserProfile } from "@common/hooks";
import { theme } from "@common/theme";
import { ChatOrder, getCustomerOrders, updateOrderStatus } from "@modules/chats/api";
import { MediaAssetGallery } from "@modules/media/components/MediaAssetGallery";
import { DashboardLayout } from "@modules/layout";
import { OrderRatingBadge, OrderReviewPrompt } from "@modules/reviews";

type BookingTab = "pending" | "confirmed" | "completed" | "cancelled";

type BookingGroup = Record<BookingTab, ChatOrder[]>;

const TAB_CONFIG: Array<{ value: BookingTab; label: string }> = [
    { value: "pending", label: "Ожидают" },
    { value: "confirmed", label: "Записаны" },
    { value: "completed", label: "Готово" },
    { value: "cancelled", label: "Отменены" },
];

const TIME_PREFERENCE_LABELS: Record<string, string> = {
    urgent: "Срочно",
    not_urgent: "Не срочно",
};

const STATUS_META: Record<
    ChatOrder["status"],
    {
        label: string;
        background: string;
        color: string;
        border: string;
    }
> = {
    pending: {
        label: "Ожидает",
        background: theme.palette.warning.light,
        color: theme.palette.warning.heavy,
        border: "rgba(189, 92, 10, 0.2)",
    },
    scheduled: {
        label: "Записан",
        background: theme.palette.success.light,
        color: theme.palette.success.heavy,
        border: "rgba(42, 136, 0, 0.18)",
    },
    completed: {
        label: "Выполнено",
        background: theme.palette.info.light,
        color: theme.palette.info.heavy,
        border: "rgba(48, 114, 179, 0.18)",
    },
    cancelled: {
        label: "Отменено",
        background: theme.palette.error.light,
        color: theme.palette.error.heavy,
        border: "rgba(189, 9, 53, 0.18)",
    },
};

function formatDate(value?: string) {
    if (!value) return "Время уточняется";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Время уточняется";

    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getServiceName(order: ChatOrder) {
    return order.activityType?.displayName || order.activityType?.name || "Услуга";
}

function getProviderName(order: ChatOrder) {
    return order.provider?.name || order.provider?.phone || "Исполнитель";
}

function getProviderPhone(order: ChatOrder) {
    return order.provider?.phone;
}

function getCompletionDate(order: ChatOrder) {
    return order.updatedAt || order.confirmedDateTime || order.createdAt;
}

function getOrderTimeText(order: ChatOrder) {
    if (order.confirmedDateTime) return formatDate(order.confirmedDateTime);
    if (order.timePreference) {
        return TIME_PREFERENCE_LABELS[order.timePreference] || "Время уточняется";
    }
    return formatDate(order.createdAt);
}

function getNextOrder(groups: BookingGroup) {
    const scheduled = [...groups.confirmed].sort(
        (a, b) =>
            new Date(a.confirmedDateTime || a.createdAt).getTime() -
            new Date(b.confirmedDateTime || b.createdAt).getTime()
    );

    return scheduled[0] || groups.pending[0] || null;
}

function IconFrame(props: { children: ReactNode; compact?: boolean }) {
    const { children, compact = false } = props;

    return (
        <Box
            sx={{
                width: compact ? 30 : 38,
                height: compact ? 30 : 38,
                borderRadius: theme.shape.medium,
                backgroundColor: theme.palette.success.light,
                color: theme.palette.actions.brandHeavy,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                "& svg": {
                    width: compact ? 15 : 19,
                    height: compact ? 15 : 19,
                },
            }}
        >
            {children}
        </Box>
    );
}

function StatusPill(props: { status: ChatOrder["status"] }) {
    const status = STATUS_META[props.status];

    return (
        <Box
            component="span"
            sx={{
                alignSelf: "flex-start",
                px: 1,
                py: 0.45,
                borderRadius: "999px",
                border: `1px solid ${status.border}`,
                backgroundColor: status.background,
                color: status.color,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: "nowrap",
            }}
        >
            {status.label}
        </Box>
    );
}

function DetailRow(props: { icon: ReactNode; label: string; value: string }) {
    const { icon, label, value } = props;

    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
                sx={{
                    width: 24,
                    height: 24,
                    borderRadius: theme.shape.small,
                    backgroundColor: theme.palette.background[3],
                    color: theme.palette.text.secondary,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    "& svg": {
                        width: 14,
                        height: 14,
                    },
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    sx={{
                        color: theme.palette.text.hint,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1.25,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    sx={{
                        color: theme.palette.text.primary,
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {value}
                </Typography>
            </Box>
        </Stack>
    );
}

type BookingCardProps = {
    order: ChatOrder;
    selected: boolean;
    onOpenChat: (orderId: string) => void;
    onCancel: (order: ChatOrder) => void;
};

function BookingCard(props: BookingCardProps) {
    const { order, selected, onOpenChat, onCancel } = props;
    const providerPhone = getProviderPhone(order);
    const [expanded, setExpanded] = useState(selected);

    useEffect(() => {
        if (selected) setExpanded(true);
    }, [selected]);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                borderRadius: theme.shape.large,
                backgroundColor: theme.palette.white,
                border: selected
                    ? `1px solid ${theme.palette.actions.brand}`
                    : `1px solid ${theme.palette.base.generic}`,
                boxShadow: selected ? theme.shadows.hover : theme.shadows.separator,
                scrollMarginTop: 76,
            }}
        >
            <Stack>
                <Stack
                    component="button"
                    type="button"
                    direction="row"
                    spacing={1.2}
                    alignItems="flex-start"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Свернуть" : "Развернуть"} заказ мастеру ${getProviderName(order)}`}
                    sx={{
                        width: "100%",
                        p: 0,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                        font: "inherit",
                    }}
                >
                    <IconFrame>
                        <WrenchIcon />
                    </IconFrame>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            sx={{
                                color: theme.palette.text.primary,
                                fontSize: 16,
                                fontWeight: 800,
                                lineHeight: 1.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {getProviderName(order)}
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.35,
                                color: theme.palette.text.secondary,
                                fontSize: 12.5,
                                lineHeight: 1.35,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {order.description || "Описание проблемы не указано"}
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={0.65}
                            alignItems="center"
                            flexWrap="wrap"
                            sx={{ mt: 0.7, rowGap: 0.35 }}
                        >
                            <Typography
                                sx={{
                                    color: theme.palette.text.hint,
                                    fontSize: 11,
                                    lineHeight: 1.25,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {order.carBrand || "Авто не указано"}
                            </Typography>
                            <Typography
                                component="span"
                                sx={{ color: theme.palette.text.hint, fontSize: 11 }}
                            >
                                ·
                            </Typography>
                            <Typography
                                sx={{
                                    color: theme.palette.text.hint,
                                    fontSize: 11,
                                    lineHeight: 1.25,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {order.status === "completed"
                                    ? `Завершено ${formatDate(getCompletionDate(order))}`
                                    : `Создано ${formatDate(order.createdAt)}`}
                            </Typography>
                            {order.status === "completed" && (
                                <OrderRatingBadge orderId={order.id} />
                            )}
                        </Stack>
                    </Box>

                    <StatusPill status={order.status} />

                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: expanded
                                ? theme.palette.actions.brand
                                : theme.palette.background[3],
                            color: expanded
                                ? theme.palette.text.white
                                : theme.palette.text.secondary,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                        }}
                    >
                        <KeyboardArrowDownRoundedIcon
                            sx={{
                                fontSize: 18,
                                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s",
                            }}
                        />
                    </Box>
                </Stack>

                <Collapse in={expanded} timeout={220} unmountOnExit>
                    <Stack spacing={1.4} sx={{ pt: 1.4 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{
                                p: 1,
                                borderRadius: theme.shape.medium,
                                backgroundColor: theme.palette.background[3],
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <DetailRow
                                    icon={<ClockIcon />}
                                    label="Время"
                                    value={getOrderTimeText(order)}
                                />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <DetailRow
                                    icon={<CalendarIcon />}
                                    label="Создана"
                                    value={formatDate(order.createdAt)}
                                />
                            </Box>
                        </Stack>

                        {order.carBrand && (
                            <Typography
                                sx={{
                                    color: theme.palette.text.compliment,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    lineHeight: 1.35,
                                }}
                            >
                                Авто: {order.carBrand}
                            </Typography>
                        )}

                        <Typography
                            sx={{
                                color: theme.palette.text.secondary,
                                fontSize: 13,
                                lineHeight: 1.45,
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {order.description || "Описание не указано"}
                        </Typography>

                        {order.photoAssetIds && order.photoAssetIds.length > 0 && (
                            <MediaAssetGallery assetIds={order.photoAssetIds} />
                        )}

                        <Stack direction="row" spacing={1}>
                            <Button
                                type="button"
                                variant="contained"
                                onClick={() => onOpenChat(order.id)}
                                startIcon={<ChatIcon />}
                                aria-label={`Открыть чат по записи ${getServiceName(order)}`}
                                sx={{
                                    flex: 1,
                                    minHeight: 42,
                                    borderRadius: theme.shape.medium,
                                    backgroundColor: theme.palette.actions.brand,
                                    color: theme.palette.text.white,
                                    boxShadow: "none",
                                    textTransform: "none",
                                    fontSize: 14,
                                    fontWeight: 800,
                                    "&:hover": {
                                        backgroundColor: theme.palette.actions.brandHeavy,
                                        boxShadow: "none",
                                    },
                                    "& svg": {
                                        width: 18,
                                        height: 18,
                                    },
                                }}
                            >
                                Чат
                            </Button>

                            {providerPhone && (
                                <Button
                                    component="a"
                                    href={`tel:${providerPhone}`}
                                    variant="outlined"
                                    startIcon={<PhoneIcon />}
                                    aria-label={`Позвонить мастеру ${getProviderName(order)}`}
                                    sx={{
                                        flex: 1,
                                        minHeight: 42,
                                        borderRadius: theme.shape.medium,
                                        borderColor: theme.palette.actions.inactive,
                                        color: theme.palette.actions.brandHeavy,
                                        backgroundColor: theme.palette.white,
                                        textTransform: "none",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        "&:hover": {
                                            borderColor: theme.palette.actions.brand,
                                            backgroundColor: theme.palette.success.light,
                                        },
                                        "& svg": {
                                            width: 18,
                                            height: 18,
                                        },
                                    }}
                                >
                                    Позвонить
                                </Button>
                            )}

                            {(order.status === "pending" || order.status === "scheduled") && (
                                <Button
                                    type="button"
                                    variant="outlined"
                                    onClick={() => onCancel(order)}
                                    startIcon={<CloseRoundedIcon />}
                                    aria-label={`Отменить заявку к мастеру ${getProviderName(order)}`}
                                    sx={{
                                        flex: 1,
                                        minHeight: 42,
                                        borderRadius: theme.shape.medium,
                                        borderColor: theme.palette.error.heavy,
                                        color: theme.palette.error.heavy,
                                        backgroundColor: theme.palette.white,
                                        textTransform: "none",
                                        fontSize: 14,
                                        fontWeight: 800,
                                        "&:hover": {
                                            borderColor: theme.palette.error.heavy,
                                            backgroundColor: theme.palette.error.light,
                                        },
                                        "& svg": { width: 18, height: 18 },
                                    }}
                                >
                                    Отменить
                                </Button>
                            )}
                        </Stack>

                        {order.status === "completed" && <OrderReviewPrompt orderId={order.id} />}
                    </Stack>
                </Collapse>
            </Stack>
        </Paper>
    );
}

function NextBookingPanel(props: {
    order: ChatOrder | null;
    activeCount: number;
    completedCount: number;
    onOpenChat: (orderId: string) => void;
}) {
    const { order, activeCount, completedCount, onOpenChat } = props;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1.5,
                borderRadius: theme.shape.large,
                color: theme.palette.text.white,
                background: `linear-gradient(135deg, ${theme.palette.actions.brandHeavy}, ${theme.palette.actions.brand})`,
                boxShadow: "0 12px 32px rgba(78, 153, 45, 0.18)",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <Stack spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <IconFrame compact>
                        <CalendarIcon />
                    </IconFrame>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "rgba(255, 255, 255, 0.76)",
                                lineHeight: 1.2,
                            }}
                        >
                            Активная заявка
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.2,
                                fontSize: 18,
                                fontWeight: 900,
                                lineHeight: 1.16,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {order ? getServiceName(order) : "Нет активных записей"}
                        </Typography>
                    </Box>
                    {order && <StatusPill status={order.status} />}
                </Stack>

                {order ? (
                    <Stack spacing={1.2}>
                        <Typography
                            sx={{
                                fontSize: 13,
                                lineHeight: 1.45,
                                color: "rgba(255, 255, 255, 0.86)",
                            }}
                        >
                            {getProviderName(order)} · {getOrderTimeText(order)}
                        </Typography>

                        <Button
                            type="button"
                            variant="contained"
                            onClick={() => onOpenChat(order.id)}
                            startIcon={<ChatIcon />}
                            sx={{
                                alignSelf: "flex-start",
                                minHeight: 38,
                                borderRadius: theme.shape.medium,
                                backgroundColor: theme.palette.white,
                                color: theme.palette.actions.brandHeavy,
                                boxShadow: "none",
                                textTransform: "none",
                                fontSize: 13,
                                fontWeight: 900,
                                px: 1.4,
                                "&:hover": {
                                    backgroundColor: theme.palette.success.light,
                                    boxShadow: "none",
                                },
                                "& svg": {
                                    width: 17,
                                    height: 17,
                                },
                            }}
                        >
                            Открыть чат
                        </Button>
                    </Stack>
                ) : (
                    <Typography
                        sx={{
                            color: "rgba(255, 255, 255, 0.82)",
                            fontSize: 13,
                            lineHeight: 1.45,
                        }}
                    >
                        Когда мастер подтвердит заявку, она появится здесь.
                    </Typography>
                )}

                <Stack direction="row" spacing={1}>
                    <Box
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: theme.shape.medium,
                            backgroundColor: "rgba(255, 255, 255, 0.13)",
                        }}
                    >
                        <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                            {activeCount}
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.45,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "rgba(255, 255, 255, 0.74)",
                            }}
                        >
                            активные
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: theme.shape.medium,
                            backgroundColor: "rgba(255, 255, 255, 0.13)",
                        }}
                    >
                        <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                            {completedCount}
                        </Typography>
                        <Typography
                            sx={{
                                mt: 0.45,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "rgba(255, 255, 255, 0.74)",
                            }}
                        >
                            выполнены
                        </Typography>
                    </Box>
                </Stack>
            </Stack>
        </Paper>
    );
}

function EmptyState(props: { tab: BookingTab }) {
    const copy: Record<BookingTab, string> = {
        pending: "Новых заявок пока нет.",
        confirmed: "Подтвержденных записей пока нет.",
        completed: "Выполненных записей пока нет.",
        cancelled: "Отмененных записей пока нет.",
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: theme.shape.large,
                backgroundColor: theme.palette.white,
                border: `1px solid ${theme.palette.base.generic}`,
                textAlign: "center",
            }}
        >
            <Stack spacing={1.2} alignItems="center">
                <IconFrame>
                    <CalendarIcon />
                </IconFrame>
                <Typography
                    sx={{
                        color: theme.palette.text.primary,
                        fontSize: 16,
                        fontWeight: 800,
                        lineHeight: 1.2,
                    }}
                >
                    {copy[props.tab]}
                </Typography>
                <Typography
                    sx={{
                        maxWidth: 300,
                        color: theme.palette.text.secondary,
                        fontSize: 13,
                        lineHeight: 1.45,
                    }}
                >
                    Здесь будут отображаться заявки и записи к мастерам.
                </Typography>
            </Stack>
        </Paper>
    );
}

export function Bookings() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const selectedOrderId = searchParams.get("orderId");
    const initialTab: BookingTab =
        tabParam === "confirmed" ||
        tabParam === "completed" ||
        tabParam === "cancelled"
            ? tabParam
            : "pending";
    const [tab, setTab] = useState<BookingTab>("pending");
    const [cancelDialogOrder, setCancelDialogOrder] = useState<ChatOrder | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);

    const { data: orders, isLoading } = useQuery({
        queryKey: ["customerBookings", profile?.id],
        queryFn: getCustomerOrders,
        enabled: !!profile?.id,
    });

    const sortedOrders = useMemo(() => {
        return [...(orders ?? [])].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [orders]);

    const grouped = useMemo<BookingGroup>(() => {
        return {
            pending: sortedOrders.filter((order) => order.status === "pending"),
            confirmed: sortedOrders.filter(
                (order) => order.status === "scheduled"
            ),
            completed: sortedOrders.filter(
                (order) => order.status === "completed"
            ),
            cancelled: sortedOrders.filter(
                (order) => order.status === "cancelled"
            ),
        };
    }, [sortedOrders]);

    const activeOrders = grouped[tab];
    const nextOrder = useMemo(() => getNextOrder(grouped), [grouped]);
    const activeCount = grouped.pending.length + grouped.confirmed.length;
    const completedCount = grouped.completed.length;

    const handleTabChange = (value: BookingTab) => {
        setTab(value);
        setSearchParams({ tab: value });
    };

    const handleOpenChat = (orderId: string) => {
        navigate(`/cabinet/chats?tab=ordinary&orderId=${orderId}`);
    };

    const cancelMutation = useMutation({
        mutationFn: (order: ChatOrder) =>
            updateOrderStatus(order.id, {
                status: "cancelled",
                cancelReason: cancelReason.trim() || "Отменено клиентом",
                expectedUpdatedAt: order.updatedAt,
            }),
        onSuccess: () => {
            setCancelDialogOrder(null);
            setCancelReason("");
            queryClient.invalidateQueries({ queryKey: ["customerBookings", profile?.id] });
            queryClient.invalidateQueries({ queryKey: ["customerOrdersForChat", profile?.id] });
            queryClient.invalidateQueries({ queryKey: ["orderChat"] });
        },
    });

    if (!profile) return null;

    return (
        <DashboardLayout title="Записи">
            <Stack
                spacing={2}
                sx={{
                    width: "100%",
                    maxWidth: 760,
                    mx: "auto",
                    pb: { xs: 9, md: 3 },
                    "@media (min-width: 1025px)": {
                        mx: 0,
                        maxWidth: 860,
                    },
                }}
            >
                <Box
                    sx={{
                        pt: 1.5,
                        "@media (min-width: 1025px)": {
                            pt: 0,
                        },
                    }}
                >
                    <Typography
                        sx={{
                            color: theme.palette.text.primary,
                            fontSize: 22,
                            fontWeight: 900,
                            lineHeight: 1.15,
                        }}
                    >
                        Мои записи
                    </Typography>
                    <Typography
                        sx={{
                            mt: 0.6,
                            color: theme.palette.text.secondary,
                            fontSize: 13,
                            lineHeight: 1.45,
                        }}
                    >
                        Заявки, подтвержденные визиты и история обращений к мастерам.
                    </Typography>
                </Box>

                <NextBookingPanel
                    order={nextOrder}
                    activeCount={activeCount}
                    completedCount={completedCount}
                    onOpenChat={handleOpenChat}
                />

                <Box
                    sx={{
                        mx: { xs: -2, sm: 0 },
                        px: { xs: 2, sm: 0 },
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": {
                            display: "none",
                        },
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{ minWidth: "max-content" }}>
                        {TAB_CONFIG.map((item) => {
                            const selected = tab === item.value;

                            return (
                                <Box
                                    key={item.value}
                                    component="button"
                                    type="button"
                                    onClick={() => handleTabChange(item.value)}
                                    aria-pressed={selected}
                                    sx={{
                                        minHeight: 38,
                                        px: 1.35,
                                        borderRadius: "999px",
                                        border: selected
                                            ? `1px solid ${theme.palette.actions.brand}`
                                            : `1px solid ${theme.palette.base.generic}`,
                                        backgroundColor: selected
                                            ? theme.palette.success.light
                                            : theme.palette.white,
                                        color: selected
                                            ? theme.palette.actions.brandHeavy
                                            : theme.palette.text.compliment,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.8,
                                        fontSize: 13,
                                        fontWeight: 800,
                                        boxShadow: selected ? theme.shadows.separator : "none",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {item.label}
                                    <Box
                                        component="span"
                                        sx={{
                                            minWidth: 22,
                                            height: 22,
                                            px: 0.65,
                                            borderRadius: "999px",
                                            backgroundColor: selected
                                                ? theme.palette.actions.brand
                                                : theme.palette.background[3],
                                            color: selected
                                                ? theme.palette.text.white
                                                : theme.palette.text.secondary,
                                            display: "grid",
                                            placeItems: "center",
                                            fontSize: 12,
                                            fontWeight: 900,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {grouped[item.value].length}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>

                {isLoading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress
                            size={28}
                            sx={{ color: theme.palette.actions.brand }}
                        />
                    </Box>
                )}

                {!isLoading && activeOrders.length === 0 && <EmptyState tab={tab} />}

                {!isLoading && activeOrders.length > 0 && (
                    <Stack spacing={1.2}>
                        {activeOrders.map((order) => (
                            <BookingCard
                                key={order.id}
                                order={order}
                                selected={order.id === selectedOrderId}
                                onOpenChat={handleOpenChat}
                                onCancel={setCancelDialogOrder}
                            />
                        ))}
                    </Stack>
                )}

                {!isLoading && tab === "cancelled" && activeOrders.length > 0 && (
                    <Alert
                        severity="info"
                        sx={{
                            borderRadius: theme.shape.large,
                            backgroundColor: theme.palette.info.light,
                            color: theme.palette.info.heavy,
                            "& .MuiAlert-icon": {
                                color: theme.palette.info.heavy,
                            },
                        }}
                    >
                        Здесь отображаются записи, которые были отменены.
                    </Alert>
                )}

                <Dialog
                    open={Boolean(cancelDialogOrder)}
                    onClose={() => {
                        if (!cancelMutation.isPending) setCancelDialogOrder(null);
                    }}
                    fullWidth
                    maxWidth="xs"
                >
                    <DialogTitle>Отменить заявку?</DialogTitle>
                    <DialogContent>
                        <Typography sx={{ mb: 1.5, color: theme.palette.text.secondary }}>
                            Заявка будет отменена, а исполнитель увидит это событие в общем чате.
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Причина (необязательно)"
                            value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => setCancelDialogOrder(null)}
                            disabled={cancelMutation.isPending}
                        >
                            Назад
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() => cancelDialogOrder && cancelMutation.mutate(cancelDialogOrder)}
                            disabled={cancelMutation.isPending}
                        >
                            Отменить заявку
                        </Button>
                    </DialogActions>
                </Dialog>
            </Stack>
        </DashboardLayout>
    );
}
