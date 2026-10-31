import React, { useEffect, useState } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Box, Divider, Button } from '@mui/material';
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

    // Persisted read notifications IDs (badge disappears once user opens them)
    const [readIds, setReadIds] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('read_notification_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Persisted cleared notifications IDs
    const [clearedIds, setClearedIds] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('cleared_notification_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const fetchNotifications = async () => {
        try {
            const role = isAdmin ? 'admin_all' : 'all';
            const { data } = await http.get<Notification[]>('/notifications', {
                params: { role },
            });
            // Filter out notifications cleared by user
            let currentCleared: number[] = [];
            try {
                const saved = localStorage.getItem('cleared_notification_ids');
                if (saved) currentCleared = JSON.parse(saved);
            } catch {
                currentCleared = clearedIds;
            }
            const active = data.filter((n) => !currentCleared.includes(n.id));
            setNotifications(active);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 20000);
        return () => clearInterval(intervalId);
    }, [isAdmin]);

    // Unread count: notifications not yet in readIds
    const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);

        // Mark all current notifications as read so badge disappears
        if (notifications.length > 0) {
            const allCurrentIds = notifications.map((n) => n.id);
            const nextReadIds = Array.from(new Set([...readIds, ...allCurrentIds]));
            setReadIds(nextReadIds);
            try {
                localStorage.setItem('read_notification_ids', JSON.stringify(nextReadIds));
            } catch (e) {
                console.error("Failed to persist read notifications", e);
            }
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await http.delete(`/notifications/${id}`);
        } catch (err) {
            console.error(err);
        }
        const updatedCleared = Array.from(new Set([...clearedIds, id]));
        setClearedIds(updatedCleared);
        try {
            localStorage.setItem('cleared_notification_ids', JSON.stringify(updatedCleared));
        } catch {}
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success('Уведомление удалено');
    };

    const handleClearAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await http.delete('/notifications');
        } catch (err) {
            console.error(err);
        }
        const allIds = notifications.map((n) => n.id);
        const updatedCleared = Array.from(new Set([...clearedIds, ...allIds]));
        setClearedIds(updatedCleared);
        try {
            localStorage.setItem('cleared_notification_ids', JSON.stringify(updatedCleared));
        } catch {}
        setNotifications([]);
        toast.success('Уведомления очищены');
    };

    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHours < 1) {
                const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
                return `${diffMins} мин назад`;
            }
            if (diffHours < 24) {
                return `${diffHours} ч назад`;
            }
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <>
            <IconButton
                color="inherit"
                onClick={handleClick}
                aria-label="Уведомления"
                sx={{
                    width: 40,
                    height: 40,
                    color: "#475569",
                    borderRadius: "8px",
                    p: 0,
                    "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                }}
            >
                <Badge
                    badgeContent={unreadCount}
                    invisible={unreadCount === 0}
                    sx={{
                        "& .MuiBadge-badge": {
                            backgroundColor: "#EF4444",
                            color: "#FFFFFF",
                            fontSize: 10,
                            fontWeight: 700,
                            height: 16,
                            minWidth: 16,
                            padding: "0 4px",
                            borderRadius: "8px",
                            boxShadow: "0 0 0 2px #FFFFFF",
                            top: 2,
                            right: 2,
                        },
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                disableScrollLock
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    sx: {
                        width: 340,
                        maxWidth: '92vw',
                        maxHeight: 460,
                        borderRadius: '14px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #E2E8F0',
                        mt: 1,
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Header with Title and "Очистить" button */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: '#FFFFFF',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
                            Уведомления
                        </Typography>
                        {notifications.length > 0 && (
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    px: 1,
                                    py: 0.25,
                                    bgcolor: '#F1F5F9',
                                    color: '#475569',
                                    borderRadius: '10px',
                                }}
                            >
                                {notifications.length}
                            </Box>
                        )}
                    </Box>

                    {notifications.length > 0 && (
                        <Button
                            size="small"
                            onClick={handleClearAll}
                            sx={{
                                textTransform: 'none',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#EF4444',
                                px: 1,
                                py: 0.5,
                                minWidth: 'auto',
                                borderRadius: '6px',
                                '&:hover': {
                                    bgcolor: '#FEF2F2',
                                },
                            }}
                        >
                            Очистить
                        </Button>
                    )}
                </Box>

                <Divider sx={{ borderColor: '#F1F5F9' }} />

                {/* Notifications list or empty state */}
                <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ py: 5, px: 3, textAlign: 'center' }}>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    bgcolor: '#F1F5F9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 1.5,
                                    color: '#94A3B8',
                                }}
                            >
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#334155', mb: 0.5 }}>
                                Нет новых уведомлений
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
                                Здесь будут отображаться важные события и ответы мастеров
                            </Typography>
                        </Box>
                    ) : (
                        notifications.map((n) => (
                            <MenuItem
                                key={n.id}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    whiteSpace: 'normal',
                                    px: 2,
                                    py: 1.5,
                                    borderBottom: '1px solid #F8FAFC',
                                    '&:last-child': { borderBottom: 'none' },
                                    '&:hover': {
                                        bgcolor: '#F8FAFC',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', gap: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1E293B', lineHeight: 1.45, flex: 1 }}>
                                        {n.message}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDelete(n.id, e)}
                                        aria-label="Удалить уведомление"
                                        title="Удалить"
                                        sx={{
                                            color: '#94A3B8',
                                            p: 0.5,
                                            mt: -0.5,
                                            mr: -0.5,
                                            '&:hover': {
                                                color: '#EF4444',
                                                bgcolor: '#FEF2F2',
                                            },
                                        }}
                                    >
                                        <svg
                                            width="15"
                                            height="15"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </IconButton>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8 }}>
                                    <Typography sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                                        {formatTimestamp(n.created_at)}
                                    </Typography>
                                    {n.target_role && n.target_role !== 'all' && (
                                        <Box
                                            component="span"
                                            sx={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                px: 0.8,
                                                py: 0.2,
                                                bgcolor: '#F1F5F9',
                                                color: '#64748B',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            {n.target_role === 'master' ? 'Мастер' : n.target_role}
                                        </Box>
                                    )}
                                </Box>
                            </MenuItem>
                        ))
                    )}
                </Box>
            </Menu>
        </>
    );
};
