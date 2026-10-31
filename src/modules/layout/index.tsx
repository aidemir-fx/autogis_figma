import React, { useState, useEffect } from "react";
import {
    Paper,
    BottomNavigation,
    BottomNavigationAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
} from "@mui/material";
import {
    MapPin,
    Calendar,
    MessageSquare,
    User,
    CheckCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export const BottomNavigationBar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getCurrentValue = () => {
        const path = location.pathname;
        if (path === "/" || path.startsWith("/master") || path.startsWith("/provider")) return 0;
        if (path.startsWith("/cabinet/applications") || path.startsWith("/cabinet/bookings")) return 1;
        if (path.startsWith("/cabinet/chats")) return 2;
        if (path.startsWith("/cabinet") || path === "/login" || path === "/register") return 3;
        return 0;
    };

    return (
        <Paper
            sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                borderTop: "1px solid #e2e8f0",
            }}
            elevation={3}
        >
            <BottomNavigation
                showLabels
                value={getCurrentValue()}
                onChange={(_, newValue) => {
                    if (newValue === 0) navigate("/");
                    else if (newValue === 1) navigate("/cabinet/applications");
                    else if (newValue === 2) navigate("/cabinet/chats");
                    else if (newValue === 3) navigate("/cabinet");
                }}
                sx={{ height: 60 }}
            >
                <BottomNavigationAction
                    label="Карта"
                    icon={<MapPin size={20} />}
                />
                <BottomNavigationAction
                    label="Заявки"
                    icon={<Calendar size={20} />}
                />
                <BottomNavigationAction
                    label="Чаты"
                    icon={<MessageSquare size={20} />}
                />
                <BottomNavigationAction
                    label="Кабинет"
                    icon={<User size={20} />}
                />
            </BottomNavigation>
        </Paper>
    );
};

export const WelcomeModal: React.FC = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem("autogis_welcome_dismissed");
        if (!dismissed) {
            setOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("autogis_welcome_dismissed", "true");
        setOpen(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                Добро пожаловать в AutoGIS! 🚗
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Сервис быстрого поиска автомастеров, проверенных автосервисов, моек и магазинов автозапчастей на карте города.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CheckCircle size={18} color="#10b981" />
                        <Typography variant="body2">Ищите специалистов прямо на карте рядом с вами</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CheckCircle size={18} color="#10b981" />
                        <Typography variant="body2">Создавайте заявки и отправляйте фото поломки</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CheckCircle size={18} color="#10b981" />
                        <Typography variant="body2">Общайтесь в удобном чате и согласовывайте визит</Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} variant="contained" fullWidth>
                    Понятно, начать поиск
                </Button>
            </DialogActions>
        </Dialog>
    );
};
