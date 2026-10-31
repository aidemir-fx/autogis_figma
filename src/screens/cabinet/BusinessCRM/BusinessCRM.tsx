import { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Typography,
} from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";
import { hasCapability } from "@common/lib/userAccess";
import { useAutoService, useUserProfile } from "@common/hooks";
import { ChatOrder, NormalizedOrderStatus, getProviderOrders } from "@modules/chats/api";

type Filter = NormalizedOrderStatus | "all";

const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "Все" },
    { value: "pending", label: "Новые" },
    { value: "scheduled", label: "Запланированы" },
    { value: "completed", label: "Завершены" },
    { value: "cancelled", label: "Отменены" },
];

const STATUS_META: Record<NormalizedOrderStatus, { label: string; color: "primary" | "warning" | "success" | "default" }> = {
    pending: { label: "Новая", color: "primary" },
    scheduled: { label: "Запланирована", color: "warning" },
    completed: { label: "Завершена", color: "success" },
    cancelled: { label: "Отменена", color: "default" },
};

function isSameDay(value?: string) {
    if (!value) return false;
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isCurrentMonth(value: string) {
    const date = new Date(value);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function formatMoney(value: number) {
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
    }).format(value);
}

function getClientName(order: ChatOrder) {
    return order.name || order.customer?.name || order.customer?.phone || "Клиент без имени";
}

function getVehicleLabel(order: ChatOrder) {
    return order.carBrand || "Марка автомобиля не указана";
}

function getOrderTitle(order: ChatOrder) {
    const description = order.description?.trim();
    if (!description) return "Заявка на обслуживание";
    return description.split("\n")[0].slice(0, 72);
}

function MetricCard({
    icon,
    label,
    value,
    caption,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    caption?: string;
    color: string;
}) {
    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                background: "#fff",
                minWidth: 0,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        color,
                        background: `${color}18`,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ fontSize: 11, color: "#64748b", lineHeight: 1.15 }}>
                    {label}
                </Typography>
            </Stack>
            <Typography sx={{ mt: 1, fontSize: 22, fontWeight: 850, color: "#0f172a", lineHeight: 1 }}>
                {value}
            </Typography>
            {caption ? (
                <Typography sx={{ mt: 0.65, fontSize: 11, color: "#64748b" }}>
                    {caption}
                </Typography>
            ) : null}
        </Box>
    );
}

function OrderRow({ order, onOpen }: { order: ChatOrder; onOpen: () => void }) {
    const meta = STATUS_META[order.status];
    const appointment = order.confirmedDateTime
        ? new Date(order.confirmedDateTime).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "Дата не назначена";

    return (
        <Box
            component="button"
            type="button"
            onClick={onOpen}
            sx={{
                width: "100%",
                display: "block",
                textAlign: "left",
                border: 0,
                background: "transparent",
                p: 0,
                cursor: "pointer",
                font: "inherit",
            }}
        >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 1.1 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        color: "#0369a1",
                        background: "#e0f2fe",
                        flexShrink: 0,
                    }}
                >
                    <DirectionsCarRoundedIcon fontSize="small" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }} noWrap>
                        {getClientName(order)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748b" }} noWrap>
                        {getVehicleLabel(order)} · {getOrderTitle(order)}
                    </Typography>
                </Box>
                <Stack alignItems="flex-end" spacing={0.35} sx={{ flexShrink: 0 }}>
                    <Chip label={meta.label} color={meta.color} size="small" sx={{ height: 22, fontSize: 10 }} />
                    <Typography sx={{ fontSize: 10, color: "#64748b" }}>{appointment}</Typography>
                </Stack>
            </Stack>
            <Divider />
        </Box>
    );
}

export function BusinessCRM() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const { autoService } = useAutoService();
    const [filter, setFilter] = useState<Filter>("all");
    const hasAccess = hasCapability(profile, "businessCrm");

    const ordersQuery = useQuery({
        queryKey: ["business-crm", "orders", profile?.id],
        queryFn: getProviderOrders,
        enabled: Boolean(profile?.id) && hasAccess,
        staleTime: 30_000,
    });

    const orders = ordersQuery.data ?? [];
    const metrics = useMemo(() => {
        const completedThisMonth = orders.filter(
            (order) => order.status === "completed" && isCurrentMonth(order.updatedAt ?? order.createdAt),
        );
        const pricedCompleted = completedThisMonth.filter((order) => typeof order.price === "number");
        const revenue = pricedCompleted.reduce((sum, order) => sum + (order.price ?? 0), 0);
        const todayAppointments = orders.filter(
            (order) => order.status === "scheduled" && isSameDay(order.confirmedDateTime),
        );

        return {
            newOrders: orders.filter((order) => order.status === "pending").length,
            todayAppointments: todayAppointments.length,
            activeOrders: orders.filter((order) => order.status === "scheduled").length,
            completedThisMonth: completedThisMonth.length,
            cancelledThisMonth: orders.filter(
                (order) => order.status === "cancelled" && isCurrentMonth(order.updatedAt ?? order.createdAt),
            ).length,
            revenue,
            averageCheck: pricedCompleted.length ? revenue / pricedCompleted.length : 0,
            clients: new Set(orders.map((order) => order.customer?.id || order.phone)).size,
            vehicles: new Set(
                orders.map((order) => `${order.customer?.id || order.phone}:${order.carBrand || "unknown"}`),
            ).size,
        };
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const filtered = filter === "all" ? orders : orders.filter((order) => order.status === filter);
        return [...filtered].sort((a, b) => {
            const aDate = new Date(a.confirmedDateTime ?? a.createdAt).getTime();
            const bDate = new Date(b.confirmedDateTime ?? b.createdAt).getTime();
            return bDate - aDate;
        });
    }, [filter, orders]);

    // Услуги автосервиса хранятся и обновляются отдельным профилем.
    // Общий /users/profile/me их не возвращает, поэтому не используем
    // profile.autoService как основной источник для CRM.
    const serviceList = autoService?.services ?? profile?.autoService?.services ?? [];

    if (!profile) return null;

    if (!hasAccess) {
        return (
            <DashboardLayout title="CRM автосервиса">
                <Alert severity="info">
                    CRM доступна только бизнес-профилю автосервиса. Для частных исполнителей,
                    автомоек и автомагазинов этот раздел пока не подключён.
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="CRM автосервиса">
            <Box sx={{ maxWidth: 900, mx: "auto", pb: { xs: "calc(80px + env(safe-area-inset-bottom, 0px))", md: 3 } }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 850, color: "#0f172a" }}>
                            Обзор автосервиса
                        </Typography>
                        <Typography sx={{ mt: 0.35, fontSize: 13, color: "#64748b" }}>
                            Заявки, записи и текущая загрузка в одном месте.
                        </Typography>
                    </Box>

                    <Alert severity="info" sx={{ borderRadius: 2.5, fontSize: 12 }}>
                        Выручка считается по завершённым заказам с указанной стоимостью. Учёт оплат
                        подключим отдельным этапом.
                    </Alert>

                    {ordersQuery.isLoading ? (
                        <Box sx={{ minHeight: 140, display: "grid", placeItems: "center" }}>
                            <CircularProgress size={26} />
                        </Box>
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                            <MetricCard icon={<QueryStatsRoundedIcon fontSize="small" />} label="Новые заявки" value={metrics.newOrders} color="#2563eb" />
                            <MetricCard icon={<EventAvailableRoundedIcon fontSize="small" />} label="Записи сегодня" value={metrics.todayAppointments} color="#d97706" />
                            <MetricCard icon={<ScheduleRoundedIcon fontSize="small" />} label="Активные записи" value={metrics.activeOrders} color="#7c3aed" />
                            <MetricCard icon={<TaskAltRoundedIcon fontSize="small" />} label="Завершено за месяц" value={metrics.completedThisMonth} color="#16a34a" />
                            <MetricCard icon={<PaymentsRoundedIcon fontSize="small" />} label="Сумма за месяц" value={formatMoney(metrics.revenue)} color="#0891b2" />
                            <MetricCard icon={<PaymentsRoundedIcon fontSize="small" />} label="Средний чек" value={formatMoney(metrics.averageCheck)} color="#0f766e" />
                            <MetricCard icon={<GroupRoundedIcon fontSize="small" />} label="Клиенты" value={metrics.clients} color="#db2777" />
                            <MetricCard icon={<DirectionsCarRoundedIcon fontSize="small" />} label="Автомобили" value={metrics.vehicles} color="#475569" />
                        </Box>
                    )}

                    <Box sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0", background: "#fff" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                            <Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 850 }}>Заявки и записи</Typography>
                                <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                                    Всего заказов: {orders.length} · отменено за месяц: {metrics.cancelledThisMonth}
                                </Typography>
                            </Box>
                            <Button size="small" onClick={() => navigate("/cabinet/applications")} sx={{ whiteSpace: "nowrap" }}>
                                Все заявки
                            </Button>
                        </Stack>
                        <Stack direction="row" spacing={0.75} sx={{ overflowX: "auto", pb: 0.5 }}>
                            {FILTERS.map((item) => (
                                <Chip
                                    key={item.value}
                                    label={item.label}
                                    onClick={() => setFilter(item.value)}
                                    color={filter === item.value ? "primary" : "default"}
                                    variant={filter === item.value ? "filled" : "outlined"}
                                    size="small"
                                />
                            ))}
                        </Stack>
                        <Box sx={{ mt: 0.5 }}>
                            {filteredOrders.length === 0 ? (
                                <Typography sx={{ py: 3, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                    По выбранному фильтру заявок нет.
                                </Typography>
                            ) : (
                                filteredOrders.slice(0, 8).map((order) => (
                                    <OrderRow key={order.id} order={order} onOpen={() => navigate(`/cabinet/applications?orderId=${order.id}`)} />
                                ))
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
                        <Box sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0", background: "#fff" }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <GroupRoundedIcon sx={{ color: "#db2777" }} />
                                <Typography sx={{ fontSize: 16, fontWeight: 850 }}>Клиенты</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 13, color: "#475569" }}>
                                Клиенты автоматически собираются из заявок автосервиса. В карточке заявки
                                доступны контакт, автомобиль и история обращения.
                            </Typography>
                            <Button sx={{ mt: 1.25 }} onClick={() => navigate("/cabinet/applications")}>
                                Открыть заявки
                            </Button>
                        </Box>

                        <Box sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0", background: "#fff" }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <DirectionsCarRoundedIcon sx={{ color: "#475569" }} />
                                <Typography sx={{ fontSize: 16, fontWeight: 850 }}>Автомобили</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 13, color: "#475569" }}>
                                Сейчас учитываются марки автомобилей из заявок. Модель, VIN и полноценную
                                сервисную историю добавим отдельным этапом.
                            </Typography>
                            <Typography sx={{ mt: 1.25, fontSize: 20, fontWeight: 850, color: "#0f172a" }}>
                                {metrics.vehicles}
                                <Typography component="span" sx={{ ml: 0.75, fontSize: 12, fontWeight: 500, color: "#64748b" }}>
                                    уникальных автомобилей
                                </Typography>
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0", background: "#fff" }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <PaymentsRoundedIcon sx={{ color: "#0891b2" }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 850 }}>Услуги автосервиса</Typography>
                        </Stack>
                        {serviceList.length > 0 ? (
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                {serviceList.map((service) => (
                                    <Chip key={service} label={service} size="small" variant="outlined" />
                                ))}
                            </Stack>
                        ) : (
                            <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                                Услуги пока не заполнены в профессиональном профиле.
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </Box>
        </DashboardLayout>
    );
}
