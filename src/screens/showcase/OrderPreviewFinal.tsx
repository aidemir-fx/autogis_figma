import { Box, Stack, Typography, Divider } from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";

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

const accent = {
    primary: "#3b82f6",
    primaryDark: "#2563eb",
    urgent: "#ef4444",
    urgentSoft: "#fff1f1",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fb",
    border: "#e6e9f0",
    textPrimary: "#1c2233",
    textSecondary: "#6b7384",
};

/* ========================= FINAL CARD ========================= */
function OrderPreviewCard({ order }: { order: DemoOrder }) {
    const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
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
            value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {order.isUrgent ? "Срочно" : "Не срочно"}
                    {order.isUrgent && (
                        <LocalFireDepartmentRoundedIcon sx={{ fontSize: 14, color: accent.urgent }} />
                    )}
                </Box>
            ),
        },
        ...(order.price
            ? [
                  {
                      icon: <PaymentsRoundedIcon sx={{ fontSize: 14 }} />,
                      label: "Бюджет",
                      value: `${order.price.toLocaleString("ru-RU")} ₸`,
                  },
              ]
            : []),
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
                    boxShadow: "0 8px 24px -16px rgba(30,40,70,0.18)",
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        borderBottom: "1px solid #c7dafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.85 }}>
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
                            <Typography
                                sx={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: accent.textPrimary,
                                    lineHeight: 1.1,
                                }}
                            >
                                Заявка №{order.id}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 10.5,
                                    color: "#5775a8",
                                    fontWeight: 500,
                                }}
                            >
                                Создана в {order.createdAt}
                            </Typography>
                        </Box>
                    </Box>
                    {order.isUrgent ? (
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
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                                СРОЧНО
                            </Typography>
                        </Box>
                    ) : (
                        <VerifiedRoundedIcon sx={{ fontSize: 18, color: accent.primary }} />
                    )}
                </Box>

                {/* Body */}
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

                    <Divider sx={{ my: 1, borderColor: accent.border, borderStyle: "dashed" }} />

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

                {/* CTA */}
                <Box
                    sx={{
                        px: 1.75,
                        py: 1,
                        background: accent.surfaceMuted,
                        borderTop: `1px solid ${accent.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        "&:hover": { background: "#eef2f8" },
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

/* ========================= CHAT SCAFFOLD ========================= */
function ChatScaffold({
    children,
    label,
    role,
}: {
    children: React.ReactNode;
    label: string;
    role: "customer" | "executor";
}) {
    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: 440,
                background: "#eef1f6",
                borderRadius: 4,
                px: 1.75,
                pt: 2,
                pb: 1.75,
                mx: "auto",
                boxShadow: "0 18px 40px -22px rgba(30,40,70,0.25)",
                border: "1px solid #e6e9f0",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    mb: 1.5,
                }}
            >
                <Box
                    sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: role === "customer" ? "#3b82f6" : "#16a34a",
                    }}
                />
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#5b6473",
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                    }}
                >
                    {label}
                </Typography>
            </Box>

            <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Box
                        sx={{
                            maxWidth: "75%",
                            px: 1.75,
                            py: 1,
                            borderRadius: "16px 16px 16px 4px",
                            background: "#ffffff",
                            color: "#222738",
                            fontSize: 13.5,
                            boxShadow: "0 1px 2px rgba(30,40,70,0.05)",
                        }}
                    >
                        {role === "customer"
                            ? "Здравствуйте! Создал заявку на ремонт"
                            : "Здравствуйте! Получил заявку, изучу"}
                    </Box>
                </Box>

                {children}

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Box
                        sx={{
                            maxWidth: "75%",
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
                        {role === "customer"
                            ? "Жду вашего ответа по срокам"
                            : "Принял в работу, скоро свяжусь"}
                        <DoneAllIcon sx={{ fontSize: 14, color: "#fff", ml: 0.4 }} />
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}

/* ========================= DEMO DATA ========================= */
const urgentOrder: DemoOrder = {
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

const calmOrder: DemoOrder = {
    id: "ORD-7843",
    customerName: "Дамир Е.",
    activityName: "Плановое ТО двигателя",
    carBrand: "Hyundai Tucson 2021",
    description:
        "Подходит срок планового ТО на 60 000 км. Замена масла, фильтров, диагностика. Когда удобнее записаться?",
    isUrgent: false,
    phone: "+7 701 555 12 34",
    photoCount: 0,
    createdAt: "09:18",
};

const noPriceOrder: DemoOrder = {
    id: "ORD-7844",
    customerName: "Айгерим С.",
    activityName: "Полировка кузова",
    carBrand: "BMW X5 2020",
    description:
        "Появилось много мелких царапин на капоте и дверях. Хочу понять, можно ли убрать без покраски и сколько это будет стоить.",
    isUrgent: false,
    phone: "+7 775 987 65 43",
    photoCount: 5,
    createdAt: "11:05",
};

/* ========================= PAGE ========================= */
export function OrderPreviewFinalScreen() {
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
                {/* Header */}
                <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.75,
                            background: "#dcfce7",
                            color: "#15803d",
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 700,
                            mb: 1.5,
                        }}
                    >
                        <VerifiedRoundedIcon sx={{ fontSize: 14 }} />
                        ФИНАЛЬНЫЙ ВАРИАНТ
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
                            lineHeight: 1.55,
                        }}
                    >
                        Структурированная карточка-документ с одной кнопкой
                        «Открыть детали» — все действия по заявке (принять,
                        отклонить, договориться о времени) выполняются на
                        отдельной странице заявки.
                    </Typography>
                </Box>

                {/* Three states preview */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                        gap: { xs: 3, md: 3 },
                        mb: { xs: 4, md: 6 },
                    }}
                >
                    <Box>
                        <Box sx={{ mb: 1.5, px: 0.5 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", mb: 0.3 }}>
                                Срочная заявка с бюджетом
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                                Красный значок «СРОЧНО» в шапке + иконка огня в строке «Сроки».
                            </Typography>
                        </Box>
                        <ChatScaffold label="чат · исполнитель видит" role="executor">
                            <OrderPreviewCard order={urgentOrder} />
                        </ChatScaffold>
                    </Box>

                    <Box>
                        <Box sx={{ mb: 1.5, px: 0.5 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", mb: 0.3 }}>
                                Спокойная заявка, без фото
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                                Без флага срочности и блока бюджета — самая компактная высота.
                            </Typography>
                        </Box>
                        <ChatScaffold label="чат · исполнитель видит" role="executor">
                            <OrderPreviewCard order={calmOrder} />
                        </ChatScaffold>
                    </Box>

                    <Box>
                        <Box sx={{ mb: 1.5, px: 0.5 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", mb: 0.3 }}>
                                Заявка с фото, без бюджета
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                                Бюджет — опциональное поле, скрывается при отсутствии. Фото отображаются строкой-плашкой.
                            </Typography>
                        </Box>
                        <ChatScaffold label="чат · исполнитель видит" role="executor">
                            <OrderPreviewCard order={noPriceOrder} />
                        </ChatScaffold>
                    </Box>
                </Box>

                {/* Anatomy section */}
                <Box
                    sx={{
                        background: "#fff",
                        border: "1px solid #e6e9f0",
                        borderRadius: 3,
                        p: { xs: 2, md: 3 },
                        mb: { xs: 3, md: 4 },
                        boxShadow: "0 6px 18px -12px rgba(30,40,70,0.18)",
                    }}
                >
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
                        Анатомия карточки
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#64748b", mb: 2, lineHeight: 1.5 }}>
                        Три зоны: шапка-идентификация, тело-факты, footer-действие.
                    </Typography>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                            gap: 2,
                        }}
                    >
                        {[
                            {
                                title: "1. Шапка",
                                desc: "Голубой градиент + иконка документа. Слева — номер заявки и время создания. Справа — флаг срочности либо галочка-«verified».",
                                fields: ["order.id", "order.createdAt", "order.timePreference"],
                            },
                            {
                                title: "2. Тело",
                                desc: "Поля «Услуга / Авто / Клиент / Сроки / Бюджет» — каждое строкой с иконкой и микро-лейблом. Ниже — описание проблемы (3 строки максимум) и плашка с количеством фото.",
                                fields: [
                                    "activityType.displayName",
                                    "carBrand",
                                    "name",
                                    "timePreference",
                                    "price?",
                                    "description",
                                    "photoAssetIds",
                                ],
                            },
                            {
                                title: "3. CTA",
                                desc: "Серый footer на всю ширину с подписью «Открыть детали» и круглой стрелкой. Клик ведёт на страницу заявки, где доступны действия.",
                                fields: ["onClick → /applications/:id"],
                            },
                        ].map((zone) => (
                            <Box
                                key={zone.title}
                                sx={{
                                    background: "#f8fafc",
                                    border: "1px solid #e6e9f0",
                                    borderRadius: 2,
                                    p: 1.75,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 13.5,
                                        fontWeight: 700,
                                        color: "#0f172a",
                                        mb: 0.6,
                                    }}
                                >
                                    {zone.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 12.5,
                                        color: "#475569",
                                        lineHeight: 1.5,
                                        mb: 1.25,
                                    }}
                                >
                                    {zone.desc}
                                </Typography>
                                <Stack spacing={0.4}>
                                    {zone.fields.map((f) => (
                                        <Typography
                                            key={f}
                                            sx={{
                                                fontSize: 11,
                                                fontFamily: "ui-monospace, monospace",
                                                color: "#3b82f6",
                                                background: "#eff6ff",
                                                px: 0.75,
                                                py: 0.3,
                                                borderRadius: 1,
                                                display: "inline-block",
                                                width: "fit-content",
                                            }}
                                        >
                                            {f}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Behavior */}
                <Box
                    sx={{
                        background: "#fff",
                        border: "1px solid #e6e9f0",
                        borderRadius: 3,
                        p: { xs: 2, md: 3 },
                        boxShadow: "0 6px 18px -12px rgba(30,40,70,0.18)",
                    }}
                >
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a", mb: 1.25 }}>
                        Поведение и адаптивность
                    </Typography>
                    <Stack spacing={1}>
                        {[
                            "Карточка отправляется автоматически в момент создания заказа — как первое сообщение в чате с исполнителем.",
                            "Срочные и обычные заявки отличаются только акцентом в шапке и иконкой огня в строке «Сроки» — общая структура не меняется, чтобы карточки оставались узнаваемыми.",
                            "Поля «Бюджет» и «Фото» — опциональные. Если их нет в заявке, соответствующие строки/плашки не рендерятся, и карточка становится компактнее.",
                            "Описание клампится на 3 строки. Полный текст и все фото открываются по тапу на «Открыть детали».",
                            "Ширина — 94 % bubble-области. На мобильных и десктопе занимает одинаково небольшое место, не давит на ленту чата.",
                            "Никаких inline-действий: чат используется только для общения. Все статусы заявки меняются на отдельной странице, чтобы не было дублирующих UI-путей.",
                        ].map((line, idx) => (
                            <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                <Box
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        background: "#dcfce7",
                                        color: "#15803d",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        mt: 0.2,
                                    }}
                                >
                                    {idx + 1}
                                </Box>
                                <Typography sx={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55 }}>
                                    {line}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>

                <Box
                    sx={{
                        mt: { xs: 3, md: 4 },
                        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                        border: "1px solid #c7dafb",
                        borderRadius: 3,
                        p: 2.5,
                        textAlign: "center",
                    }}
                >
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a", mb: 0.4 }}>
                        Готов к интеграции
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#3a5478", lineHeight: 1.5 }}>
                        Если согласуем этот вид — встрою его в{" "}
                        <code>MessageBubble</code> как тип сообщения{" "}
                        <code>order_preview</code> и добавлю автоматическую отправку
                        при создании заявки.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
