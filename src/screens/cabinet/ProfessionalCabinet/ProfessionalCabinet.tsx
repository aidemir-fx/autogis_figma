import React from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { hasCapability } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";
import { ChatOrder, getProviderOrders } from "@modules/chats/api";
import { ORDER_TIME_PREFERENCE_LABELS } from "@modules/orders/api";
import { palette as applicationsPalette } from "../Applications/components/styles";
import { ProfessionalStoriesSection } from "./ProfessionalStoriesSection";

type Tone = {
    accent: string;
    accentSoft: string;
    accentText: string;
};

const ui = {
    page: "#f1f5f9",
    surface: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    textMuted: "#64748b",
    red: applicationsPalette.urgent,
    redSoft: applicationsPalette.urgentSoft,
};

const cabinetPalette = {
    accent: "#0284c7",
    accentSoft: "#e0f2fe",
    accentText: "#0369a1",
    panel: "#f8fafc",
    timeBg: "#f8fafc",
    timeBorder: "#e2e8f0",
    timeText: "#334155",
    currentBg: "#f4f8ff",
    currentBorder: "#bfdbfe",
    currentText: "#2d5f99",
};

const cabinetTone: Tone = {
    accent: cabinetPalette.accent,
    accentSoft: cabinetPalette.accentSoft,
    accentText: cabinetPalette.accentText,
};

const REQUEST_PREVIEW_LIMIT = 3;
const DAY_FEED_LIMIT = 4;

function pluralRu(count: number, one: string, few: string, many: string) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function getClientName(order: ChatOrder) {
    return order.name || order.customer?.name || order.customer?.phone || "Без имени";
}

function getVehicleLabel(order: ChatOrder) {
    return order.carBrand || order.activityType?.displayName || "Авто не указано";
}

function getTimePreferenceLabel(value?: string) {
    if (!value) return null;
    return (
        ORDER_TIME_PREFERENCE_LABELS[
            value as keyof typeof ORDER_TIME_PREFERENCE_LABELS
        ] || value
    );
}

function getOrderNote(order: ChatOrder) {
    const details = [
        order.description,
        order.photoAssetIds?.length ? `${order.photoAssetIds.length} фото` : null,
        getTimePreferenceLabel(order.timePreference),
    ].filter(Boolean);

    return details.join(" · ") || "Описание не указано";
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function isCurrentSlot(dateTime: string) {
    const start = new Date(dateTime).getTime();
    const now = Date.now();
    const end = start + 60 * 60_000;
    return now >= start && now <= end;
}

function IconBox({
    children,
    tone,
    size = 36,
}: {
    children: React.ReactNode;
    tone: Tone;
    size?: number;
}) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: "8px",
                background: tone.accentSoft,
                color: tone.accentText,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                "& svg": { fontSize: Math.max(16, size / 2) },
            }}
        >
            {children}
        </Box>
    );
}

function SectionCard({
    children,
    icon,
    title,
    subtitle,
    action,
    onAction,
}: {
    children?: React.ReactNode;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    action?: string;
    onAction?: () => void;
}) {
    return (
        <Box
            sx={{
                background: ui.surface,
                border: `1px solid ${ui.border}`,
                borderRadius: "20px",
                p: 2,
                minWidth: 0,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: children ? 1.1 : 0,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                    }}
                >
                    <IconBox tone={cabinetTone} size={32}>
                        {icon}
                    </IconBox>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                color: ui.text,
                                fontSize: 15,
                                fontWeight: 850,
                                lineHeight: 1.15,
                            }}
                        >
                            {title}
                        </Typography>
                        {subtitle ? (
                            <Typography
                                sx={{
                                    color: ui.textMuted,
                                    fontSize: 12,
                                    lineHeight: 1.25,
                                    mt: 0.2,
                                }}
                            >
                                {subtitle}
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
                {action && onAction ? (
                    <Button
                        size="small"
                        endIcon={<ChevronRightRoundedIcon />}
                        onClick={onAction}
                        sx={{
                            minWidth: 0,
                            px: 0.5,
                            color: cabinetTone.accentText,
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: "8px",
                            whiteSpace: "nowrap",
                            textTransform: "none",
                        }}
                    >
                        {action}
                    </Button>
                ) : null}
            </Box>
            {children ? children : null}
        </Box>
    );
}

function KpiRow({ pending, today }: { pending: number; today: number }) {
    const items = [
        { label: "Новые заявки", value: pending, tone: "#ff6a00", note: pending ? "требуют решения" : "всё обработано" },
        { label: "Сегодня", value: today, tone: "#0284c7", note: today ? "записей на день" : "записей пока нет" },
    ];

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
            {items.map((item) => (
                <Box key={item.label} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", p: { xs: 1.25, sm: 1.5 }, minWidth: 0 }}>
                    <Typography sx={{ color: "#64748b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontSize: { xs: 21, sm: 24 }, fontWeight: 850, lineHeight: 1.1, mt: 0.5 }}>
                        {item.value}
                    </Typography>
                    <Typography sx={{ color: item.tone, fontSize: 10, fontWeight: 650, mt: 0.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.note}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function LoadingState() {
    return (
        <Box
            sx={{
                minHeight: 68,
                display: "grid",
                placeItems: "center",
                color: ui.textMuted,
            }}
        >
            <CircularProgress size={22} />
        </Box>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <Box
            sx={{
                border: `1px dashed ${cabinetPalette.timeBorder}`,
                borderRadius: "8px",
                background: cabinetPalette.timeBg,
                color: ui.textMuted,
                px: 1,
                py: 1.1,
                fontSize: 13,
                lineHeight: 1.35,
            }}
        >
            {text}
        </Box>
    );
}

function DayFeed({
    orders,
    onOpenOrder,
}: {
    orders: ChatOrder[];
    onOpenOrder: (orderId: string) => void;
}) {
    if (orders.length === 0) {
        return <EmptyState text="На сегодня подтверждённых записей нет." />;
    }

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(4, minmax(64px, 1fr))",
                    sm: "repeat(4, minmax(96px, 1fr))",
                },
                gap: 0.75,
                overflowX: "auto",
                pb: 0.25,
            }}
        >
            {orders.slice(0, DAY_FEED_LIMIT).map((order) => {
                const isActive = isCurrentSlot(order.confirmedDateTime as string);
                return (
                    <Box
                        key={order.id}
                        component="button"
                        type="button"
                        onClick={() => onOpenOrder(order.id)}
                        sx={{
                            minWidth: 64,
                            borderRadius: "8px",
                            border: `1px solid ${
                                isActive
                                    ? cabinetPalette.currentBorder
                                    : cabinetPalette.timeBorder
                            }`,
                            background: isActive
                                ? cabinetPalette.currentBg
                                : cabinetPalette.timeBg,
                            p: 0.85,
                            cursor: "pointer",
                            textAlign: "left",
                            font: "inherit",
                            transition:
                                "border-color 0.16s ease, background 0.16s ease",
                            "&:hover": {
                                borderColor: cabinetPalette.currentBorder,
                                background: cabinetPalette.currentBg,
                            },
                        }}
                    >
                        <Typography
                            sx={{
                                color: isActive
                                    ? cabinetPalette.currentText
                                    : cabinetPalette.timeText,
                                fontSize: 12,
                                fontWeight: isActive ? 800 : 750,
                                lineHeight: 1.25,
                            }}
                        >
                            {formatTime(order.confirmedDateTime as string)}
                        </Typography>
                        <Typography
                            sx={{
                                color: isActive
                                    ? cabinetPalette.currentText
                                    : ui.textMuted,
                                fontSize: 11,
                                fontWeight: isActive ? 650 : 500,
                                mt: 0.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {getClientName(order)}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

function RequestPreview({
    orders,
    pendingCount,
    onOpenOrder,
    onOpenPending,
}: {
    orders: ChatOrder[];
    pendingCount: number;
    onOpenOrder: (orderId: string) => void;
    onOpenPending: () => void;
}) {
    const visibleOrders = orders.slice(0, REQUEST_PREVIEW_LIMIT);
    const remainingCount = Math.max(0, pendingCount - visibleOrders.length);

    if (pendingCount === 0) {
        return <EmptyState text="Новых заявок без решения мастера пока нет." />;
    }

    return (
        <Stack spacing={0.75}>
            {visibleOrders.map((order) => {
                const isUrgent = order.timePreference === "urgent";
                return (
                    <Box
                        key={order.id}
                        component="button"
                        type="button"
                        onClick={() => onOpenOrder(order.id)}
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 1,
                            alignItems: "start",
                            border: `1px solid ${ui.border}`,
                            borderRadius: "8px",
                            background: ui.page,
                            p: 0.9,
                            minWidth: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            font: "inherit",
                            transition:
                                "border-color 0.16s ease, background 0.16s ease",
                            "&:hover": {
                                borderColor: cabinetPalette.currentBorder,
                                background: cabinetPalette.accentSoft,
                            },
                        }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                sx={{
                                    color: ui.text,
                                    fontSize: 13,
                                    fontWeight: 850,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {getClientName(order)} · {getVehicleLabel(order)}
                            </Typography>
                            <Typography
                                sx={{
                                    color: ui.textMuted,
                                    fontSize: 12,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {getOrderNote(order)}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                borderRadius: "8px",
                                background: isUrgent
                                    ? ui.redSoft
                                    : cabinetPalette.timeBg,
                                color: isUrgent ? ui.red : cabinetPalette.timeText,
                                px: 0.8,
                                py: 0.3,
                                fontSize: 10,
                                fontWeight: 850,
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {isUrgent ? "срочно" : "новая"}
                        </Box>
                    </Box>
                );
            })}
            {remainingCount > 0 ? (
                <Box
                    component="button"
                    type="button"
                    onClick={onOpenPending}
                    sx={{
                        minHeight: 36,
                        borderRadius: "8px",
                        border: `1px dashed ${cabinetPalette.currentBorder}`,
                        background: cabinetPalette.accentSoft,
                        color: cabinetPalette.accentText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.35,
                        px: 1,
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 750,
                        transition:
                            "border-color 0.16s ease, background 0.16s ease",
                        "& svg": { fontSize: 18 },
                        "&:hover": {
                            borderColor: cabinetPalette.accent,
                            background: ui.surface,
                        },
                    }}
                >
                    Ещё {remainingCount}
                    <ChevronRightRoundedIcon />
                </Box>
            ) : null}
        </Stack>
    );
}

export function ProfessionalCabinet() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const hasAutoServiceActivity = profile?.activityTypes?.some(
        (activity) => activity.name === "auto_service",
    );
    const hasAutoWashActivity = profile?.activityTypes?.some(
        (activity) => activity.name === "auto_wash",
    );
    const settingsRoute =
        profile?.accountType === "auto_service" ||
        profile?.role === "auto_service" ||
        hasAutoServiceActivity
            ? "/cabinet/auto-service-settings"
            : profile?.accountType === "auto_shop" || profile?.role === "auto_shop"
              ? "/cabinet/auto-shop-settings"
              : profile?.accountType === "auto_wash" ||
                  profile?.role === "auto_wash" ||
                  hasAutoWashActivity
                ? "/cabinet/auto-wash-settings"
                : "/cabinet/master-settings";
    const settingsSubtitle =
        profile?.accountType === "auto_service" || profile?.role === "auto_service"
            ? "настройки автосервиса"
            : profile?.accountType === "auto_shop" || profile?.role === "auto_shop"
              ? "настройки автомагазина"
              : profile?.accountType === "auto_wash" || profile?.role === "auto_wash"
                ? "настройки автомойки"
                : "настройки частного исполнителя";
    const hasProfessionalCabinetAccess = hasCapability(
        profile,
        "professionalCabinet",
    );
    const hasApplicationsAccess = hasCapability(profile, "applications");
    const hasCalendarAccess = hasCapability(profile, "calendar");
    const hasBusinessCrmAccess = hasCapability(profile, "businessCrm");
    const hasAnyCrmAccess = hasApplicationsAccess || hasCalendarAccess;

    const { data: orders, isLoading: isOrdersLoading } = useQuery<ChatOrder[]>({
        queryKey: ["providerOrders", profile?.id],
        queryFn: getProviderOrders,
        enabled: !!profile?.id && hasAnyCrmAccess,
        retry: false,
    });

    const pendingOrders = React.useMemo(() => {
        return (orders ?? [])
            .filter((order) => order.status === "pending")
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );
    }, [orders]);

    const scheduleOrders = React.useMemo(() => {
        const now = Date.now();
        return (orders ?? [])
            .filter(
                (order) => order.status === "scheduled" && order.confirmedDateTime,
            )
            .filter(
                (order) =>
                    new Date(order.confirmedDateTime as string).getTime() >=
                    now - 3600_000,
            )
            .sort(
                (a, b) =>
                    new Date(a.confirmedDateTime as string).getTime() -
                    new Date(b.confirmedDateTime as string).getTime(),
            );
    }, [orders]);

    const todayOrders = React.useMemo(() => {
        const today = new Date();
        return scheduleOrders.filter((order) =>
            isSameDay(new Date(order.confirmedDateTime as string), today),
        );
    }, [scheduleOrders]);

    const pendingCount = pendingOrders.length;
    const openOrder = (orderId: string) => {
        navigate(`/cabinet/applications?orderId=${orderId}`);
    };

    if (!profile) return null;

    if (!hasProfessionalCabinetAccess) {
        return (
            <DashboardLayout title="Кабинет">
                <Typography variant="body1" color="text.secondary">
                    Профессиональный кабинет недоступен. Подайте заявку на
                    активацию на странице «Для бизнеса».
                </Typography>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Кабинет">
            <Box
                sx={{
                    maxWidth: 760,
                    mx: "auto",
                    pb: {
                        xs: "calc(80px + env(safe-area-inset-bottom, 0px))",
                        md: 3,
                    },
                    display: "grid",
                    gap: 1.25,
                }}
            >
                {!hasAnyCrmAccess && (
                    <Alert severity="info">
                        Профессиональный кабинет активен. CRM mini доступна всем
                        подтипам частного исполнителя, а бизнес-CRM будет
                        подключаться отдельно, по подписке.
                    </Alert>
                )}

                {hasBusinessCrmAccess && (
                    <SectionCard
                        icon={<QueryStatsRoundedIcon />}
                        title="CRM автосервиса"
                        subtitle="заявки, записи и показатели бизнеса"
                        action="Открыть"
                        onAction={() => navigate("/cabinet/crm")}
                    />
                )}

                <ProfessionalStoriesSection authorId={profile.id} />

                <KpiRow pending={pendingCount} today={todayOrders.length} />

                {hasCalendarAccess && (
                    <SectionCard
                        icon={<RouteRoundedIcon />}
                        title="Лента дня"
                        subtitle="записи, привязанные к заявкам"
                    >
                        {isOrdersLoading ? (
                            <LoadingState />
                        ) : (
                            <DayFeed orders={todayOrders} onOpenOrder={openOrder} />
                        )}
                    </SectionCard>
                )}

                {hasApplicationsAccess && (
                    <SectionCard
                        icon={<AssignmentTurnedInRoundedIcon />}
                        title="Заявки"
                        subtitle={
                            pendingCount
                                ? `${pendingCount} без решения мастера`
                                : "новых заявок нет"
                        }
                        action="Все заявки"
                        onAction={() => navigate("/cabinet/applications")}
                    >
                        {isOrdersLoading ? (
                            <LoadingState />
                        ) : (
                            <RequestPreview
                                orders={pendingOrders}
                                pendingCount={pendingCount}
                                onOpenOrder={openOrder}
                                onOpenPending={() =>
                                    navigate("/cabinet/applications?status=pending")
                                }
                            />
                        )}
                    </SectionCard>
                )}

                <SectionCard
                    icon={<SettingsRoundedIcon />}
                    title="Настройки профессионального кабинета"
                    subtitle={settingsSubtitle}
                    action="Открыть"
                    onAction={() => navigate(settingsRoute)}
                />
            </Box>
        </DashboardLayout>
    );
}
