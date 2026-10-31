import { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@modules/layout";
import { hasCapability } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";
import { ChatOrder, getProviderOrders } from "@modules/chats/api";

type ViewMode = "day" | "week";

const DEFAULT_DURATION_MINUTES = 60;

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(date: Date): Date {
    const d = startOfDay(date);
    const day = (d.getDay() + 6) % 7; // Пн=0
    d.setDate(d.getDate() - day);
    return d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function sameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function formatDayHeader(date: Date): string {
    return date.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatWeekRange(start: Date): string {
    const end = addDays(start, 6);
    const left = start.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
    });
    const right = end.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    return `${left} – ${right}`;
}

interface ScheduledSlot {
    order: ChatOrder;
    start: Date;
    end: Date;
    durationMinutes: number;
}

function buildSlots(orders: ChatOrder[]): ScheduledSlot[] {
    return orders
        .filter((o) => o.status === "scheduled" && o.confirmedDateTime)
        .map((order) => {
            const start = new Date(order.confirmedDateTime as string);
            // activityType.durationMinutes не доступен в ChatOrder — дефолт MVP 60 мин
            const duration = DEFAULT_DURATION_MINUTES;
            const end = new Date(start.getTime() + duration * 60_000);
            return { order, start, end, durationMinutes: duration };
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function Calendar() {
    const { profile } = useUserProfile();
    const navigate = useNavigate();
    const hasProfessionalCabinetAccess = hasCapability(
        profile,
        "professionalCabinet",
    );
    const hasCalendarAccess = hasCapability(profile, "calendar");
    const [mode, setMode] = useState<ViewMode>("week");
    const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));

    const { data: orders, isLoading } = useQuery({
        queryKey: ["providerOrders", profile?.id],
        queryFn: getProviderOrders,
        enabled: !!profile?.id && hasCalendarAccess,
    });

    const allSlots = useMemo(() => buildSlots(orders ?? []), [orders]);

    const visibleDays = useMemo(() => {
        if (mode === "day") return [startOfDay(cursor)];
        const start = startOfWeek(cursor);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [cursor, mode]);

    const slotsByDay = useMemo(() => {
        const map = new Map<string, ScheduledSlot[]>();
        for (const day of visibleDays) {
            map.set(day.toISOString(), []);
        }
        for (const slot of allSlots) {
            const dayKey = visibleDays.find((d) => sameDay(d, slot.start));
            if (dayKey) {
                map.get(dayKey.toISOString())!.push(slot);
            }
        }
        return map;
    }, [allSlots, visibleDays]);

    const handlePrev = () => {
        setCursor((prev) => addDays(prev, mode === "day" ? -1 : -7));
    };
    const handleNext = () => {
        setCursor((prev) => addDays(prev, mode === "day" ? 1 : 7));
    };
    const handleToday = () => setCursor(startOfDay(new Date()));

    const rangeLabel =
        mode === "day"
            ? formatDayHeader(cursor)
            : formatWeekRange(startOfWeek(cursor));

    if (!profile) return null;

    if (!hasProfessionalCabinetAccess) {
        return (
            <DashboardLayout title="Календарь">
                <Alert severity="info">
                    Календарь доступен после активации профессионального кабинета.
                </Alert>
            </DashboardLayout>
        );
    }

    if (!hasCalendarAccess) {
        return (
            <DashboardLayout title="Календарь">
                <Alert severity="info">
                    Календарь CRM mini сейчас доступен всем подтипам частного
                    исполнителя. Для бизнес-аккаунтов CRM-календарь появится
                    отдельно, в подписочной CRM.
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Календарь записей">
            <Stack spacing={2}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Tabs
                        value={mode}
                        onChange={(_, v) => setMode(v as ViewMode)}
                    >
                        <Tab value="day" label="День" />
                        <Tab value="week" label="Неделя" />
                    </Tabs>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton size="small" onClick={handlePrev}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Button size="small" variant="outlined" onClick={handleToday}>
                            Сегодня
                        </Button>
                        <IconButton size="small" onClick={handleNext}>
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Typography variant="subtitle1" sx={{ textTransform: "capitalize" }}>
                    {rangeLabel}
                </Typography>

                {isLoading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns:
                                mode === "day"
                                    ? "1fr"
                                    : {
                                          xs: "1fr",
                                          sm: "repeat(2, 1fr)",
                                          md: "repeat(7, 1fr)",
                                      },
                            gap: 1,
                        }}
                    >
                        {visibleDays.map((day, index) => {
                            const slots = slotsByDay.get(day.toISOString()) ?? [];
                            const isToday = sameDay(day, new Date());
                            return (
                                <Paper
                                    key={day.toISOString()}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        minHeight: 160,
                                        borderRadius: 2,
                                        background: isToday ? "#f0f7ff" : undefined,
                                    }}
                                >
                                    <Box sx={{ mb: 1 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {mode === "week" && WEEKDAY_LABELS[index]}
                                        </Typography>
                                        <Typography variant="subtitle2">
                                            {day.toLocaleDateString("ru-RU", {
                                                day: "2-digit",
                                                month: "short",
                                            })}
                                        </Typography>
                                    </Box>

                                    {slots.length === 0 ? (
                                        <Typography
                                            variant="caption"
                                            color="text.disabled"
                                        >
                                            Нет записей
                                        </Typography>
                                    ) : (
                                        <Stack spacing={0.75}>
                                            {slots.map((slot) => {
                                                const clientName =
                                                    slot.order.name ||
                                                    slot.order.customer?.name ||
                                                    slot.order.customer?.phone ||
                                                    "Клиент";
                                                return (
                                                    <Paper
                                                        key={slot.order.id}
                                                        elevation={0}
                                                        sx={{
                                                            p: 1,
                                                            borderLeft: "3px solid #f59e0b",
                                                            background: "#fff8e1",
                                                            borderRadius: 1,
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/cabinet/applications?orderId=${slot.order.id}`
                                                            )
                                                        }
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={600}
                                                            display="block"
                                                        >
                                                            {formatTime(slot.start)} –{" "}
                                                            {formatTime(slot.end)}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                        >
                                                            {clientName}
                                                        </Typography>
                                                        {slot.order.activityType
                                                            ?.displayName && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                display="block"
                                                            >
                                                                {
                                                                    slot.order.activityType
                                                                        .displayName
                                                                }
                                                            </Typography>
                                                        )}
                                                        <Chip
                                                            size="small"
                                                            label={`${slot.durationMinutes} мин`}
                                                            variant="outlined"
                                                            sx={{ mt: 0.5, height: 18 }}
                                                        />
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                </Paper>
                            );
                        })}
                    </Box>
                )}
            </Stack>
        </DashboardLayout>
    );
}
