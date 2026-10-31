import React, { useState, useEffect } from "react";
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, Badge, CircularProgress, Divider, IconButton } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { http } from "@common/lib/http";
import dayjs from "dayjs";
import { SupportChat } from "./SupportChat";

interface SupportChatSummary {
    userId: string;
    userName: string;
    userPhone: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

export const AdminSupportList = ({ onBack }: { onBack?: () => void }) => {
    const [summaries, setSummaries] = useState<SupportChatSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await http.get("/support/chats");
                setSummaries(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchChats();
        
        // Simple polling for updates
        const interval = setInterval(fetchChats, 10000);
        return () => clearInterval(interval);
    }, []);

    if (selectedUser) {
        return (
            <Box height="100%" display="flex" flexDirection="column">
                <Box flex={1} overflow="hidden">
                    <SupportChat
                        targetUserId={selectedUser}
                        onBack={() => setSelectedUser(null)}
                    />
                </Box>
            </Box>
        );
    }

    if (isLoading) return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box height="100%" bgcolor="white" borderRadius={2} overflow="auto">
            <Box p={2} borderBottom="1px solid #e0e0e0" display="flex" alignItems="center" gap={1.5}>
                {onBack && (
                    <IconButton
                        aria-label="Назад"
                        onClick={onBack}
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "14px",
                            backgroundColor: "#f5f7fa",
                            color: "#262626",
                            "&:hover": { backgroundColor: "#eef2f6" },
                        }}
                    >
                        <ArrowBackRoundedIcon fontSize="small" />
                    </IconButton>
                )}
                <Typography variant="h6" fontWeight="bold">
                    Запросы в поддержку
                </Typography>
            </Box>
            <List disablePadding>
                {summaries.length === 0 ? (
                    <Typography p={3} textAlign="center" color="text.secondary">Нет обращений</Typography>
                ) : (
                    summaries.map((chat) => (
                        <React.Fragment key={chat.userId}>
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => setSelectedUser(chat.userId)}>
                                    <ListItemAvatar>
                                        <Badge badgeContent={chat.unreadCount} color="error">
                                            <Avatar><SupportAgentIcon /></Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText 
                                        primary={chat.userName || chat.userPhone || "Пользователь"} 
                                        secondary={chat.lastMessage} 
                                        primaryTypographyProps={{ fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal' }}
                                        secondaryTypographyProps={{ 
                                            noWrap: true, 
                                            fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal',
                                            color: chat.unreadCount > 0 ? 'text.primary' : 'text.secondary'
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {dayjs(chat.lastMessageAt).format("DD.MM HH:mm")}
                                    </Typography>
                                </ListItemButton>
                            </ListItem>
                            <Divider component="li" />
                        </React.Fragment>
                    ))
                )}
            </List>
        </Box>
    );
};
