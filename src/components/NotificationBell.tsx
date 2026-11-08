import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Box, Divider, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { http } from '@common/lib/http';

interface Notification {
    id: number;
    message: string;
    target_role: string;
    created_at: string;
}

export const NotificationBell: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const fetchNotifications = async () => {
        try {
            const role = isAdmin ? 'admin_all' : 'all';
            const { data } = await http.get<Notification[]>('/notifications', {
                params: { role },
            });
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 20000);
        return () => clearInterval(intervalId);
    }, [isAdmin]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await http.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Уведомление удалено');
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await http.delete('/notifications');
            setNotifications([]);
            toast.success('Все уведомления очищены');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <IconButton
                color="inherit"
                onClick={handleClick}
                aria-label="Уведомления"
                sx={{ mr: 0, width: 40, height: 40, color: "#334155" }}
            >
                <Badge badgeContent={notifications.length} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                disableScrollLock
                PaperProps={{
                    sx: { width: 350, maxHeight: 400 }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Уведомления</Typography>
                    {isAdmin && notifications.length > 0 && (
                        <Button size="small" color="error" onClick={handleClearAll}>
                            Очистить все
                        </Button>
                    )}
                </Box>
                <Divider />
                {notifications.length === 0 ? (
                    <MenuItem disabled>Нет новых уведомлений</MenuItem>
                ) : (
                    notifications.map((n) => (
                        <MenuItem key={n.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', whiteSpace: 'normal', py: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {n.message}
                                </Typography>
                                {isAdmin && (
                                    <IconButton size="small" color="error" onClick={(e) => handleDelete(n.id, e)} sx={{ ml: 1, mt: -0.5 }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {new Date(n.created_at).toLocaleString('ru-RU')} • Для: {n.target_role === 'all' ? 'Всех' : n.target_role}
                            </Typography>
                        </MenuItem>
                    ))
                )}
            </Menu>
        </>
    );
};
