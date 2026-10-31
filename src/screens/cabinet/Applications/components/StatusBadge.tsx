import { Box, Typography } from "@mui/material";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import { NormalizedOrderStatus } from "@modules/chats/api";
import { palette, STATUS_META } from "./styles";
import { STATUS_ICONS } from "./KPIGrid";

type StatusBadgeProps = {
    status: NormalizedOrderStatus;
    size?: "sm" | "md";
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
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
            <Box sx={{ "& svg": { fontSize: isSm ? 11 : 13 } }}>{STATUS_ICONS[status]}</Box>
            <Typography sx={{ fontSize: isSm ? 9.5 : 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                {meta.label.toUpperCase()}
            </Typography>
        </Box>
    );
}

export function UrgentBadge({ size = "sm" }: { size?: "sm" | "md" }) {
    const isSm = size === "sm";
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.3,
                px: isSm ? 0.55 : 0.85,
                py: 0.25,
                borderRadius: 99,
                background: palette.urgentSoft,
                color: palette.urgent,
                flexShrink: 0,
            }}
        >
            <LocalFireDepartmentRoundedIcon sx={{ fontSize: isSm ? 11 : 13 }} />
            <Typography sx={{ fontSize: isSm ? 9.5 : 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                СРОЧНО
            </Typography>
        </Box>
    );
}
