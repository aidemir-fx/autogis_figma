import { useEffect, useRef } from "react";
import { Box, Collapse, Divider, Stack, Typography } from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { ChatOrder } from "@modules/chats/api";
import { ORDER_TIME_PREFERENCE_LABELS } from "@modules/orders/api";
import { palette } from "./styles";
import { StatusBadge, UrgentBadge } from "./StatusBadge";
import { OrderPhotos } from "./OrderPhotos";
import { OrderRatingBadge } from "@modules/reviews";

function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    if (sameDay(date, today)) return "сегодня";
    if (sameDay(date, yesterday)) return "вчера";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatFullDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function shortId(id: string): string {
    return id.length <= 6 ? id.toUpperCase() : id.slice(0, 6).toUpperCase();
}

function FieldRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
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
                        fontSize: 13,
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

function ActionButton({
    icon,
    label,
    tone = "neutral",
    onClick,
    disabled,
}: {
    icon: React.ReactNode;
    label: string;
    tone?: "primary" | "success" | "danger" | "neutral";
    onClick?: () => void;
    disabled?: boolean;
}) {
    const styles = {
        neutral: { color: palette.textPrimary, bg: "#fff", border: palette.border, hover: "#f8fafc" },
        primary: { color: "#fff", bg: palette.primary, border: palette.primary, hover: palette.primaryDark },
        success: { color: "#fff", bg: palette.success, border: palette.success, hover: "#15803d" },
        danger: { color: palette.urgent, bg: "#fff", border: "#fecaca", hover: palette.urgentSoft },
    }[tone];
    return (
        <Box
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick?.();
            }}
            sx={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.4,
                py: 0.75,
                borderRadius: 1.25,
                border: `1px solid ${styles.border}`,
                background: styles.bg,
                color: styles.color,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                userSelect: "none",
                transition: "background 0.15s",
                "&:hover": disabled ? {} : { background: styles.hover },
            }}
        >
            {icon}
            {label}
        </Box>
    );
}

type OrderAccordionItemProps = {
    order: ChatOrder;
    expanded: boolean;
    highlight?: boolean;
    onToggle: () => void;
    onChat: () => void;
    onConfirm: () => void;
    onComplete: () => void;
    onCancel: () => void;
    actionDisabled?: boolean;
};

export function OrderAccordionItem({
    order,
    expanded,
    highlight,
    onToggle,
    onChat,
    onConfirm,
    onComplete,
    onCancel,
    actionDisabled,
}: OrderAccordionItemProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const isUrgent = order.timePreference === "urgent";
    const activityName = order.activityType?.displayName || order.activityType?.name || "Заявка";
    const customerName = order.name || order.customer?.name || order.customer?.phone || "—";
    const photoCount = order.photoAssetIds?.length ?? 0;
    const canConfirm = order.status === "pending";
    const canCancel = order.status === "pending" || order.status === "scheduled";
    const canComplete = order.status === "scheduled";
    const timePreferenceLabel = order.timePreference
        ? ORDER_TIME_PREFERENCE_LABELS[order.timePreference]
        : null;

    useEffect(() => {
        if (highlight && ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [highlight]);

    return (
        <Box
            ref={ref}
            sx={{
                background: palette.surface,
                border: `1px solid ${expanded || highlight ? palette.primary : palette.border}`,
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: expanded
                    ? "0 10px 24px -16px rgba(59,130,246,0.45)"
                    : "0 1px 2px rgba(15,23,42,0.04)",
                transition: "all 0.2s ease",
            }}
        >
            {/* Compact row */}
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
                        background: isUrgent ? palette.urgentSoft : palette.primarySoft,
                        color: isUrgent ? palette.urgent : palette.primary,
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
                                fontSize: 13.5,
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
                            {customerName}
                        </Typography>
                        {isUrgent && (
                            <LocalFireDepartmentRoundedIcon
                                sx={{ fontSize: 14, color: palette.urgent, flexShrink: 0 }}
                            />
                        )}
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 11.5,
                            color: palette.textSecondary,
                            fontWeight: 500,
                            lineHeight: 1.3,
                            mb: 0.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {order.description || "Описание проблемы не указано"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <Typography
                            sx={{
                                fontSize: 10.5,
                                color: palette.textSecondary,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {order.carBrand || "Авто не указано"}
                        </Typography>
                        <StatusBadge status={order.status} size="sm" />
                        {photoCount > 0 && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.2,
                                    color: palette.textSecondary,
                                }}
                            >
                                <CameraAltRoundedIcon sx={{ fontSize: 11 }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 600 }}>
                                    {photoCount}
                                </Typography>
                            </Box>
                        )}
                        {order.status === "completed" && (
                            <OrderRatingBadge orderId={order.id} />
                        )}
                        <Typography
                            sx={{
                                ml: "auto",
                                fontSize: 10.5,
                                color: palette.textSecondary,
                                fontWeight: 500,
                            }}
                        >
                            {formatDateLabel(
                                order.status === "completed"
                                    ? order.updatedAt || order.createdAt
                                    : order.createdAt,
                            )} · {formatTime(
                                order.status === "completed"
                                    ? order.updatedAt || order.createdAt
                                    : order.createdAt,
                            )}
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

            <Collapse in={expanded} timeout={220}>
                <Box sx={{ borderTop: `1px solid ${palette.border}` }}>
                    {/* Document header */}
                    <Box
                        sx={{
                            px: 1.75,
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
                                    width: 26,
                                    height: 26,
                                    borderRadius: 1.25,
                                    background: palette.primary,
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <DescriptionRoundedIcon sx={{ fontSize: 15 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    sx={{
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: palette.textPrimary,
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Заявка №{shortId(order.id)}
                                </Typography>
                                <Typography sx={{ fontSize: 10.5, color: "#5775a8", fontWeight: 500 }}>
                                    Создана {formatFullDateTime(order.createdAt)}
                                </Typography>
                            </Box>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                            {isUrgent && <UrgentBadge size="sm" />}
                        </Stack>
                    </Box>

                    {/* Body */}
                    <Box sx={{ px: 1.75, py: 1.5, background: palette.surface }}>
                        <Stack spacing={0.85}>
                            <FieldRow
                                icon={<BuildRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Услуга"
                                value={activityName}
                            />
                            <FieldRow
                                icon={<DirectionsCarRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Автомобиль"
                                value={order.carBrand || "—"}
                            />
                            <FieldRow
                                icon={<PersonRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Клиент"
                                value={
                                    <Box>
                                        {customerName}
                                        {order.phone && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    color: palette.textSecondary,
                                                    fontWeight: 500,
                                                    ml: 0.5,
                                                }}
                                            >
                                                <PhoneRoundedIcon
                                                    sx={{
                                                        fontSize: 11,
                                                        verticalAlign: "middle",
                                                        mr: 0.3,
                                                    }}
                                                />
                                                {order.phone}
                                            </Box>
                                        )}
                                    </Box>
                                }
                            />
                            {timePreferenceLabel && (
                                <FieldRow
                                    icon={<ScheduleRoundedIcon sx={{ fontSize: 14 }} />}
                                    label="Сроки"
                                    value={
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {timePreferenceLabel}
                                            {isUrgent && (
                                                <LocalFireDepartmentRoundedIcon
                                                    sx={{ fontSize: 14, color: palette.urgent }}
                                                />
                                            )}
                                        </Box>
                                    }
                                />
                            )}
                            {order.confirmedDateTime && (
                                <FieldRow
                                    icon={<EventAvailableRoundedIcon sx={{ fontSize: 14 }} />}
                                    label="Запланировано"
                                    value={formatFullDateTime(order.confirmedDateTime)}
                                />
                            )}
                        </Stack>

                        {order.description && (
                            <>
                                <Divider
                                    sx={{
                                        my: 1.25,
                                        borderColor: palette.border,
                                        borderStyle: "dashed",
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: 9.5,
                                        color: palette.textSecondary,
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.4,
                                        mb: 0.5,
                                    }}
                                >
                                    Описание проблемы
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: palette.textPrimary,
                                        lineHeight: 1.5,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {order.description}
                                </Typography>
                            </>
                        )}

                        {order.photoAssetIds && order.photoAssetIds.length > 0 && (
                            <OrderPhotos assetIds={order.photoAssetIds} />
                        )}

                        {order.cancelReason && (
                            <Box
                                sx={{
                                    mt: 1.25,
                                    px: 1.25,
                                    py: 0.85,
                                    borderRadius: 1.5,
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
                                        mb: 0.3,
                                    }}
                                >
                                    Причина отмены
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 12.5,
                                        color: palette.textPrimary,
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {order.cancelReason}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Footer actions */}
                    <Box
                        sx={{
                            px: 1.25,
                            py: 1,
                            borderTop: `1px solid ${palette.border}`,
                            background: palette.surfaceMuted,
                            display: "flex",
                            gap: 0.6,
                        }}
                    >
                        <ActionButton
                            icon={<ChatBubbleRoundedIcon sx={{ fontSize: 14 }} />}
                            label="Чат"
                            onClick={onChat}
                        />
                        {canConfirm && (
                            <ActionButton
                                tone="primary"
                                icon={<CheckRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Принять"
                                onClick={onConfirm}
                                disabled={actionDisabled}
                            />
                        )}
                        {canComplete && (
                            <ActionButton
                                tone="success"
                                icon={<TaskAltRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Готово"
                                onClick={onComplete}
                                disabled={actionDisabled}
                            />
                        )}
                        {canCancel && (
                            <ActionButton
                                tone="danger"
                                icon={<CloseRoundedIcon sx={{ fontSize: 14 }} />}
                                label="Отмена"
                                onClick={onCancel}
                                disabled={actionDisabled}
                            />
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}
