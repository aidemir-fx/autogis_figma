import { Box, Typography } from "@mui/material";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { NormalizedOrderStatus } from "@modules/chats/api";
import { palette, STATUS_META } from "./styles";

const STATUS_ICONS: Record<NormalizedOrderStatus, React.ReactNode> = {
    pending: <HourglassTopRoundedIcon sx={{ fontSize: 14 }} />,
    scheduled: <EventAvailableRoundedIcon sx={{ fontSize: 14 }} />,
    completed: <TaskAltRoundedIcon sx={{ fontSize: 14 }} />,
    cancelled: <BlockRoundedIcon sx={{ fontSize: 14 }} />,
};

type KPITileProps = {
    status: NormalizedOrderStatus;
    count: number;
    active: boolean;
    onClick: () => void;
};

function KPITile({ status, count, active, onClick }: KPITileProps) {
    const meta = STATUS_META[status];
    return (
        <Box
            onClick={onClick}
            sx={{
                background: active ? meta.color : palette.surface,
                border: `1px solid ${active ? meta.color : palette.border}`,
                color: active ? "#fff" : palette.textPrimary,
                borderRadius: 2,
                px: 1.25,
                py: 1.1,
                display: "flex",
                flexDirection: "column",
                gap: 0.4,
                cursor: "pointer",
                transition: "all 0.15s",
                userSelect: "none",
                "&:hover": active ? {} : { borderColor: "#cbd5e1", background: "#fafbfc" },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Box
                    sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        background: active ? "rgba(255,255,255,0.2)" : meta.soft,
                        color: active ? "#fff" : meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {STATUS_ICONS[status]}
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                    {count}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 11.5,
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

type KPIGridProps = {
    counts: Record<NormalizedOrderStatus, number>;
    activeFilter: NormalizedOrderStatus | "all";
    onSelect: (status: NormalizedOrderStatus | "all") => void;
};

const ORDER: NormalizedOrderStatus[] = ["pending", "scheduled", "completed", "cancelled"];

export function KPIGrid({ counts, activeFilter, onSelect }: KPIGridProps) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                gap: 1,
            }}
        >
            {ORDER.map((status) => (
                <KPITile
                    key={status}
                    status={status}
                    count={counts[status]}
                    active={activeFilter === status}
                    onClick={() => onSelect(activeFilter === status ? "all" : status)}
                />
            ))}
        </Box>
    );
}

export { STATUS_ICONS };
