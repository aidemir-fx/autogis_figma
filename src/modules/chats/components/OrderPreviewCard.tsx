import { Box, Stack, Typography, Divider } from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { ChatOrder } from "@modules/chats/api";
import { MediaAssetGallery } from "@modules/media/components/MediaAssetGallery";

const accent = {
    primary: "#3b82f6",
    urgent: "#ef4444",
    urgentSoft: "#fff1f1",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fb",
    border: "#e6e9f0",
    textPrimary: "#1c2233",
    textSecondary: "#6b7384",
};

function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function shortId(id: string): string {
    if (!id) return "";
    return id.length <= 6 ? id.toUpperCase() : id.slice(0, 6).toUpperCase();
}

type OrderPreviewCardProps = {
    order: ChatOrder;
    onOpen?: () => void;
};

export function OrderPreviewCard({ order, onOpen }: OrderPreviewCardProps) {
    const isUrgent = order.timePreference === "urgent";
    const activityName =
        order.activityType?.displayName || order.activityType?.name || "Заявка";
    const customerName = order.name || order.customer?.name || order.customer?.phone || "—";
    const photoCount = order.photoAssetIds?.length ?? 0;

    const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
        {
            icon: <BuildRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Услуга",
            value: activityName,
        },
        {
            icon: <DirectionsCarRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Автомобиль",
            value: order.carBrand || "—",
        },
        {
            icon: <PersonRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Клиент",
            value: customerName,
        },
    ];

    if (order.timePreference) {
        rows.push({
            icon: <ScheduleRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Сроки",
            value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isUrgent ? "Срочно" : "Не срочно"}
                    {isUrgent && (
                        <LocalFireDepartmentRoundedIcon
                            sx={{ fontSize: 14, color: accent.urgent }}
                        />
                    )}
                </Box>
            ),
        });
    }

    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "94%",
                    maxWidth: 360,
                    background: accent.surface,
                    borderRadius: "16px 16px 16px 6px",
                    border: `1px solid ${accent.border}`,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px -16px rgba(30,40,70,0.18)",
                }}
            >
                <Box
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        borderBottom: "1px solid #c7dafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.85, minWidth: 0 }}>
                        <Box
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: 1.5,
                                background: accent.primary,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                flexShrink: 0,
                            }}
                        >
                            <DescriptionRoundedIcon sx={{ fontSize: 14 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                sx={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: accent.textPrimary,
                                    lineHeight: 1.1,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                Заявка №{shortId(order.id)}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 10.5,
                                    color: "#5775a8",
                                    fontWeight: 500,
                                }}
                            >
                                Создана в {formatTime(order.createdAt)}
                            </Typography>
                        </Box>
                    </Box>
                    {isUrgent ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.4,
                                px: 0.85,
                                py: 0.3,
                                borderRadius: 99,
                                background: accent.urgentSoft,
                                color: accent.urgent,
                                flexShrink: 0,
                            }}
                        >
                            <LocalFireDepartmentRoundedIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                                СРОЧНО
                            </Typography>
                        </Box>
                    ) : (
                        <VerifiedRoundedIcon
                            sx={{ fontSize: 18, color: accent.primary, flexShrink: 0 }}
                        />
                    )}
                </Box>

                <Box sx={{ px: 1.75, py: 1.25 }}>
                    <Stack spacing={0.85}>
                        {rows.map((row) => (
                            <Box
                                key={row.label}
                                sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}
                            >
                                <Box
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 1,
                                        background: accent.surfaceMuted,
                                        color: accent.textSecondary,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        mt: 0.1,
                                    }}
                                >
                                    {row.icon}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 10.5,
                                            color: accent.textSecondary,
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.4,
                                        }}
                                    >
                                        {row.label}
                                    </Typography>
                                    <Typography
                                        component="div"
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: accent.textPrimary,
                                            lineHeight: 1.3,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {row.value}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>

                    {order.description && (
                        <>
                            <Divider
                                sx={{ my: 1, borderColor: accent.border, borderStyle: "dashed" }}
                            />
                            <Typography
                                sx={{
                                    fontSize: 10.5,
                                    color: accent.textSecondary,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                    mb: 0.4,
                                }}
                            >
                                Описание проблемы
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 12.5,
                                    color: accent.textPrimary,
                                    lineHeight: 1.45,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {order.description}
                            </Typography>
                        </>
                    )}

                    {photoCount > 0 && (
                        <>
                            <Box
                                sx={{
                                    mt: 1,
                                    px: 1,
                                    py: 0.6,
                                    borderRadius: 1.5,
                                    background: accent.surfaceMuted,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                }}
                            >
                                <CameraAltRoundedIcon sx={{ fontSize: 14, color: accent.textSecondary }} />
                                <Typography
                                    sx={{ fontSize: 11.5, color: accent.textSecondary, fontWeight: 500 }}
                                >
                                    Прикреплено фото: {photoCount}
                                </Typography>
                            </Box>
                            <MediaAssetGallery assetIds={order.photoAssetIds ?? []} />
                        </>
                    )}
                </Box>

                <Box
                    onClick={onOpen}
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: accent.surfaceMuted,
                        borderTop: `1px solid ${accent.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: onOpen ? "pointer" : "default",
                        transition: "background 0.15s",
                        "&:hover": onOpen ? { background: "#eef2f8" } : undefined,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: accent.primary,
                            letterSpacing: 0.2,
                        }}
                    >
                        Открыть детали
                    </Typography>
                    <Box
                        sx={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: accent.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                        }}
                    >
                        <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
