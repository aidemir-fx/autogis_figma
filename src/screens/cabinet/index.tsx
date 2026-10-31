import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    TextField,
    Tabs,
    Tab,
    Stack,
    IconButton,
    Paper,
    Avatar,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from "@mui/material";
import {
    Calendar as CalendarIcon,
    Clock,
    Phone,
    User,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Send,
    MapPin,
    Wrench,
    Briefcase,
    Save,
    ArrowLeft,
    TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUserProfile } from "@common/hooks";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";

// ──────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────
export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const settingsRoute =
        profile?.role === "auto_service"
            ? "/cabinet/auto-service-settings"
            : profile?.role === "auto_shop"
              ? "/cabinet/auto-shop-settings"
              : profile?.role === "auto_wash"
                ? "/cabinet/auto-wash-settings"
                : "/cabinet/master-settings";
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/orders")
            .then((r) => r.json())
            .then((data) => setOrders(data))
            .catch(() => {});
    }, []);

    const activeCount = orders.filter((o) => o.status === "in_progress" || o.status === "created").length;
    const completedCount = orders.filter((o) => o.status === "completed").length;

    return (
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Панель управления специалиста
            </Typography>

            {/* Metric counters */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={1} sx={{ borderRadius: 3, borderLeft: "4px solid #3b82f6" }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                Активные заявки
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#1e3a8a" }}>
                                {activeCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={1} sx={{ borderRadius: 3, borderLeft: "4px solid #10b981" }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                Завершенные заказы
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#065f46" }}>
                                {completedCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={1} sx={{ borderRadius: 3, borderLeft: "4px solid #f59e0b" }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                Рейтинг в системе
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#92400e" }}>
                                4.9 ★
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick action buttons */}
            <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
                <Button
                    variant="contained"
                    startIcon={<CalendarIcon size={18} />}
                    onClick={() => navigate("/cabinet/applications")}
                >
                    Перейти к заявкам ({orders.length})
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<MessageSquare size={18} />}
                    onClick={() => navigate("/cabinet/chats")}
                >
                    Открыть сообщения
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Wrench size={18} />}
                    onClick={() => navigate(settingsRoute)}
                >
                    Редактировать профиль
                </Button>
            </Box>

            {/* Recent applications */}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Последние заявки
            </Typography>
            <Stack spacing={2}>
                {orders.slice(0, 3).map((ord) => (
                    <Card key={ord.id} elevation={1} sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {ord.carBrand || "Автомобиль клиента"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Клиент: {ord.name || "Иван"} ({ord.phone})
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1, color: "#334155" }}>
                                        {ord.description}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={
                                        ord.status === "created"
                                            ? "Новая"
                                            : ord.status === "in_progress"
                                            ? "В работе"
                                            : ord.status === "completed"
                                            ? "Выполнена"
                                            : "Отменена"
                                    }
                                    color={
                                        ord.status === "created"
                                            ? "primary"
                                            : ord.status === "in_progress"
                                            ? "warning"
                                            : ord.status === "completed"
                                            ? "success"
                                            : "default"
                                    }
                                    size="small"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Stack>
        </Box>
    );
};

// ──────────────────────────────────────────────
// APPLICATIONS / BOOKINGS
// ──────────────────────────────────────────────
export const Applications: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [filterTab, setFilterTab] = useState("all");

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            setOrders(data);
        } catch {}
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                toast.success(`Статус заявки обновлен на: ${newStatus}`);
                loadOrders();
            }
        } catch {
            toast.error("Не удалось обновить статус");
        }
    };

    const filtered = orders.filter((o) => {
        if (filterTab === "all") return true;
        if (filterTab === "new") return o.status === "created";
        if (filterTab === "active") return o.status === "in_progress";
        if (filterTab === "completed") return o.status === "completed";
        if (filterTab === "cancelled") return o.status === "cancelled";
        return true;
    });

    return (
        <DashboardLayout>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Заявки и заказы
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Управление бронированиями и входящими заявками клиентов
                </Typography>
            </Box>

            <Tabs
                value={filterTab}
                onChange={(_, v) => setFilterTab(v)}
                sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}
            >
                <Tab label={`Все (${orders.length})`} value="all" sx={{ textTransform: "none", fontWeight: 600 }} />
                <Tab label="Новые" value="new" sx={{ textTransform: "none", fontWeight: 600 }} />
                <Tab label="В работе" value="active" sx={{ textTransform: "none", fontWeight: 600 }} />
                <Tab label="Завершенные" value="completed" sx={{ textTransform: "none", fontWeight: 600 }} />
                <Tab label="Отмененные" value="cancelled" sx={{ textTransform: "none", fontWeight: 600 }} />
            </Tabs>

            {filtered.length === 0 ? (
                <Card elevation={0} sx={{ p: 4, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                        В этой категории пока нет заявок
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {filtered.map((ord) => (
                        <Card key={ord.id} elevation={1} sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                                            Заявка #{ord.id}: {ord.carBrand || "Автомобиль"}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Клиент: {ord.name || "Клиент"} • {ord.phone}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={
                                            ord.status === "created"
                                                ? "Новая заявка"
                                                : ord.status === "in_progress"
                                                ? "В работе"
                                                : ord.status === "completed"
                                                ? "Выполнена"
                                                : "Отменена"
                                        }
                                        color={
                                            ord.status === "created"
                                                ? "primary"
                                                : ord.status === "in_progress"
                                                ? "warning"
                                                : ord.status === "completed"
                                                ? "success"
                                                : "default"
                                        }
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>

                                <Typography variant="body2" sx={{ my: 1.5, p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, color: "#334155" }}>
                                    {ord.description}
                                </Typography>

                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 2 }}>
                                    <Box sx={{ display: "flex", gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<MessageSquare size={16} />}
                                            onClick={() => navigate(`/cabinet/chats?orderId=${ord.id}`)}
                                        >
                                            Чат
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="text"
                                            href={`tel:${ord.phone}`}
                                            startIcon={<Phone size={16} />}
                                        >
                                            Позвонить
                                        </Button>
                                    </Box>

                                    <Box sx={{ display: "flex", gap: 1 }}>
                                        {ord.status === "created" && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                onClick={() => updateStatus(ord.id, "in_progress")}
                                            >
                                                Принять в работу
                                            </Button>
                                        )}
                                        {ord.status === "in_progress" && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="success"
                                                onClick={() => updateStatus(ord.id, "completed")}
                                            >
                                                Завершить работу
                                            </Button>
                                        )}
                                        {ord.status !== "cancelled" && ord.status !== "completed" && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                onClick={() => updateStatus(ord.id, "cancelled")}
                                            >
                                                Отклонить
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </DashboardLayout>
    );
};

export const Bookings = Applications;

// ──────────────────────────────────────────────
// CHATS
// ──────────────────────────────────────────────
export const Chats: React.FC = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        try {
            const res = await fetch("/api/chat-messages/order-1");
            const data = await res.json();
            setMessages(data);
        } catch {}
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const newMsg = {
            id: `msg-${Date.now()}`,
            orderId: "order-1",
            senderId: "master-1",
            senderRole: "master",
            text: inputMessage.trim(),
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMsg]);
        setInputMessage("");

        try {
            await fetch("/api/chat-messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMsg),
            });
        } catch {}
    };

    return (
        <DashboardLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Чат по заказу: Toyota Camry
            </Typography>

            <Paper elevation={1} sx={{ borderRadius: 3, display: "flex", flexDirection: "column", height: 500, overflow: "hidden" }}>
                {/* Message stream */}
                <Box sx={{ flex: 1, p: 2.5, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "#f8fafc" }}>
                    {messages.map((m) => {
                        const isMe = m.senderRole === "master";
                        return (
                            <Box
                                key={m.id}
                                sx={{
                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                    maxWidth: "75%",
                                    bgcolor: isMe ? "#1e40af" : "#ffffff",
                                    color: isMe ? "#ffffff" : "#0f172a",
                                    p: 1.5,
                                    borderRadius: 2,
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                }}
                            >
                                <Typography variant="caption" sx={{ display: "block", mb: 0.5, opacity: 0.8 }}>
                                    {isMe ? "Вы (Мастер)" : "Клиент"}
                                </Typography>
                                <Typography variant="body2">{m.text}</Typography>
                            </Box>
                        );
                    })}
                </Box>

                {/* Input area */}
                <Box
                    component="form"
                    onSubmit={handleSend}
                    sx={{ p: 1.5, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 1 }}
                >
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Напишите сообщение клиенту..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                    />
                    <Button type="submit" variant="contained" endIcon={<Send size={16} />}>
                        Отправить
                    </Button>
                </Box>
            </Paper>
        </DashboardLayout>
    );
};

// ──────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────
export const MasterSettings: React.FC = () => {
    const [profile, setProfile] = useState({
        fullName: "Алексей Смирнов",
        phone: "+7 (999) 111-22-33",
        address: "г. Москва, ул. Автозаводская, д. 15",
        workFrom: "09:00",
        workTo: "20:00",
        description: "Частный автомастер с 12-летним опытом. Компьютерная диагностика, ремонт ходовой, двигателей.",
        autoMarks: "Toyota, Lexus, Nissan, Kia, Hyundai",
        services: "Компьютерная диагностика, Замена масла, Ремонт тормозной системы, Ремонт подвески",
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Данные профиля мастера успешно сохранены!");
    };

    return (
        <DashboardLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Настройки профиля мастера
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Редактирование контактной информации, адреса и графика работы
            </Typography>

            <Paper elevation={1} sx={{ p: 3, borderRadius: 3, maxWidth: 640 }}>
                <form onSubmit={handleSave}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="ФИО / Имя мастера"
                            fullWidth
                            size="small"
                            value={profile.fullName}
                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        />
                        <TextField
                            label="Контактный телефон"
                            fullWidth
                            size="small"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                        <TextField
                            label="Адрес мастерской / бокса"
                            fullWidth
                            size="small"
                            value={profile.address}
                            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        />
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <TextField
                                label="Начало работы"
                                fullWidth
                                size="small"
                                value={profile.workFrom}
                                onChange={(e) => setProfile({ ...profile, workFrom: e.target.value })}
                            />
                            <TextField
                                label="Окончание работы"
                                fullWidth
                                size="small"
                                value={profile.workTo}
                                onChange={(e) => setProfile({ ...profile, workTo: e.target.value })}
                            />
                        </Box>
                        <TextField
                            label="Обслуживаемые марки автомобилей (через запятую)"
                            fullWidth
                            size="small"
                            value={profile.autoMarks}
                            onChange={(e) => setProfile({ ...profile, autoMarks: e.target.value })}
                        />
                        <TextField
                            label="Список услуг"
                            fullWidth
                            size="small"
                            value={profile.services}
                            onChange={(e) => setProfile({ ...profile, services: e.target.value })}
                        />
                        <TextField
                            label="Описание и опыт работы"
                            multiline
                            rows={3}
                            fullWidth
                            size="small"
                            value={profile.description}
                            onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                        />
                        <Button type="submit" variant="contained" startIcon={<Save size={18} />} sx={{ alignSelf: "flex-start" }}>
                            Сохранить изменения
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </DashboardLayout>
    );
};

export const AutoWashSettings = MasterSettings;
export const AutoServiceSettings = MasterSettings;
export const AutoShopSettings = MasterSettings;
export const Settings = MasterSettings;
export const ProfessionalCabinet = Dashboard;
export const ForBusiness = Dashboard;
export const Calendar: React.FC = () => (
    <DashboardLayout>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Календарь записей</Typography>
        <Typography variant="body2" color="text.secondary">Сетка записей по дням недели доступна для подтвержденных броней.</Typography>
    </DashboardLayout>
);
export const ActivityTypes = MasterSettings;
export const ActivityTypesSelection = MasterSettings;
export const AutoServiceRegistration = MasterSettings;
