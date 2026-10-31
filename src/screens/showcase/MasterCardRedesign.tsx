import type { ReactNode } from "react";
import {
    Box,
    Button,
    Chip,
    Container,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LocalPhoneRoundedIcon from "@mui/icons-material/LocalPhoneRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
    CalendarIcon as ProjectCalendarIcon,
    PhoneIcon as ProjectPhoneIcon,
} from "@common/icons";
import {
    ActionLink as ProjectActionLink,
    Actions as ProjectActions,
    StatusPill as ProjectStatusPill,
    Tag as ProjectTag,
    Tags as ProjectTags,
} from "@modules/providers/features/ProviderShowcaseCard/styles";

const colors = {
    page: "#f5f7fb",
    surface: "#ffffff",
    surfaceSoft: "#f8fafc",
    border: "#e5e7eb",
    text: "#111827",
    muted: "#6b7280",
    faint: "#9ca3af",
    blue: "#3b82f6",
    blueDark: "#2563eb",
    blueSoft: "#eff6ff",
    green: "#64B441",
    greenDark: "#2A8800",
    greenSoft: "#E8F4E3",
    amber: "#BD5C0A",
    amberSoft: "#FFEBCE",
};

const master = {
    name: "Александр-Константин Чернышевский-Моторист",
    shortName: "Александр К.",
    rating: "4.8",
    reviews: 26,
    distance: "801 м от вас",
    status: "На работе",
    today: "до 20:00",
    schedule: "Пн-Пт",
    off: "Сб-Вс выходной",
    tags: ["Моторист", "Диагностика", "Toyota", "Электрика"],
};

const problemItems = [
    {
        title: "Пустоты",
        text: "Блоки идут вертикально и занимают высоту, хотя данные можно считывать в две плотные строки.",
    },
    {
        title: "Дни недели",
        text: "Семь плиток выглядят как график, но в карточке важнее ответить: работает ли сегодня и когда.",
    },
    {
        title: "Длинное имя",
        text: "Имя должно жить в ограниченной зоне: clamp на 2 строки, дальше детали на отдельном экране.",
    },
    {
        title: "Плашки",
        text: "Статус, запись, теги и дистанция конкурируют. Нужна иерархия: статус рядом со временем, теги ниже.",
    },
];

const principles = [
    "Сначала выбор исполнителя: имя, рейтинг, дистанция, статус.",
    "Расписание в карточке показываем как краткое резюме, полный график - в деталях.",
    "Теги ограничиваем двумя-тремя значениями и счетчиком, без переноса в длинную простыню.",
    "Кнопки держим стабильными по высоте, с явным primary action.",
];

function Shell({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "linear-gradient(180deg, #f5f7fb 0%, #ffffff 52%, #f5f7fb 100%)",
                color: colors.text,
                py: { xs: 3, md: 5 },
            }}
        >
            <Container maxWidth="xl">{children}</Container>
        </Box>
    );
}

function SectionHeader({
    kicker,
    title,
    text,
}: {
    kicker: string;
    title: string;
    text: string;
}) {
    return (
        <Stack spacing={1.2} sx={{ maxWidth: 780 }}>
            <Typography
                sx={{
                    color: colors.blueDark,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                }}
            >
                {kicker}
            </Typography>
            <Typography
                component="h2"
                sx={{
                    fontSize: { xs: 24, md: 32 },
                    lineHeight: 1.16,
                    fontWeight: 800,
                    letterSpacing: 0,
                    color: colors.text,
                }}
            >
                {title}
            </Typography>
            <Typography sx={{ color: colors.muted, fontSize: 15, lineHeight: 1.65 }}>
                {text}
            </Typography>
        </Stack>
    );
}

function InfoTile({ title, text }: { title: string; text: string }) {
    return (
        <Box
            sx={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                p: 2,
                minHeight: 126,
            }}
        >
            <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 0.8 }}>
                {title}
            </Typography>
            <Typography sx={{ color: colors.muted, fontSize: 13.5, lineHeight: 1.55 }}>
                {text}
            </Typography>
        </Box>
    );
}

function AvatarMark({ size = 56 }: { size?: number }) {
    return (
        <Box
            sx={{
                position: "relative",
                width: size,
                height: size,
                flex: `0 0 ${size}px`,
                borderRadius: "8px",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                background:
                    "linear-gradient(135deg, #ddeafd 0%, #e8f4e3 48%, #3b82f6 100%)",
                border: "1px solid rgba(59,130,246,0.18)",
                color: "#1d4ed8",
                fontSize: size > 50 ? 18 : 14,
                fontWeight: 900,
            }}
        >
            АК
            <Box
                sx={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#10b981",
                    border: "2px solid #fff",
                }}
            />
        </Box>
    );
}

function RatingDistance({ compact = false }: { compact?: boolean }) {
    return (
        <Stack
            direction="row"
            alignItems="center"
            spacing={0.8}
            sx={{
                minWidth: 0,
                color: colors.muted,
                fontSize: compact ? 11.5 : 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
            }}
        >
            <Stack direction="row" spacing={0.35} alignItems="center">
                <StarRoundedIcon sx={{ fontSize: compact ? 13 : 15, color: colors.faint }} />
                <Box component="span" sx={{ color: colors.text }}>
                    {master.rating}
                </Box>
                <Box component="span" sx={{ color: colors.muted }}>
                    ({master.reviews})
                </Box>
            </Stack>
            <Box
                sx={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: colors.faint,
                    flex: "0 0 3px",
                }}
            />
            <Stack direction="row" spacing={0.35} alignItems="center" sx={{ minWidth: 0 }}>
                <PlaceRoundedIcon sx={{ fontSize: compact ? 13 : 15, color: colors.blue }} />
                <Box component="span">{master.distance}</Box>
            </Stack>
        </Stack>
    );
}

function StatusScheduleRow({ dense = false }: { dense?: boolean }) {
    return (
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <ProjectStatusPill $status="on">
                {master.status} {master.today}
            </ProjectStatusPill>
            <ProjectTag>{master.schedule}</ProjectTag>
        </Stack>
    );
}

function Tags({ limit = 3 }: { limit?: number }) {
    const visible = master.tags.slice(0, limit);
    const hidden = master.tags.length - visible.length;

    return (
        <ProjectTags>
            {visible.map((tag) => (
                <ProjectTag key={tag}>{tag}</ProjectTag>
            ))}
            {hidden > 0 && (
                <ProjectTag>+{hidden}</ProjectTag>
            )}
        </ProjectTags>
    );
}

function CardFrame({
    label,
    children,
    width = 360,
}: {
    label: string;
    children: ReactNode;
    width?: number;
}) {
    return (
        <Stack spacing={1.2} sx={{ alignItems: "center", width: "100%" }}>
            <Typography
                sx={{
                    color: colors.muted,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    alignSelf: "flex-start",
                }}
            >
                {label}
            </Typography>
            <Box sx={{ width: "100%", maxWidth: width }}>{children}</Box>
        </Stack>
    );
}

function RecommendedCard({
    onlineBookingEnabled = false,
}: {
    onlineBookingEnabled?: boolean;
}) {
    const detailsHref = "/provider?id=demo-master&type=master";

    return (
        <Box
            sx={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                p: 1.75,
                boxShadow: "0 14px 36px -28px rgba(15,23,42,0.45)",
            }}
        >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <AvatarMark />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        component="h3"
                        title={master.name}
                        sx={{
                            color: colors.text,
                            fontSize: 15.5,
                            fontWeight: 850,
                            lineHeight: 1.22,
                            letterSpacing: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {master.name}
                    </Typography>
                    <Box sx={{ mt: 0.65 }}>
                        <RatingDistance />
                    </Box>
                </Box>
            </Stack>

            <Box sx={{ mt: 1.25 }}>
                <StatusScheduleRow />
            </Box>

            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                    mt: 1.25,
                    pt: 1.25,
                    borderTop: `1px solid ${colors.border}`,
                    minWidth: 0,
                }}
            >
                <BuildRoundedIcon sx={{ color: colors.muted, fontSize: 16, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Tags />
                </Box>
            </Stack>

            <Box sx={{ mt: 1.5 }}>
                {onlineBookingEnabled ? (
                    <ProjectActions $layout="booking">
                        <ProjectActionLink href={detailsHref} $variant="booking">
                            <ProjectCalendarIcon />
                            Записаться
                        </ProjectActionLink>
                        <ProjectActionLink
                            href="tel:+77071234567"
                            $variant="phoneIcon"
                            aria-label="Позвонить"
                            title="Позвонить"
                        >
                            <ProjectPhoneIcon />
                        </ProjectActionLink>
                    </ProjectActions>
                ) : (
                    <ProjectActions>
                        <ProjectActionLink href="tel:+77071234567" $variant="primary">
                            <ProjectPhoneIcon />
                            Позвонить
                        </ProjectActionLink>
                        <ProjectActionLink href={detailsHref} $variant="outline">
                            <VisibilityRoundedIcon />
                            Подробнее
                        </ProjectActionLink>
                    </ProjectActions>
                )}
            </Box>
        </Box>
    );
}

function MapListCard() {
    return (
        <Box
            sx={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                p: 1.25,
                boxShadow: "0 10px 26px -24px rgba(15,23,42,0.42)",
            }}
        >
            <Stack direction="row" spacing={1.1} alignItems="center">
                <AvatarMark size={44} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.7} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                            component="h3"
                            title={master.name}
                            sx={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: 14.5,
                                lineHeight: 1.25,
                                fontWeight: 850,
                                letterSpacing: 0,
                            }}
                        >
                            {master.name}
                        </Typography>
                        <Box
                            sx={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#10b981",
                                flex: "0 0 7px",
                            }}
                        />
                    </Stack>
                    <Box sx={{ mt: 0.4 }}>
                        <RatingDistance compact />
                    </Box>
                    <Typography
                        sx={{
                            mt: 0.55,
                            color: colors.muted,
                            fontSize: 12,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Моторист, диагностика, Toyota
                    </Typography>
                </Box>
                <Tooltip title="Позвонить">
                    <IconButton
                        aria-label="Позвонить"
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "8px",
                            background: colors.blue,
                            color: "#fff",
                            "&:hover": { background: colors.blueDark },
                        }}
                    >
                        <LocalPhoneRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Stack
                direction="row"
                spacing={0.8}
                alignItems="center"
                justifyContent="space-between"
                sx={{ mt: 1.1 }}
            >
                <StatusScheduleRow dense />
                <Button
                    variant="text"
                    endIcon={<KeyboardArrowRightRoundedIcon />}
                    sx={{
                        color: colors.blueDark,
                        fontSize: 12,
                        fontWeight: 850,
                        minWidth: 0,
                        px: 0.6,
                        whiteSpace: "nowrap",
                    }}
                >
                    Детали
                </Button>
            </Stack>
        </Box>
    );
}

function BookingCard() {
    return (
        <Box
            sx={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 16px 34px -28px rgba(15,23,42,0.45)",
            }}
        >
            <Box sx={{ p: 1.75 }}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <AvatarMark />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            component="h3"
                            title={master.name}
                            sx={{
                                color: colors.text,
                                fontSize: 15.5,
                                fontWeight: 850,
                                lineHeight: 1.22,
                                letterSpacing: 0,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {master.name}
                        </Typography>
                        <Box sx={{ mt: 0.65 }}>
                            <RatingDistance />
                        </Box>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                    <Chip
                        size="small"
                        icon={<AccessTimeRoundedIcon />}
                        label="Ближайшее окно: сегодня 18:30"
                        sx={{
                            height: 28,
                            borderRadius: "8px",
                            background: colors.amberSoft,
                            color: colors.amber,
                            fontWeight: 850,
                            fontSize: 12,
                            "& .MuiChip-icon": {
                                color: colors.amber,
                                fontSize: 15,
                                ml: 0.8,
                            },
                        }}
                    />
                    <Chip
                        size="small"
                        label={master.off}
                        sx={{
                            height: 28,
                            borderRadius: "8px",
                            background: colors.surfaceSoft,
                            color: colors.muted,
                            border: `1px solid ${colors.border}`,
                            fontWeight: 750,
                            fontSize: 12,
                        }}
                    />
                </Stack>

                <Box
                    sx={{
                        mt: 1.4,
                        p: 1.1,
                        borderRadius: "8px",
                        background: colors.surfaceSoft,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TuneRoundedIcon sx={{ fontSize: 17, color: colors.muted }} />
                        <Typography sx={{ fontSize: 12.5, color: colors.muted, fontWeight: 700 }}>
                            Сильная сторона
                        </Typography>
                    </Stack>
                    <Typography
                        sx={{
                            mt: 0.55,
                            fontSize: 14,
                            lineHeight: 1.42,
                            color: colors.text,
                            fontWeight: 750,
                        }}
                    >
                        Быстрая диагностика двигателя и выезд рядом с клиентом.
                    </Typography>
                </Box>
            </Box>

            <Stack
                direction="row"
                spacing={1}
                sx={{
                    px: 1.75,
                    py: 1.35,
                    borderTop: `1px solid ${colors.border}`,
                    background: "#fbfcfe",
                }}
            >
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CalendarMonthRoundedIcon />}
                    sx={{
                        height: 42,
                        borderRadius: "8px",
                        background: colors.green,
                        fontWeight: 850,
                        "&:hover": { background: "#4E992D" },
                    }}
                >
                    Записаться
                </Button>
                <Tooltip title="Позвонить">
                    <IconButton
                        aria-label="Позвонить"
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: "8px",
                            color: colors.blueDark,
                            border: `1px solid ${colors.border}`,
                            background: colors.surface,
                        }}
                    >
                        <LocalPhoneRoundedIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );
}

function VariantNote({
    title,
    text,
    points,
}: {
    title: string;
    text: string;
    points: string[];
}) {
    return (
        <Stack spacing={1.1} sx={{ minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: 18, fontWeight: 850 }}>
                {title}
            </Typography>
            <Typography sx={{ color: colors.muted, fontSize: 14.5, lineHeight: 1.65 }}>
                {text}
            </Typography>
            <Stack spacing={0.85}>
                {points.map((point) => (
                    <Stack key={point} direction="row" spacing={0.85} alignItems="flex-start">
                        <CheckCircleRoundedIcon
                            sx={{ color: colors.green, fontSize: 17, mt: "2px", flexShrink: 0 }}
                        />
                        <Typography sx={{ color: colors.text, fontSize: 13.5, lineHeight: 1.45 }}>
                            {point}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Stack>
    );
}

function VariantPanel({
    label,
    title,
    text,
    points,
    children,
    recommended = false,
}: {
    label: string;
    title: string;
    text: string;
    points: string[];
    children: ReactNode;
    recommended?: boolean;
}) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 420px" },
                gap: { xs: 2.5, md: 4 },
                alignItems: "center",
                py: { xs: 3, md: 4 },
                borderTop: `1px solid ${colors.border}`,
            }}
        >
            <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                        label={label}
                        size="small"
                        sx={{
                            height: 26,
                            borderRadius: "8px",
                            background: colors.blueSoft,
                            color: colors.blueDark,
                            fontWeight: 850,
                        }}
                    />
                    {recommended && (
                        <Chip
                            label="Рекомендую для production"
                            size="small"
                            sx={{
                                height: 26,
                                borderRadius: "8px",
                                background: colors.greenSoft,
                                color: colors.greenDark,
                                fontWeight: 850,
                            }}
                        />
                    )}
                </Stack>
                <VariantNote title={title} text={text} points={points} />
            </Stack>
            <Box
                sx={{
                    justifySelf: { xs: "stretch", lg: "center" },
                    width: "100%",
                    maxWidth: 420,
                    p: { xs: 1.5, md: 2 },
                    borderRadius: "8px",
                    background: "linear-gradient(180deg, #eef3f9 0%, #f8fafc 100%)",
                    border: `1px solid ${colors.border}`,
                }}
            >
                <CardFrame label="Превью карточки">{children}</CardFrame>
            </Box>
        </Box>
    );
}

export function MasterCardRedesignScreen() {
    return (
        <Shell>
            <Stack spacing={{ xs: 4, md: 5 }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.92fr) 420px" },
                        gap: { xs: 3, md: 5 },
                        alignItems: "center",
                    }}
                >
                    <Stack spacing={2.2}>
                        <Chip
                            label="Design proposal"
                            sx={{
                                alignSelf: "flex-start",
                                borderRadius: "8px",
                                background: colors.blueSoft,
                                color: colors.blueDark,
                                fontWeight: 850,
                            }}
                        />
                        <Typography
                            component="h1"
                            sx={{
                                maxWidth: 820,
                                fontSize: { xs: 32, md: 46 },
                                lineHeight: 1.08,
                                fontWeight: 900,
                                letterSpacing: 0,
                                color: colors.text,
                            }}
                        >
                            Карточка частного исполнителя без пустот и визуального шума
                        </Typography>
                        <Typography
                            sx={{
                                maxWidth: 760,
                                color: colors.muted,
                                fontSize: { xs: 15, md: 17 },
                                lineHeight: 1.7,
                            }}
                        >
                            Вместо отдельного графика из семи плиток карточка должна отвечать на
                            быстрый вопрос клиента: кто это, насколько близко, работает ли сейчас и
                            какое действие сделать дальше.
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: "8px",
                            background: "#edf3fb",
                            border: `1px solid ${colors.border}`,
                        }}
                    >
                        <RecommendedCard onlineBookingEnabled />
                    </Box>
                </Box>

                <Box>
                    <SectionHeader
                        kicker="Проблема текущей карточки"
                        title="Плотность надо повышать не сжатием, а правильной иерархией"
                        text="Сейчас каждый параметр выглядит отдельным блоком. Из-за этого карточка кажется длинной, а важные сигналы теряются среди плашек. Ниже - что именно меняем."
                    />
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                lg: "repeat(4, minmax(0, 1fr))",
                            },
                            gap: 1.5,
                            mt: 2.5,
                        }}
                    >
                        {problemItems.map((item) => (
                            <InfoTile key={item.title} title={item.title} text={item.text} />
                        ))}
                    </Box>
                </Box>

                <Box
                    sx={{
                        py: { xs: 3, md: 4 },
                        borderTop: `1px solid ${colors.border}`,
                        borderBottom: `1px solid ${colors.border}`,
                    }}
                >
                    <SectionHeader
                        kicker="Мой выбор"
                        title="Вариант A: компактная карточка списка"
                        text="Это лучший основной формат для выдачи. Он сохраняет узнаваемый стиль проекта: белая поверхность, проектные плашки, зеленый статус, radius 8px. Для мастеров с онлайн-записью главный action становится зеленым 'Записаться', для остальных остается обычная пара 'Позвонить' и 'Подробнее'."
                    />
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                            gap: 1.5,
                            mt: 2.5,
                        }}
                    >
                        {principles.map((item) => (
                            <Stack
                                key={item}
                                direction="row"
                                spacing={1}
                                alignItems="flex-start"
                                sx={{
                                    p: 1.5,
                                    borderRadius: "8px",
                                    background: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                <CheckCircleRoundedIcon
                                    sx={{ color: colors.green, fontSize: 18, mt: "2px" }}
                                />
                                <Typography sx={{ fontSize: 14, lineHeight: 1.5, color: colors.text }}>
                                    {item}
                                </Typography>
                            </Stack>
                        ))}
                    </Box>
                </Box>

                <Box>
                    <SectionHeader
                        kicker="Варианты"
                        title="Три формата под разные места интерфейса"
                        text="Один компонент можно собрать в нескольких плотностях. Так карточка не будет одинаково громоздкой в списке, на карте и в сценарии онлайн-записи."
                    />

                    <VariantPanel
                        label="A. List default"
                        title="Основная карточка для выдачи"
                        recommended
                        text="Оптимальный баланс информативности и высоты. Длинное имя ограничено двумя строками, статус объединен со временем работы, а действия зависят от настройки онлайн-записи у мастера."
                        points={[
                            "Семь дней заменены на 'На работе до 20:00' и 'Пн-Пт'.",
                            "Плашки специализации ограничены и не ломают сетку.",
                            "Если онлайн-запись включена, 'Записаться' ведет на страницу деталей.",
                            "Если онлайн-записи нет, остается текущий вариант с звонком и деталями.",
                        ]}
                    >
                        <Stack spacing={1.4}>
                            <Typography
                                sx={{
                                    color: colors.greenDark,
                                    fontSize: 11.5,
                                    fontWeight: 850,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                }}
                            >
                                Онлайн-запись включена
                            </Typography>
                            <RecommendedCard onlineBookingEnabled />
                            <Typography
                                sx={{
                                    color: colors.muted,
                                    fontSize: 11.5,
                                    fontWeight: 850,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                    pt: 0.5,
                                }}
                            >
                                Онлайн-записи нет
                            </Typography>
                            <RecommendedCard />
                        </Stack>
                    </VariantPanel>

                    <VariantPanel
                        label="B. Map compact"
                        title="Компактная строка для карты и bottom sheet"
                        text="Когда пользователь уже смотрит карту, карточка должна быть почти строкой: быстрый скан, звонок одним касанием и переход в детали без лишней высоты."
                        points={[
                            "Имя в одну строку с ellipsis, потому что место ограничено.",
                            "Телефон вынесен в icon button, детали остаются вторичным действием.",
                            "Статус и график сохраняются, но занимают одну короткую строку.",
                        ]}
                    >
                        <MapListCard />
                    </VariantPanel>

                    <VariantPanel
                        label="C. Booking first"
                        title="Расширенная карточка для онлайн-записи"
                        text="Подходит там, где важнее не просто позвонить, а выбрать ближайшее окно. Она чуть выше, зато дает пользователю конкретный повод нажать 'Записаться'."
                        points={[
                            "Главный сигнал - ближайшее окно, а не полный календарь.",
                            "Сильная сторона заменяет пустой описательный блок.",
                            "Primary action меняется на запись, звонок остается рядом.",
                        ]}
                    >
                        <BookingCard />
                    </VariantPanel>
                </Box>
            </Stack>
        </Shell>
    );
}
