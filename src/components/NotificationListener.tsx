import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { http } from '@common/lib/http';

interface Notification {
    id: number;
    message: string;
    target_role: string;
    created_at: string;
}

export const NotificationListener: React.FC<{ userRole?: string }> = ({ userRole = 'all' }) => {
    // Read from localStorage to persist across reloads
    const [lastId, setLastId] = useState<number>(() => {
        const saved = localStorage.getItem('last_notification_id');
        return saved ? parseInt(saved, 10) : 0;
    });

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await http.get<Notification[]>('/notifications', {
                    params: { role: userRole },
                });
                const newNotifications = data.filter(n => n.id > lastId);

                if (newNotifications.length > 0) {
                    const newMaxId = Math.max(...data.map(n => n.id));
                    setLastId(newMaxId);
                    localStorage.setItem('last_notification_id', newMaxId.toString());

                    newNotifications.forEach(n => {
                        toast.info(`Уведомление: ${n.message}`, {
                            autoClose: false,
                            toastId: `notif-${n.id}`
                        });
                    });
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 20000);
        return () => clearInterval(intervalId);
    }, [userRole, lastId]);

    return null;
};
