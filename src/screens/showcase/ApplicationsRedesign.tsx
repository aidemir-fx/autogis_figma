import { useState } from "react";
import { Box, Stack, Typography, Divider, Collapse } from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";

type Status = "pending" | "scheduled" | "completed" | "cancelled";

type DemoOrder = {
    id: string;
    customerName: string;
    activityName: string;
    carBrand: string;
    description: string;
    isUrgent: boolean;
    photoCount: number;
    createdAtTime: string;
    createdAtDate: string;
    status: Status;
    confirmedDateTime?: string;
    cancelReason?: string;
};

const palette = {
    primary: "#3b82f6",
    primaryDark: "#2563eb",
    primarySoft: "#eff6ff",
    primaryBorder: "#c7dafb",
    urgent: "#ef4444",
    urgentSoft: "#fff1f1",
    success: "#16a34a",
    successSoft: "#dcfce7",
    warning: "#d97706",
    warningSoft: "#fef3c7",
    neutral: "#64748b",
    neutralSoft: "#f1f5f9",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fb",
    background: "#f4f6fb",
    border: "#e6e9f0",
    textPrimary: "#0f172a",
    textSecondary: "#6b7384",
};

const STATUS_META: Record<Status, { label: string; color: string; soft: string; icon: React.ReactNode }> = {
    pending: { label: "Ожидает", color: palette.primary, soft: palette.primarySoft, icon: <HourglassTopRoundedIcon sx={{ fontSize: 14 }} /> },
    scheduled: { label: "В работе", color: palette.warning, soft: palette.warningSoft, icon: <EventAvailableRoundedIcon sx={{ fontSize: 14 }} /> },
    completed: { label: "Готово", color: palette.success, soft: palette.successSoft, icon: <TaskAltRoundedIcon sx={{ fontSize: 14 }} /> },
    cancelled: { label: "Отмена", color: palette.neutral, soft: palette.neutralSoft, icon: <BlockRoundedIcon sx={{ fontSize: 14 }} /> },
};

const ORDERS: DemoOrder[] = [
    {
        id: "ORD-7842",
        customerName: "Алишер К.",
        activityName: "Замена тормозных колодок",
        carBrand: "Toyota Camry 2019",
        description:
            "При торможении появился скрип на передней оси, особенно сильно проявляется на низкой скорости. Хотел бы посмотреть колодки и диски.",
        isUrgent: true,
        photoCount: 3,
        createdAtTime: "14:32",
        createdAtDate: "сегодня",
        status: "pending",
    },
    {
        id: "ORD-7841",
        customerName: "Дамир Е.",
        activityName: "Плановое ТО двигателя",
        carBrand: "Hyundai Tucson 2021",
        description: "Подходит срок планового ТО на 60 000 км. Замена масла, фильтров, диагностика.",
        isUrgent: false,
        photoCount: 0,
        createdAtTime: "09:18",
        createdAtDate: "сегодня",
        status: "pending",
    },
    {
        id: "ORD-7840",
        customerName: "Айгерим С.",
        activityName: "Полировка кузова",
        carBrand: "BMW X5 2020",
        description: "Появилось много мелких царапин на капоте и дверях. Хочется убрать без покраски.",
        isUrgent: false,
        photoCount: 5,
        createdAtTime: "11:05",
        createdAtDate: "вчера",
        status: "scheduled",
        confirmedDateTime: "сегодня 15:00",
    },
    {
        id: "ORD-7839",
        customerName: "Болат М.",
        activityName: "Замена ремня ГРМ",
        carBrand: "Volkswagen Passat 2017",
        description: "По регламенту подошёл срок замены. Хотел бы записаться на этой неделе.",
        isUrgent: false,
        photoCount: 1,
        createdAtTime: "16:40",
        createdAtDate: "вчера",
        status: "scheduled",
        confirmedDateTime: "завтра 10:00",
    },
    {
        id: "ORD-7836",
        customerName: "Ержан Т.",
        activityName: "Развал-схождение",
        carBrand: "Kia Sportage 2018",
        description: "После замены передних рычагов нужно сделать развал.",
        isUrgent: false,
        photoCount: 0,
        createdAtTime: "13:20",
        createdAtDate: "3 дня назад",
        status: "completed",
    },
    {
        id: "ORD-7833",
        customerName: "Нурбек А.",
        activityName: "Диагностика подвески",
        carBrand: "Lexus RX 2016",
        description: "При проезде неровностей слышен стук слева спереди.",
        isUrgent: false,
        photoCount: 2,
        createdAtTime: "10:00",
        createdAtDate: "5 дней назад",
        status: "cancelled",
        cancelReason: "Клиент нашёл другого специалиста",
    },
];

/* ====================================================================== */
/* Phone frame                                                            */
/* ====================================================================== */

function PhoneFrame({ children, height = 720 }: { children: React.ReactNode; height?: number }) {
    return (
        <Box
            sx={{
                width: 380,
                background: "#0f172a",
                borderRadius: 6,
                p: 1.25,
                boxShadow: "0 30px 60px -25px rgba(15,23,42,0.45)",
                mx: "auto",
            }}
        >
            <Box
                sx={{
                    background: palette.background,
                    borderRadius: 4.5,
                    overflow: "hidden",
                    height,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                }}
            >
                <Box
                    sx={{
                        height: 28,
                        background: palette.background,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 2.5,
                        flexShrink: 0,
                    }}
                >
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: palette.textPrimary }}>9:41</Typography>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 6,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 80,
                            height: 18,
                            background: "#0f172a",
                            borderRadius: 99,
                        }}
                    />
                    <Box sx={{ display: "flex", gap: 0.4, color: palette.textPrimary }}>
                        <Box sx={{ width: 14, height: 8, borderRadius: 0.5, background: palette.textPrimary, opacity: 0.85 }} />
                        <Box sx={{ width: 12, height: 8, borderRadius: 0.5, background: palette.textPrimary, opacity: 0.85 }} />
                        <Box sx={{ width: 18, height: 8, borderRadius: 0.5, background: palette.textPrimary, opacity: 0.85 }} />
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</Box>
            </Box>
        </Box>
    );
}

function MobileTopBar({ title, count }: { title: string; count?: number }) {
    return (
        <Box
            sx={{
                px: 2,
                py: 1.5,
                background: palette.surface,
                borderBottom: `1px solid ${palette.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        background: palette.surfaceMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: palette.textPrimary,
                    }}
                >
                    <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: palette.textPrimary, lineHeight: 1.1 }}>
                        {title}
                    </Typography>
                    {count !== undefined && (
                        <Typography sx={{ fontSize: 11, color: palette.textSecondary, fontWeight: 500 }}>
                            {count} {count === 1 ? "заявка" : "заявок"}
                        </Typography>
                    )}
                </Box>
            </Box>
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    background: palette.surfaceMuted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: palette.textPrimary,
                    position: "relative",
                }}
            >
                <NotificationsRoundedIcon sx={{ fontSize: 18 }} />
                <Box
                    sx={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: palette.urgent,
                        border: "2px solid #fff",
                    }}
                />
            </Box>
        </Box>
    );
}

function MobileBottomNav({ active = "applications" }: { active?: string }) {
    const items = [
        { id: "home", label: "Главная", icon: "🏠" },
        { id: "applications", label: "Заявки", icon: "📋" },
        { id: "chats", label: "Чаты", icon: "💬" },
        { id: "profile", label: "Профиль", icon: "👤" },
    ];
    return (
        <Box sx={{ background: palette.surface, borderTop: `1px solid ${palette.border}`, display: "flex", py: 0.75, flexShrink: 0 }}>
            {items.map((it) => {
                const isActive = it.id === active;
                return (
                    <Box
                        key={it.id}
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.2,
                            py: 0.4,
                            color: isActive ? palette.primary : palette.textSecondary,
                        }}
                    >
                        <Typography sx={{ fontSize: 16 }}>{it.icon}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{it.label}</Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

/* ====================================================================== */
/* Building blocks                                                        */
/* ====================================================================== */

function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
    const meta = STATUS_META[status];
    const isSm = size === "sm";
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: isSm ? 0.6 : 0.85,
                py: 0.25,
                borderRadius: 99,
                background: meta.soft,
                color: meta.color,
                flexShrink: 0,
            }}
        >
            <Box sx={{ "& svg": { fontSize: isSm ? 11 : 13 } }}>{meta.icon}</Box>
            <Typography sx={{ fontSize: isSm ? 9.5 : 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                {meta.label.toUpperCase()}
            </Typography>
        </Box>
    );
}

function FieldRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box
                sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 1,
                    background: palette.surfaceMuted,
                    color: palette.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.1,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 9.5,
                        color: palette.textSecondary,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    component="div"
                    sx={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: palette.textPrimary,
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                    }}
                >
                    {value}
                </Typography>
            </Box>
        </Box>
    );
}

function SmallActionButton({
    icon,
    label,
    tone = "neutral",
}: {
    icon: React.ReactNode;
    label: string;
    tone?: "primary" | "success" | "danger" | "neutral";
}) {
    const styles = {
        neutral: { color: palette.textPrimary, bg: "#fff", border: palette.border },
        primary: { color: "#fff", bg: palette.primary, border: palette.primary },
        success: { color: "#fff", bg: palette.success, border: palette.success },
        danger: { color: palette.urgent, bg: "#fff", border: "#fecaca" },
    }[tone];
    return (
        <Box
            sx={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.4,
                py: 0.65,
                borderRadius: 1.25,
                border: `1px solid ${styles.border}`,
                background: styles.bg,
                color: styles.color,
                fontSize: 11.5,
                fontWeight: 700,
            }}
        >
            {icon}
            {label}
        </Box>
    );
}

function KPITile({
    status,
    count,
    active = false,
    onClick,
}: {
    status: Status;
    count: number;
    active?: boolean;
    onClick?: () => void;
}) {
    const meta = STATUS_META[status];
    return (
        <Box
            onClick={onClick}
            sx={{
                background: active ? meta.color : palette.surface,
                border: `1px solid ${active ? meta.color : palette.border}`,
                color: active ? "#fff" : palette.textPrimary,
                borderRadius: 2,
                px: 1,
                py: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.3,
                cursor: "pointer",
                transition: "all 0.15s",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                    sx={{
                        width: 22,
                        height: 22,
                        borderRadius: 1,
                        background: active ? "rgba(255,255,255,0.2)" : meta.soft,
                        color: active ? "#fff" : meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Box sx={{ "& svg": { fontSize: 13 } }}>{meta.icon}</Box>
                </Box>
                <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{count}</Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    opacity: active ? 0.95 : 0.85,
                    color: active ? "#fff" : palette.textSecondary,
                }}
            >
                {meta.label}
            </Typography>
        </Box>
    );
}

function MobileSearch() {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                height: 36,
                borderRadius: 2,
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                color: palette.textSecondary,
            }}
        >
            <SearchRoundedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 12, color: palette.textSecondary, flex: 1 }}>
                Поиск по клиенту, авто…
            </Typography>
            <TuneRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
    );
}

/* ====================================================================== */
/* Expandable order item — collapsed = compact row, expanded = full card  */
/* ====================================================================== */

type ExpandableProps = {
    order: DemoOrder;
    expanded: boolean;
    onToggle: () => void;
    highlight?: boolean;
};

function ExpandableOrder({ order, expanded, onToggle, highlight }: ExpandableProps) {
    return (
        <Box
            sx={{
                background: palette.surface,
                border: `1px solid ${expanded || highlight ? palette.primary : palette.border}`,
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: expanded ? "0 10px 24px -16px rgba(59,130,246,0.45)" : "0 1px 2px rgba(15,23,42,0.04)",
                transition: "all 0.2s ease",
            }}
        >
            {/* Compact row — visible always */}
            <Box
                onClick={onToggle}
                sx={{
                    px: 1.5,
                    py: 1.25,
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    "&:hover": { background: "#fafbfc" },
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        background: order.isUrgent ? palette.urgentSoft : palette.primarySoft,
                        color: order.isUrgent ? palette.urgent : palette.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <BuildRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }}>
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: palette.textPrimary,
                                lineHeight: 1.25,
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                flex: 1,
                            }}
                        >
                            {order.activityName}
                        </Typography>
                        {order.isUrgent && (
                            <LocalFireDepartmentRoundedIcon sx={{ fontSize: 13, color: palette.urgent, flexShrink: 0 }} />
                        )}
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 11.5,
                            color: palette.textSecondary,
                            fontWeight: 500,
                            lineHeight: 1.3,
                            mb: 0.5,
                        }}
                    >
                        {order.carBrand} · {order.customerName}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <StatusBadge status={order.status} size="sm" />
                        {order.photoCount > 0 && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.2, color: palette.textSecondary }}>
                                <CameraAltRoundedIcon sx={{ fontSize: 11 }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 600 }}>{order.photoCount}</Typography>
                            </Box>
                        )}
                        <Typography sx={{ ml: "auto", fontSize: 10.5, color: palette.textSecondary, fontWeight: 500 }}>
                            {order.createdAtTime}
                        </Typography>
                    </Box>
                </Box>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: expanded ? palette.primary : palette.surfaceMuted,
                        color: expanded ? "#fff" : palette.textSecondary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        alignSelf: "center",
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
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ background: palette.surfaceMuted, borderTop: `1px solid ${palette.border}` }}>
                    {/* Document header */}
                    <Box
                        sx={{
                            px: 1.5,
                            py: 1,
                            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                            borderBottom: `1px solid ${palette.primaryBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 0.75,
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.85, minWidth: 0 }}>
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 1.25,
                                    background: palette.primary,
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <DescriptionRoundedIcon sx={{ fontSize: 14 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    sx={{ fontSize: 12.5, fontWeight: 700, color: palette.textPrimary, lineHeight: 1.1 }}
                                >
                                    Заявка №{order.id}
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: "#5775a8", fontWeight: 500 }}>
                                    {order.createdAtDate}, {order.createdAtTime}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Body */}
                    <Box sx={{ px: 1.5, py: 1.25, background: palette.surface }}>
                        <Stack spacing={0.7}>
                            <FieldRow icon={<BuildRoundedIcon sx={{ fontSize: 14 }} />} label="Услуга" value={order.activityName} />
                            <FieldRow
                                icon={<DirectionsCarRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Автомобиль"
                                value={order.carBrand}
                            />
                            <FieldRow icon={<PersonRoundedIcon sx={{ fontSize: 14 }} />} label="Клиент" value={order.customerName} />
                            {order.confirmedDateTime && (
                                <FieldRow
                                    icon={<EventAvailableRoundedIcon sx={{ fontSize: 14 }} />}
                                    label="Запланировано"
                                    value={order.confirmedDateTime}
                                />
                            )}
                        </Stack>

                        <Divider sx={{ my: 1, borderColor: palette.border, borderStyle: "dashed" }} />

                        <Typography
                            sx={{
                                fontSize: 9.5,
                                color: palette.textSecondary,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                mb: 0.4,
                            }}
                        >
                            Описание проблемы
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: palette.textPrimary, lineHeight: 1.45 }}>
                            {order.description}
                        </Typography>

                        {order.photoCount > 0 && (
                            <Box
                                sx={{
                                    mt: 0.85,
                                    px: 0.85,
                                    py: 0.5,
                                    borderRadius: 1.25,
                                    background: palette.surfaceMuted,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                }}
                            >
                                <CameraAltRoundedIcon sx={{ fontSize: 12, color: palette.textSecondary }} />
                                <Typography sx={{ fontSize: 11, color: palette.textSecondary, fontWeight: 500 }}>
                                    Прикреплено фото: {order.photoCount}
                                </Typography>
                            </Box>
                        )}

                        {order.cancelReason && (
                            <Box
                                sx={{
                                    mt: 0.85,
                                    px: 1,
                                    py: 0.6,
                                    borderRadius: 1.25,
                                    background: palette.urgentSoft,
                                    border: `1px solid ${palette.urgent}33`,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 9.5,
                                        color: palette.urgent,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.4,
                                        mb: 0.2,
                                    }}
                                >
                                    Причина отмены
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: palette.textPrimary }}>
                                    {order.cancelReason}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Footer actions */}
                    <Box
                        sx={{
                            px: 1,
                            py: 0.85,
                            borderTop: `1px solid ${palette.border}`,
                            background: palette.surfaceMuted,
                            display: "flex",
                            gap: 0.5,
                        }}
                    >
                        <SmallActionButton icon={<ChatBubbleRoundedIcon sx={{ fontSize: 13 }} />} label="Чат" />
                        {order.status === "pending" && (
                            <SmallActionButton tone="primary" icon={<CheckRoundedIcon sx={{ fontSize: 13 }} />} label="Принять" />
                        )}
                        {order.status === "scheduled" && (
                            <SmallActionButton tone="success" icon={<TaskAltRoundedIcon sx={{ fontSize: 13 }} />} label="Готово" />
                        )}
                        {(order.status === "pending" || order.status === "scheduled") && (
                            <SmallActionButton tone="danger" icon={<CloseRoundedIcon sx={{ fontSize: 13 }} />} label="Отмена" />
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

/* ====================================================================== */
/* Mobile screen — interactive accordion list                             */
/* ====================================================================== */

function MobileApplicationsScreen({
    initialExpandedId,
    initialFilter = "all",
    interactive = true,
    pulse,
}: {
    initialExpandedId?: string | null;
    initialFilter?: Status | "all";
    interactive?: boolean;
    pulse?: { id: string };
}) {
    const [expanded, setExpanded] = useState<string | null>(initialExpandedId ?? null);
    const [filter, setFilter] = useState<Status | "all">(initialFilter);
    const counts: Record<Status, number> = { pending: 2, scheduled: 2, completed: 1, cancelled: 1 };
    const filtered = filter === "all" ? ORDERS : ORDERS.filter((o) => o.status === filter);

    const handleToggle = (id: string) => {
        if (!interactive) return;
        setExpanded((prev) => (prev === id ? null : id));
    };

    return (
        <PhoneFrame>
            <MobileTopBar title="Заявки" count={ORDERS.length} />

            <Box sx={{ flex: 1, overflowY: "auto", background: palette.background }}>
                <Box sx={{ p: 1.5 }}>
                    <MobileSearch />

                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0.85, mt: 1.25 }}>
                        {(["pending", "scheduled", "completed", "cancelled"] as Status[]).map((s) => (
                            <KPITile
                                key={s}
                                status={s}
                                count={counts[s]}
                                active={filter === s}
                                onClick={() => interactive && setFilter(filter === s ? "all" : s)}
                            />
                        ))}
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mt: 1.5,
                            mb: 1,
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
                            {filter === "all" ? "Все заявки" : STATUS_META[filter].label}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, color: palette.textSecondary }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>Сначала новые</Typography>
                            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 14 }} />
                        </Box>
                    </Box>

                    <Stack spacing={0.85}>
                        {filtered.map((o) => (
                            <Box key={o.id} sx={{ position: "relative" }}>
                                <ExpandableOrder
                                    order={o}
                                    expanded={expanded === o.id}
                                    onToggle={() => handleToggle(o.id)}
                                    highlight={pulse?.id === o.id}
                                />
                                {pulse?.id === o.id && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            right: 8,
                                            top: 18,
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            border: `2px solid ${palette.primary}`,
                                            opacity: 0.6,
                                            animation: "ringPulse 1.6s ease-out infinite",
                                            "@keyframes ringPulse": {
                                                "0%": { transform: "scale(0.8)", opacity: 0.6 },
                                                "100%": { transform: "scale(1.6)", opacity: 0 },
                                            },
                                            pointerEvents: "none",
                                        }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Box>

            <MobileBottomNav />
        </PhoneFrame>
    );
}

/* ====================================================================== */
/* Page                                                                   */
/* ====================================================================== */

function ScreenCaption({ badge, title, description }: { badge: string; title: string; description: string }) {
    return (
        <Box sx={{ textAlign: "center", maxWidth: 380, mx: "auto", mb: 2 }}>
            <Box
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.4,
                    borderRadius: 99,
                    background: palette.primary,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    mb: 1,
                }}
            >
                {badge}
            </Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: palette.textPrimary, mb: 0.4 }}>
                {title}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: palette.textSecondary, lineHeight: 1.5 }}>
                {description}
            </Typography>
        </Box>
    );
}

export function ApplicationsRedesignScreen() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "linear-gradient(180deg, #f8fafc 0%, #eef1f6 100%)",
                py: { xs: 3, md: 5 },
                px: { xs: 1.5, md: 4 },
            }}
        >
            <Box sx={{ maxWidth: 1280, mx: "auto" }}>
                <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.75,
                            background: "#dbeafe",
                            color: "#2563eb",
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 700,
                            mb: 1.5,
                        }}
                    >
                        <InboxRoundedIcon sx={{ fontSize: 14 }} />
                        FINAL CONCEPT · ACCORDION
                    </Box>
                    <Typography
                        sx={{
                            fontSize: { xs: 26, md: 38 },
                            fontWeight: 800,
                            color: palette.textPrimary,
                            lineHeight: 1.15,
                            mb: 1,
                        }}
                    >
                        Узкий список + раскрытие в карточку
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: 13.5, md: 15 },
                            color: "#475569",
                            maxWidth: 720,
                            mx: "auto",
                            lineHeight: 1.55,
                        }}
                    >
                        KPI-сетка сверху, лента из узких строк (как в первом варианте). Тап
                        по шеврону — строка плавно раскрывается прямо в полную карточку-документ
                        с действиями. Закрытие — повторный тап.
                    </Typography>
                </Box>

                {/* States row */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" },
                        gap: { xs: 5, lg: 4 },
                        mb: { xs: 5, md: 7 },
                        alignItems: "start",
                    }}
                >
                    <Box>
                        <ScreenCaption
                            badge="СОСТОЯНИЕ 1"
                            title="Всё свернуто"
                            description="Помещается 5+ заявок на экран. Узнаваемые status-pill, иконка огня для срочных, кнопка-шеврон справа."
                        />
                        <MobileApplicationsScreen interactive={false} initialExpandedId={null} pulse={{ id: "ORD-7842" }} />
                    </Box>

                    <Box>
                        <ScreenCaption
                            badge="СОСТОЯНИЕ 2"
                            title="Раскрыта одна заявка"
                            description="Первая заявка раскрылась в карточку-документ. Шеврон стал круглой синей кнопкой со стрелкой ↑. Кнопки действий — в footer."
                        />
                        <MobileApplicationsScreen interactive={false} initialExpandedId="ORD-7842" />
                    </Box>

                    <Box>
                        <ScreenCaption
                            badge="СОСТОЯНИЕ 3"
                            title="Фильтр по статусу"
                            description="Тап по KPI-плитке «Готово» — лента отфильтровалась. Плитка стала зелёной. Тап повторно — снова все заявки."
                        />
                        <MobileApplicationsScreen interactive={false} initialFilter="completed" initialExpandedId="ORD-7836" />
                    </Box>
                </Box>

                {/* Interactive playground */}
                <Box
                    sx={{
                        background: palette.surface,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 3,
                        p: { xs: 2, md: 4 },
                        mb: { xs: 4, md: 5 },
                        boxShadow: "0 6px 18px -12px rgba(15,23,42,0.18)",
                    }}
                >
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" },
                            gap: { xs: 3, md: 4 },
                            alignItems: "center",
                        }}
                    >
                        <Box>
                            <Box
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.4,
                                    borderRadius: 99,
                                    background: palette.successSoft,
                                    color: palette.success,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    mb: 1.5,
                                }}
                            >
                                <TouchAppRoundedIcon sx={{ fontSize: 13 }} />
                                ИНТЕРАКТИВНО
                            </Box>
                            <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, color: palette.textPrimary, mb: 1 }}>
                                Попробуй прямо здесь
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: palette.textSecondary, lineHeight: 1.55, mb: 2 }}>
                                Это рабочий прототип, не картинка. Тапай по карточкам — раскрывай
                                и сворачивай. Тапай по KPI — фильтруй ленту по статусу.
                            </Typography>

                            <Stack spacing={1.25}>
                                {[
                                    {
                                        title: "Один аккордеон одновременно",
                                        body: "Открытие новой заявки автоматически закрывает предыдущую — экран не превращается в портянку.",
                                    },
                                    {
                                        title: "Анимация Material Collapse",
                                        body: "Плавное раскрытие/сжатие, шеврон поворачивается на 180°, граница карточки подсвечивается синим.",
                                    },
                                    {
                                        title: "Одна модель данных с чатом",
                                        body: "Раскрытая карточка — тот же макет, что превью заявки в чате (синий header-градиент, поля-документ).",
                                    },
                                    {
                                        title: "Действия — на месте",
                                        body: "«Чат / Принять / Готово / Отмена» — в footer карточки. Не нужно открывать отдельную страницу.",
                                    },
                                ].map((p) => (
                                    <Box key={p.title} sx={{ display: "flex", gap: 1.25 }}>
                                        <Box
                                            sx={{
                                                width: 4,
                                                background: palette.primary,
                                                borderRadius: 99,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Box>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: palette.textPrimary, mb: 0.2 }}>
                                                {p.title}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12.5, color: palette.textSecondary, lineHeight: 1.5 }}>
                                                {p.body}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

                        <Box>
                            <MobileApplicationsScreen interactive />
                        </Box>
                    </Box>
                </Box>

                {/* Anatomy */}
                <Box
                    sx={{
                        background: palette.surface,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 3,
                        p: { xs: 2, md: 3 },
                        mb: { xs: 3, md: 4 },
                        boxShadow: "0 6px 18px -12px rgba(15,23,42,0.18)",
                    }}
                >
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: palette.textPrimary, mb: 0.6 }}>
                        Анатомия раскрытия
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: palette.textSecondary, mb: 2, lineHeight: 1.5 }}>
                        Свёрнутое и раскрытое состояния делят одну рамку — карточка просто «вырастает» вниз.
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
                        {[
                            {
                                title: "1. Compact row (всегда)",
                                desc: "Иконка-услуга, название, авто+клиент, status pill + индикатор фото, время и круглый шеврон. 64dp tap-target.",
                            },
                            {
                                title: "2. Expanded body",
                                desc: "Голубая шапка с номером заявки + время. Поля-документ (Услуга/Авто/Клиент/Запланировано), описание, плашка фото.",
                            },
                            {
                                title: "3. Footer actions",
                                desc: "Контекстный набор: «Чат» всегда, «Принять» для pending, «Готово» для scheduled, «Отмена» для активных.",
                            },
                        ].map((zone) => (
                            <Box
                                key={zone.title}
                                sx={{
                                    background: palette.surfaceMuted,
                                    border: `1px solid ${palette.border}`,
                                    borderRadius: 2,
                                    p: 1.75,
                                }}
                            >
                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: palette.textPrimary, mb: 0.4 }}>
                                    {zone.title}
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: palette.textSecondary, lineHeight: 1.5 }}>
                                    {zone.desc}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Box
                    sx={{
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        border: "1px solid #c7dafb",
                        borderRadius: 3,
                        p: 2.5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: palette.textPrimary, mb: 0.6 }}>
                        Если этот вариант ок — закрепляем
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#3a5478", lineHeight: 1.55, maxWidth: 680, mx: "auto" }}>
                        Подтверди — переведу <code>Applications.tsx</code> на этот макет:
                        KPI-плитки вместо chip-счётчиков, pill-фильтр через KPI-плитки,
                        accordion-список с теми же статусами. Логика подтверждения, отмены,
                        перехода в чат и подсветки <code>orderId</code> из чата сохранится.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
