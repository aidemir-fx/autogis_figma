import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, TextField, IconButton, Typography, CircularProgress, Paper, Avatar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { http } from "@common/lib/http";
import { useUserProfile } from "@common/hooks";
import { playNotificationSound } from "@common/lib/sound";
import { getRealtimeBaseURL } from "@common/lib/http";
import dayjs from "dayjs";

interface SupportMessage {
    id: string;
    userId: string;
    senderId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export const SupportChat = ({
    targetUserId,
    onBack,
}: {
    targetUserId?: string;
    onBack?: () => void;
}) => {
    const navigate = useNavigate();
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/cabinet");
        }
    };
    const { profile } = useUserProfile();
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const fetchMessages = async () => {
        try {
            const url = targetUserId ? `/support/chat?userId=${targetUserId}` : `/support/chat`;
            const res = await http.get(url);
            setMessages(res.data);
            setIsLoading(false);
            scrollToBottom();
        } catch (e) {
            console.error("Failed to fetch support chat", e);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        
        // Setup WS for support chat specifically
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            const base = getRealtimeBaseURL().replace(/^http/, "ws");
            const ws = new WebSocket(`${base}/ws/chat`, ["bearer", accessToken]);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const envelope = JSON.parse(event.data);
                    if (envelope.event === "new_support_message") {
                        playNotificationSound();
                        setMessages((prev) => {
                            if (prev.some(m => m.id === envelope.data.id)) return prev;
                            return [...prev, envelope.data as SupportMessage];
                        });
                        scrollToBottom();
                    }
                } catch (e) {}
            };
        }

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [targetUserId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const msgText = inputValue;
        setInputValue("");

        try {
            const res = await http.post("/support/chat", {
                message: msgText,
                userId: targetUserId
            });
            // We append immediately for snappy UI
            setMessages((prev) => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            scrollToBottom();
        } catch (e) {
            console.error("Failed to send message", e);
        }
    };

    if (isLoading) return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box display="flex" flexDirection="column" height="100%" bgcolor="#f5f7fa" borderRadius={2} overflow="hidden">
            <Box
                p={2}
                bgcolor="white"
                borderBottom="1px solid #e0e0e0"
                display="flex"
                alignItems="center"
                gap={1.5}
            >
                <IconButton
                    aria-label="Назад"
                    onClick={handleBack}
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
                <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
                    <SupportAgentIcon />
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
                        Служба поддержки
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {targetUserId ? "Диалог с пользователем" : "Онлайн-помощь и консультации"}
                    </Typography>
                </Box>
            </Box>

            <Box flex={1} overflow="auto" p={2} display="flex" flexDirection="column" gap={2}>
                {messages.length === 0 ? (
                    <Typography textAlign="center" color="text.secondary" mt={4}>
                        Напишите нам, если у вас возникли вопросы или проблемы.
                    </Typography>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.senderId === profile?.id;
                        return (
                            <Box key={msg.id} display="flex" justifyContent={isMine ? "flex-end" : "flex-start"}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        maxWidth: "75%",
                                        bgcolor: isMine ? "primary.main" : "white",
                                        color: isMine ? "white" : "text.primary",
                                        borderRadius: 2,
                                        borderTopRightRadius: isMine ? 4 : 16,
                                        borderTopLeftRadius: !isMine ? 4 : 16,
                                    }}
                                >
                                    <Typography variant="body1">{msg.message}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5, textAlign: 'right' }}>
                                        {dayjs(msg.createdAt).format("HH:mm")}
                                    </Typography>
                                </Paper>
                            </Box>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </Box>

            <Box component="form" onSubmit={handleSend} p={2} bgcolor="white" borderTop="1px solid #e0e0e0" display="flex" gap={1}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Введите сообщение..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoComplete="off"
                />
                <IconButton color="primary" type="submit" disabled={!inputValue.trim()}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Box>
    );
};
