import { Box, Stack, Typography, Chip, Divider, Avatar, IconButton, Button } from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

type DemoOrder = {
    id: string;
    customerName: string;
    activityName: string;
    carBrand: string;
    description: string;
    isUrgent: boolean;
    phone: string;
    photoCount: number;
    price?: number;
    createdAt: string;
};

const demo: DemoOrder = {
    id: "ORD-7842",
    customerName: "Алишер К.",
    activityName: "Замена тормозных колодок",
    carBrand: "Toyota Camry 2019",
    description:
        "При торможении появился скрип на передней оси, особенно сильно проявляется на низкой скорости. Хотел бы посмотреть колодки и диски.",
    isUrgent: true,
    phone: "+7 707 123 45 67",
    photoCount: 3,
    price: 18000,
    createdAt: "14:32",
};

const accent = {
    primary: "#3b82f6",
    primaryDark: "#2563eb",
    urgent: "#ef4444",
    urgentSoft: "#fff1f1",
    success: "#16a34a",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fb",
    border: "#e6e9f0",
    textPrimary: "#1c2233",
    textSecondary: "#6b7384",
};

function ChatScaffold({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 420,
                background: "#eef1f6",
                borderRadius: 4,
                px: 1.5,
                pt: 2,
                pb: 1.5,
                mx: "auto",
                boxShadow: "0 18px 40px -22px rgba(30,40,70,0.25)",
                border: "1px solid #e6e9f0",
            }}
        >
            <Typography
                sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#7b8291",
                    textAlign: "center",
                    mb: 1.25,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                }}
            >
                {label}
            </Typography>

            <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Box
                        sx={{
                            maxWidth: "70%",
                            px: 1.75,
                            py: 1,
                            borderRadius: "16px 16px 16px 4px",
                            background: "#ffffff",
                            color: "#222738",
                            fontSize: 13.5,
                            boxShadow: "0 1px 2px rgba(30,40,70,0.05)",
                        }}
                    >
                        Привет! Создал заявку, посмотрите пожалуйста.
                    </Box>
                </Box>

                {children}

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Box
                        sx={{
                            maxWidth: "70%",
                            px: 1.75,
                            py: 1,
                            borderRadius: "16px 16px 4px 16px",
                            background: "linear-gradient(135deg, #4a7cff 0%, #3b82f6 100%)",
                            color: "#fff",
                            fontSize: 13.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            boxShadow: "0 6px 16px -6px rgba(59,130,246,0.4)",
                        }}
                    >
                        Принял, посмотрю и отвечу
                        <DoneAllIcon sx={{ fontSize: 14, color: "#fff", ml: 0.4 }} />
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}

/* ----------------- VARIANT 1: Compact Receipt ----------------- */
function VariantCompact({ order }: { order: DemoOrder }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "92%",
                    background: accent.surface,
                    borderRadius: "18px 18px 18px 6px",
                    border: `1px solid ${accent.border}`,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px -14px rgba(30,40,70,0.18)",
                }}
            >
                <Box
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: accent.surfaceMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: `1px solid ${accent.border}`,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <DescriptionRoundedIcon sx={{ fontSize: 16, color: accent.primary }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: accent.textPrimary }}>
                            Заявка №{order.id}
                        </Typography>
                    </Box>
                    {order.isUrgent && (
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
                            }}
                        >
                            <LocalFireDepartmentRoundedIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>СРОЧНО</Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ px: 1.75, py: 1.25 }}>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: accent.textPrimary, mb: 0.75 }}>
                        {order.activityName}
                    </Typography>

                    <Stack spacing={0.4}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <DirectionsCarRoundedIcon sx={{ fontSize: 14, color: accent.textSecondary }} />
                            <Typography sx={{ fontSize: 12.5, color: accent.textSecondary }}>
                                {order.carBrand}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <PersonRoundedIcon sx={{ fontSize: 14, color: accent.textSecondary }} />
                            <Typography sx={{ fontSize: 12.5, color: accent.textSecondary }}>
                                {order.customerName}
                            </Typography>
                        </Box>
                    </Stack>

                    {order.price && (
                        <Box
                            sx={{
                                mt: 1,
                                pt: 0.85,
                                borderTop: `1px dashed ${accent.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography sx={{ fontSize: 11.5, color: accent.textSecondary, fontWeight: 500 }}>
                                Бюджет клиента
                            </Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: accent.textPrimary }}>
                                {order.price.toLocaleString("ru-RU")} ₸
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box
                    sx={{
                        px: 1.75,
                        py: 0.85,
                        background: accent.surfaceMuted,
                        borderTop: `1px solid ${accent.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                    }}
                >
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: accent.primary }}>
                        Открыть детали
                    </Typography>
                    <ChevronRightRoundedIcon sx={{ fontSize: 18, color: accent.primary }} />
                </Box>
            </Box>
        </Box>
    );
}

/* ----------------- VARIANT 2: Hero with Photo ----------------- */
function VariantHero({ order }: { order: DemoOrder }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "94%",
                    background: accent.surface,
                    borderRadius: "20px 20px 20px 6px",
                    overflow: "hidden",
                    boxShadow: "0 12px 30px -16px rgba(30,40,70,0.25)",
                    border: `1px solid ${accent.border}`,
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        height: 130,
                        background:
                            "linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)",
                        display: "flex",
                        alignItems: "flex-end",
                        p: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 55%)",
                        }}
                    />
                    <DirectionsCarRoundedIcon
                        sx={{
                            position: "absolute",
                            right: -10,
                            top: 8,
                            fontSize: 140,
                            color: "rgba(255,255,255,0.08)",
                        }}
                    />

                    {order.isUrgent && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                px: 1,
                                py: 0.4,
                                borderRadius: 99,
                                background: accent.urgent,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.4,
                                boxShadow: "0 4px 12px -4px rgba(239,68,68,0.6)",
                            }}
                        >
                            <BoltRoundedIcon sx={{ fontSize: 13, color: "#fff" }} />
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>
                                СРОЧНЫЙ ВЫЗОВ
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ position: "relative", color: "#fff" }}>
                        <Typography sx={{ fontSize: 11, opacity: 0.7, fontWeight: 600, mb: 0.3, letterSpacing: 0.3 }}>
                            НОВАЯ ЗАЯВКА · #{order.id}
                        </Typography>
                        <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
                            {order.activityName}
                        </Typography>
                    </Box>

                    {order.photoCount > 0 && (
                        <Box
                            sx={{
                                position: "absolute",
                                right: 10,
                                bottom: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.4,
                                px: 0.85,
                                py: 0.35,
                                borderRadius: 99,
                                background: "rgba(0,0,0,0.45)",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <CameraAltRoundedIcon sx={{ fontSize: 13, color: "#fff" }} />
                            <Typography sx={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                                {order.photoCount} фото
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ px: 1.75, py: 1.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: accent.primary, fontSize: 13 }}>
                            {order.customerName.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: accent.textPrimary, lineHeight: 1.2 }}>
                                {order.customerName}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: accent.textSecondary }}>
                                {order.carBrand}
                            </Typography>
                        </Box>
                        {order.price && (
                            <Box sx={{ textAlign: "right" }}>
                                <Typography sx={{ fontSize: 10, color: accent.textSecondary, fontWeight: 500 }}>
                                    Бюджет
                                </Typography>
                                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: accent.textPrimary }}>
                                    {order.price.toLocaleString("ru-RU")} ₸
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 12.5,
                            color: accent.textSecondary,
                            lineHeight: 1.45,
                            mb: 1.25,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {order.description}
                    </Typography>

                    <Stack direction="row" spacing={0.75}>
                        <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            sx={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                py: 0.75,
                                borderRadius: 2,
                                boxShadow: "none",
                                background: accent.primary,
                                "&:hover": { background: accent.primaryDark, boxShadow: "none" },
                            }}
                        >
                            Открыть
                        </Button>
                        <IconButton
                            size="small"
                            sx={{
                                border: `1px solid ${accent.border}`,
                                borderRadius: 2,
                                color: accent.textSecondary,
                            }}
                        >
                            <PhoneRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}

/* ----------------- VARIANT 3: Document/Form ----------------- */
function VariantDocument({ order }: { order: DemoOrder }) {
    const rows: { icon: React.ReactNode; label: string; value: string }[] = [
        {
            icon: <BuildRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Услуга",
            value: order.activityName,
        },
        {
            icon: <DirectionsCarRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Автомобиль",
            value: order.carBrand,
        },
        {
            icon: <PersonRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Клиент",
            value: order.customerName,
        },
        {
            icon: <ScheduleRoundedIcon sx={{ fontSize: 14 }} />,
            label: "Сроки",
            value: order.isUrgent ? "Срочно" : "Не срочно",
        },
    ];

    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "94%",
                    background: accent.surface,
                    borderRadius: "16px 16px 16px 6px",
                    border: `1px solid ${accent.border}`,
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        borderBottom: `1px solid #c7dafb`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
                            }}
                        >
                            <DescriptionRoundedIcon sx={{ fontSize: 14 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: accent.textPrimary, lineHeight: 1.1 }}>
                                Заявка №{order.id}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: "#5775a8", fontWeight: 500 }}>
                                Создана в {order.createdAt}
                            </Typography>
                        </Box>
                    </Box>
                    <VerifiedRoundedIcon sx={{ fontSize: 18, color: accent.primary }} />
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
                                    }}
                                >
                                    {row.icon}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 10.5, color: accent.textSecondary, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>
                                        {row.label}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: accent.textPrimary,
                                            lineHeight: 1.3,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        {row.value}
                                        {row.label === "Сроки" && order.isUrgent && (
                                            <LocalFireDepartmentRoundedIcon sx={{ fontSize: 14, color: accent.urgent }} />
                                        )}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>

                    <Divider sx={{ my: 1, borderColor: accent.border, borderStyle: "dashed" }} />

                    <Typography sx={{ fontSize: 10.5, color: accent.textSecondary, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.4 }}>
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

                    {order.photoCount > 0 && (
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
                            <Typography sx={{ fontSize: 11.5, color: accent.textSecondary, fontWeight: 500 }}>
                                Прикреплено фото: {order.photoCount}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        borderTop: `1px solid ${accent.border}`,
                    }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            py: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                            cursor: "pointer",
                            color: accent.urgent,
                            borderRight: `1px solid ${accent.border}`,
                            "&:hover": { background: "#fff5f5" },
                        }}
                    >
                        <CloseRoundedIcon sx={{ fontSize: 15 }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Отклонить</Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            py: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                            cursor: "pointer",
                            color: accent.success,
                            "&:hover": { background: "#f1faf3" },
                        }}
                    >
                        <CheckRoundedIcon sx={{ fontSize: 15 }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Принять</Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

/* ----------------- VARIANT 4: Vibrant Gradient ----------------- */
function VariantGradient({ order }: { order: DemoOrder }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "94%",
                    background: order.isUrgent
                        ? "linear-gradient(135deg, #ff6b6b 0%, #ee2c5b 60%, #c91e5b 100%)"
                        : "linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #3b82f6 100%)",
                    borderRadius: "22px 22px 22px 6px",
                    p: 1.75,
                    color: "#fff",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: order.isUrgent
                        ? "0 18px 40px -20px rgba(238,44,91,0.6)"
                        : "0 18px 40px -20px rgba(79,70,229,0.55)",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        right: -30,
                        top: -30,
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        right: 10,
                        bottom: -10,
                        width: 70,
                        height: 70,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                    }}
                />

                <Box sx={{ position: "relative" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: "#fff",
                                    boxShadow: "0 0 0 4px rgba(255,255,255,0.25)",
                                }}
                            />
                            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.95 }}>
                                {order.isUrgent ? "СРОЧНАЯ ЗАЯВКА" : "НОВАЯ ЗАЯВКА"}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
                            #{order.id}
                        </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, mb: 1 }}>
                        {order.activityName}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            gap: 0.85,
                            mb: 1.25,
                            flexWrap: "wrap",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                background: "rgba(255,255,255,0.18)",
                                backdropFilter: "blur(8px)",
                                borderRadius: 99,
                                px: 1,
                                py: 0.4,
                            }}
                        >
                            <DirectionsCarRoundedIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>
                                {order.carBrand}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                background: "rgba(255,255,255,0.18)",
                                backdropFilter: "blur(8px)",
                                borderRadius: 99,
                                px: 1,
                                py: 0.4,
                            }}
                        >
                            <PersonRoundedIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>
                                {order.customerName}
                            </Typography>
                        </Box>
                        {order.photoCount > 0 && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    background: "rgba(255,255,255,0.18)",
                                    backdropFilter: "blur(8px)",
                                    borderRadius: 99,
                                    px: 1,
                                    py: 0.4,
                                }}
                            >
                                <CameraAltRoundedIcon sx={{ fontSize: 13 }} />
                                <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>
                                    {order.photoCount}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box
                        sx={{
                            background: "rgba(255,255,255,0.14)",
                            backdropFilter: "blur(8px)",
                            borderRadius: 2,
                            p: 1,
                            mb: 1.25,
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: 12.5,
                                lineHeight: 1.4,
                                opacity: 0.95,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {order.description}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(0,0,0,0.18)",
                            borderRadius: 2,
                            px: 1.25,
                            py: 0.85,
                            cursor: "pointer",
                        }}
                    >
                        {order.price ? (
                            <Box>
                                <Typography sx={{ fontSize: 10, opacity: 0.75, fontWeight: 600 }}>
                                    Бюджет
                                </Typography>
                                <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>
                                    {order.price.toLocaleString("ru-RU")} ₸
                                </Typography>
                            </Box>
                        ) : (
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Открыть заявку</Typography>
                        )}
                        <Box
                            sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: order.isUrgent ? "#ee2c5b" : "#4f46e5",
                            }}
                        >
                            <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

/* ----------------- VARIANT 5: Ticket / Stub ----------------- */
function VariantTicket({ order }: { order: DemoOrder }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "94%",
                    background: accent.surface,
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: "0 10px 28px -16px rgba(30,40,70,0.22)",
                    border: `1px solid ${accent.border}`,
                    position: "relative",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "62%",
                        height: 0,
                        borderTop: `2px dashed ${accent.border}`,
                        zIndex: 1,
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        left: -8,
                        top: "calc(62% - 8px)",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#eef1f6",
                        zIndex: 2,
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        right: -8,
                        top: "calc(62% - 8px)",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#eef1f6",
                        zIndex: 2,
                    }}
                />

                <Box sx={{ px: 1.75, py: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.85 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2,
                                    background: order.isUrgent
                                        ? "linear-gradient(135deg, #fee2e2, #fecaca)"
                                        : "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                                    color: order.isUrgent ? accent.urgent : accent.primary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BuildRoundedIcon sx={{ fontSize: 18 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: accent.textPrimary, lineHeight: 1.15 }}>
                                    {order.activityName}
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: accent.textSecondary, fontWeight: 500 }}>
                                    {order.carBrand}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {order.isUrgent && (
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.4,
                                background: accent.urgentSoft,
                                color: accent.urgent,
                                px: 0.85,
                                py: 0.3,
                                borderRadius: 99,
                                mb: 0.85,
                            }}
                        >
                            <LocalFireDepartmentRoundedIcon sx={{ fontSize: 12 }} />
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4 }}>
                                ТРЕБУЕТСЯ СРОЧНО
                            </Typography>
                        </Box>
                    )}

                    <Typography
                        sx={{
                            fontSize: 12.5,
                            color: accent.textSecondary,
                            lineHeight: 1.45,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {order.description}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1.75,
                        py: 1.25,
                        background: accent.surfaceMuted,
                    }}
                >
                    <Box>
                        <Typography sx={{ fontSize: 10, color: accent.textSecondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Заявка
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: accent.textPrimary, fontFamily: "ui-monospace, monospace" }}>
                            #{order.id}
                        </Typography>
                    </Box>
                    {order.price && (
                        <Box>
                            <Typography sx={{ fontSize: 10, color: accent.textSecondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Бюджет
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: accent.textPrimary }}>
                                {order.price.toLocaleString("ru-RU")} ₸
                            </Typography>
                        </Box>
                    )}
                    <Box>
                        <Typography sx={{ fontSize: 10, color: accent.textSecondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Время
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: accent.textPrimary }}>
                            {order.createdAt}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

/* ----------------- VARIANT 6: Side-Stripe Minimal ----------------- */
function VariantSideStripe({ order }: { order: DemoOrder }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                sx={{
                    width: "92%",
                    display: "flex",
                    background: accent.surface,
                    borderRadius: "14px 14px 14px 4px",
                    overflow: "hidden",
                    border: `1px solid ${accent.border}`,
                    boxShadow: "0 4px 12px -8px rgba(30,40,70,0.15)",
                }}
            >
                <Box
                    sx={{
                        width: 4,
                        background: order.isUrgent
                            ? "linear-gradient(180deg, #ef4444, #dc2626)"
                            : "linear-gradient(180deg, #3b82f6, #2563eb)",
                        flexShrink: 0,
                    }}
                />
                <Box sx={{ flex: 1, px: 1.5, py: 1.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: accent.textSecondary, letterSpacing: 0.4 }}>
                                ЗАЯВКА #{order.id}
                            </Typography>
                            {order.isUrgent && (
                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.3,
                                        color: accent.urgent,
                                    }}
                                >
                                    <LocalFireDepartmentRoundedIcon sx={{ fontSize: 12 }} />
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>срочно</Typography>
                                </Box>
                            )}
                        </Box>
                        <Typography sx={{ fontSize: 10.5, color: accent.textSecondary }}>
                            {order.createdAt}
                        </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: accent.textPrimary, lineHeight: 1.2, mb: 0.5 }}>
                        {order.activityName}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mb: 0.75, color: accent.textSecondary }}>
                        <DirectionsCarRoundedIcon sx={{ fontSize: 13 }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                            {order.carBrand} · {order.customerName}
                        </Typography>
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 12,
                            color: accent.textSecondary,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mb: 0.75,
                        }}
                    >
                        {order.description}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Stack direction="row" spacing={0.5}>
                            {order.photoCount > 0 && (
                                <Chip
                                    size="small"
                                    icon={<CameraAltRoundedIcon sx={{ fontSize: 12 }} />}
                                    label={order.photoCount}
                                    sx={{
                                        height: 20,
                                        fontSize: 11,
                                        background: accent.surfaceMuted,
                                        color: accent.textSecondary,
                                        "& .MuiChip-icon": { color: accent.textSecondary, ml: 0.5 },
                                    }}
                                />
                            )}
                            {order.price && (
                                <Chip
                                    size="small"
                                    icon={<PaymentsRoundedIcon sx={{ fontSize: 12 }} />}
                                    label={`${order.price.toLocaleString("ru-RU")} ₸`}
                                    sx={{
                                        height: 20,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: "#ecfdf5",
                                        color: "#047857",
                                        "& .MuiChip-icon": { color: "#047857", ml: 0.5 },
                                    }}
                                />
                            )}
                        </Stack>
                        <Typography
                            sx={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: accent.primary,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.2,
                                cursor: "pointer",
                            }}
                        >
                            Подробнее
                            <ChevronRightRoundedIcon sx={{ fontSize: 14 }} />
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

const variants = [
    {
        id: "compact",
        title: "Вариант 1 · Компактный «чек»",
        description:
            "Минимум места в чате, шапка с номером и срочностью, основные поля и CTA-строка снизу. Хорош для плотной переписки.",
        component: VariantCompact,
    },
    {
        id: "hero",
        title: "Вариант 2 · Hero с изображением авто",
        description:
            "Премиальная карточка с тёмным баннером, аватаром клиента, бюджетом и кнопками действий. Сразу обращает внимание.",
        component: VariantHero,
    },
    {
        id: "document",
        title: "Вариант 3 · Структурированная «бумага»",
        description:
            "Формат заявки-документа: каждое поле отдельной строкой с иконкой. Внизу два действия — принять / отклонить.",
        component: VariantDocument,
    },
    {
        id: "gradient",
        title: "Вариант 4 · Градиент с акцентом на срочности",
        description:
            "Цвет карточки меняется в зависимости от timePreference. Эмоциональный, отлично выделяется в ленте.",
        component: VariantGradient,
    },
    {
        id: "ticket",
        title: "Вариант 5 · Билет / квитанция",
        description:
            "Карточка-«талон» с пунктирной перфорацией. В нижней части — три ключевые цифры: номер, бюджет, время.",
        component: VariantTicket,
    },
    {
        id: "side-stripe",
        title: "Вариант 6 · Боковая полоса (минимал)",
        description:
            "Самый ненавязчивый вариант — узкая цветная полоса слева кодирует срочность, остальное — текст и чипы.",
        component: VariantSideStripe,
    },
];

function ComparisonTable() {
    const fields = [
        ["Номер заявки (ID)", "из order.id"],
        ["Тип услуги", "activityType.displayName"],
        ["Автомобиль", "carBrand"],
        ["Имя клиента", "name / customer.name"],
        ["Описание проблемы", "description"],
        ["Срочность", "timePreference (urgent / not_urgent)"],
        ["Бюджет", "price (опционально)"],
        ["Кол-во фото", "photoAssetIds.length"],
        ["Время создания", "createdAt"],
        ["Телефон", "phone (для быстрого звонка)"],
    ];

    return (
        <Box
            sx={{
                background: "#fff",
                border: "1px solid #e6e9f0",
                borderRadius: 3,
                p: 2.5,
                mb: 4,
                boxShadow: "0 6px 18px -12px rgba(30,40,70,0.18)",
            }}
        >
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#1c2233", mb: 0.5 }}>
                Какие данные используются
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#6b7384", mb: 1.5 }}>
                Все варианты построены на полях <code>ChatOrder</code> из <code>front/src/modules/chats/api</code>.
                Цена и фото — опциональные.
            </Typography>
            <Stack spacing={0.75}>
                {fields.map(([label, source]) => (
                    <Box
                        key={label}
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            py: 0.75,
                            borderBottom: "1px dashed #e6e9f0",
                            "&:last-of-type": { borderBottom: "none" },
                        }}
                    >
                        <Typography sx={{ fontSize: 13, color: "#1c2233", fontWeight: 600 }}>
                            {label}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#6b7384", fontFamily: "ui-monospace, monospace" }}>
                            {source}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

export function OrderPreviewShowcaseScreen() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "linear-gradient(180deg, #f8fafc 0%, #eef1f6 100%)",
                py: { xs: 3, md: 6 },
                px: { xs: 1.5, md: 4 },
            }}
        >
            <Box sx={{ maxWidth: 1280, mx: "auto" }}>
                <Box sx={{ textAlign: "center", mb: { xs: 3, md: 5 } }}>
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
                        <PlaceRoundedIcon sx={{ fontSize: 14 }} />
                        UX EXPLORATION
                    </Box>
                    <Typography
                        sx={{
                            fontSize: { xs: 24, md: 36 },
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1.15,
                            mb: 1,
                        }}
                    >
                        Превью заявки в чате
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: 13.5, md: 15 },
                            color: "#475569",
                            maxWidth: 640,
                            mx: "auto",
                            lineHeight: 1.5,
                        }}
                    >
                        Шесть концепций карточки заявки, которая прилетает исполнителю
                        в чат сразу после создания. Каждая показана внутри реальной
                        переписки, чтобы оценить плотность и контраст.
                    </Typography>
                </Box>

                <ComparisonTable />

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                        gap: { xs: 3, md: 4 },
                    }}
                >
                    {variants.map(({ id, title, description, component: Component }) => (
                        <Box key={id}>
                            <Box sx={{ mb: 1.5, px: 0.5 }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a", mb: 0.4 }}>
                                    {title}
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.45 }}>
                                    {description}
                                </Typography>
                            </Box>
                            <ChatScaffold label={id}>
                                <Component order={demo} />
                            </ChatScaffold>
                        </Box>
                    ))}
                </Box>

                <Box
                    sx={{
                        mt: { xs: 4, md: 6 },
                        background: "#fff",
                        border: "1px solid #e6e9f0",
                        borderRadius: 3,
                        p: 2.5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a", mb: 0.4 }}>
                        Что дальше?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        Скажи номер варианта (или комбинацию: «1 как база, экшены из 3»)
                        — встрою его в <code>MessageBubble</code> как тип сообщения{" "}
                        <code>order_preview</code>, и заказы начнут отправляться карточкой
                        автоматически при создании.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
