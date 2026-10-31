import { NormalizedOrderStatus } from "@modules/chats/api";

export const palette = {
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

export const STATUS_META: Record<
    NormalizedOrderStatus,
    { label: string; color: string; soft: string }
> = {
    pending: { label: "Ожидает", color: palette.primary, soft: palette.primarySoft },
    scheduled: { label: "В работе", color: palette.warning, soft: palette.warningSoft },
    completed: { label: "Готово", color: palette.success, soft: palette.successSoft },
    cancelled: { label: "Отмена", color: palette.neutral, soft: palette.neutralSoft },
};
