import { FormEvent, RefObject } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import { useNavigate } from "react-router-dom";
import { ChatMessage, ChatUser, OrderChatResponse } from "@modules/chats/api";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { OrderPreviewCard } from "./OrderPreviewCard";
import { OrderReviewPrompt } from "@modules/reviews";

type ChatRoomProps = {
    companion: ChatUser;
    isOnline: boolean;
    onBack: () => void;
    isLoading: boolean;
    orderChat: OrderChatResponse | undefined;
    profileId: string;
    isTypingVisible: boolean;
    messagesEndRef: RefObject<HTMLDivElement>;
    messageValue: string;
    onMessageChange: (value: string) => void;
    onMessageBlur: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    isSending: boolean;
    formatRelativeTime: (value: string) => string;
    getStatusLabel: (status: ChatMessage["status"]) => string;
    onEditMessage?: (messageId: string, nextText: string) => void;
    onArchiveChat?: () => void;
};

function formatDateDivider(value: string): string {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(date, today)) return "Сегодня";
    if (sameDay(date, yesterday)) return "Вчера";
    return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
    });
}

function toDateKey(value: string): string {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function ChatRoom(props: ChatRoomProps) {
    const {
        companion,
        isOnline,
        onBack,
        isLoading,
        orderChat,
        profileId,
        isTypingVisible,
        messagesEndRef,
        messageValue,
        onMessageChange,
        onMessageBlur,
        onSubmit,
        isSending,
        formatRelativeTime,
        getStatusLabel,
        onEditMessage,
        onArchiveChat,
    } = props;

    const order = orderChat?.order;
    const activityName = order?.activityType?.displayName || order?.activityType?.name;
    const navigate = useNavigate();

    const handleOpenOrder = () => {
        if (!order) return;
        const isCustomer = order.customer?.id === profileId;
        const path = isCustomer ? "/cabinet/bookings" : "/cabinet/applications";
        navigate(`${path}?orderId=${order.id}`);
    };

    return (
        <Box
            sx={{
                position: "relative",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                backgroundColor: "#f2f5fb",
                backgroundImage:
                    "radial-gradient(circle at 15% 0%, rgba(74,124,255,0.08), transparent 45%), radial-gradient(circle at 85% 100%, rgba(59,130,246,0.08), transparent 50%)",
            }}
        >
            <ChatHeader
                name={companion.name || companion.phone}
                avatarUrl={companion.avatarUrl}
                isOnline={isOnline}
                onBack={onBack}
                onArchiveChat={onArchiveChat}
            />

            {order && (activityName || order.carBrand) && (
                <Box
                    sx={{
                        mx: 1.5,
                        mt: 1.25,
                        px: 1.5,
                        py: 1.1,
                        borderRadius: "12px",
                        background:
                            "linear-gradient(135deg, rgba(74,124,255,0.10), rgba(59,130,246,0.05))",
                        border: "1px solid rgba(74,124,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                width: 26,
                                height: 26,
                                borderRadius: "8px",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                placeItems: "center",
                                color: "#3b82f6",
                                flexShrink: 0,
                            }}
                        >
                            <BuildRoundedIcon sx={{ fontSize: 14 }} />
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                color: "#1e40af",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {activityName && (
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {activityName}
                                </Box>
                            )}
                            {activityName && order.carBrand ? " · " : ""}
                            {order.carBrand}
                        </Typography>
                    </Stack>
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: "#1e40af",
                            fontWeight: 700,
                            flexShrink: 0,
                            letterSpacing: "0.02em",
                        }}
                    >
                        #{order.id.slice(0, 6).toUpperCase()}
                    </Typography>
                </Box>
            )}

            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    px: 1.5,
                    pt: 1.5,
                    pb: 1.5,
                }}
            >
                {isLoading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!isLoading && orderChat && (
                    <Stack spacing={0.75}>
                        {order && (
                            <Box sx={{ pt: 0.5, pb: 0.25 }}>
                                <OrderPreviewCard order={order} onOpen={handleOpenOrder} />
                                {order.status === "completed" &&
                                    order.customer?.id === profileId && (
                                        <OrderReviewPrompt orderId={order.id} variant="chat" />
                                    )}
                            </Box>
                        )}

                        {orderChat.messages.length === 0 && (
                            <Alert
                                severity="info"
                                sx={{
                                    borderRadius: "14px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e4e8f0",
                                }}
                            >
                                Чат создан. Напишите первое сообщение.
                            </Alert>
                        )}

                        {orderChat.messages.map((chatMessage, index) => {
                            const isMine = chatMessage.sender.id === profileId;
                            const footer = `${formatRelativeTime(chatMessage.createdAt)}${
                                isMine ? ` • ${getStatusLabel(chatMessage.status)}` : ""
                            }`;

                            const prev = orderChat.messages[index - 1];
                            const showDateDivider =
                                !prev ||
                                toDateKey(prev.createdAt) !== toDateKey(chatMessage.createdAt);

                            return (
                                <Box key={chatMessage.id}>
                                    {showDateDivider && (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "center",
                                                my: 1.25,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: "999px",
                                                    backgroundColor: "rgba(255,255,255,0.75)",
                                                    backdropFilter: "blur(8px)",
                                                    WebkitBackdropFilter: "blur(8px)",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "#5a6172",
                                                    border: "1px solid rgba(228,232,240,0.8)",
                                                }}
                                            >
                                                {formatDateDivider(chatMessage.createdAt)}
                                            </Box>
                                        </Box>
                                    )}
                                    <MessageBubble
                                        message={chatMessage}
                                        isMine={isMine}
                                        footer={footer}
                                        onEditMessage={onEditMessage}
                                    />
                                </Box>
                            );
                        })}

                        {isTypingVisible && (
                            <Box
                                sx={{
                                    display: "inline-flex",
                                    alignSelf: "flex-start",
                                    alignItems: "center",
                                    gap: 0.5,
                                    px: 2,
                                    py: 1.25,
                                    mt: 0.5,
                                    backgroundColor: "#ffffff",
                                    borderRadius: "20px 20px 20px 6px",
                                    boxShadow: "0 1px 2px rgba(30,40,70,0.05)",
                                }}
                            >
                                {[0, 1, 2].map((dotIndex) => (
                                    <Box
                                        key={dotIndex}
                                        sx={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "999px",
                                            backgroundColor: "#8892a6",
                                            animation:
                                                "chatTypingBounce 1.4s infinite ease-in-out",
                                            animationDelay: `${dotIndex * 0.18}s`,
                                            "@keyframes chatTypingBounce": {
                                                "0%, 60%, 100%": {
                                                    transform: "translateY(0)",
                                                    opacity: 0.5,
                                                },
                                                "30%": {
                                                    transform: "translateY(-4px)",
                                                    opacity: 1,
                                                },
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Stack>
                )}
            </Box>

            <Box
                component="form"
                onSubmit={onSubmit}
                sx={{
                    px: 1.5,
                    py: 1.25,
                    backgroundColor: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderTop: "1px solid rgba(228,232,240,0.6)",
                    display: "flex",
                    gap: 1,
                    alignItems: "flex-end",
                }}
            >
                <ChatInput
                    value={messageValue}
                    onChange={onMessageChange}
                    onBlur={onMessageBlur}
                    isSending={isSending}
                />
            </Box>
        </Box>
    );
}
