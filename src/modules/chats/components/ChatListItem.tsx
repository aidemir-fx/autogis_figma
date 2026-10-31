import { Avatar, Badge, Box, Paper, Stack, Typography } from "@mui/material";
import { ChatMessage, ChatOrder } from "@modules/chats/api";
import { getAvatarGradient, getCompanion, getInitialLabel } from "./utils";

type ChatListItemProps = {
    order: ChatOrder;
    profileId: string;
    lastMessage?: ChatMessage;
    unreadCount: number;
    onOpen: (orderId: string) => void;
    formatRelativeTime: (value: string) => string;
};

export function ChatListItem(props: ChatListItemProps) {
    const { order, profileId, lastMessage, unreadCount, onOpen, formatRelativeTime } = props;
    const companion = getCompanion(order, profileId);
    const displayName = companion.name || companion.phone;
    const avatarGradient = getAvatarGradient(displayName + companion.id);
    const previewText =
        lastMessage?.message || order.description || "Откройте чат";
    const isMineLast = lastMessage && lastMessage.sender.id === profileId;

    return (
        <Paper
            elevation={0}
            onClick={() => onOpen(order.id)}
            sx={{
                p: 1.5,
                borderRadius: "18px",
                cursor: "pointer",
                backgroundColor: "#ffffff",
                border: "1px solid transparent",
                transition:
                    "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
                "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 16px -8px rgba(30,40,70,0.18)",
                    borderColor: "#e4e8f0",
                },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                        src={companion.avatarUrl ?? undefined}
                        alt={displayName}
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "18px",
                            background: companion.avatarUrl ? "#d2d5dd" : avatarGradient,
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: 17,
                            letterSpacing: "-0.01em",
                        }}
                        variant="rounded"
                    >
                        {getInitialLabel(displayName)}
                    </Avatar>
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 0.3 }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: "#212737",
                                letterSpacing: "-0.01em",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {displayName}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: "#7b8291",
                                flexShrink: 0,
                                fontWeight: 500,
                            }}
                        >
                            {formatRelativeTime(lastMessage?.createdAt || order.createdAt)}
                        </Typography>
                    </Stack>

                    <Typography
                        sx={{
                            fontSize: 13,
                            color: "#5a6172",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                        }}
                    >
                        {isMineLast && (
                            <Box component="span" sx={{ color: "#262626", fontWeight: 600 }}>
                                Вы:{" "}
                            </Box>
                        )}
                        {previewText}
                    </Typography>
                </Box>

                <Stack
                    direction="column"
                    alignItems="flex-end"
                    spacing={0.8}
                    sx={{ flexShrink: 0 }}
                >
                    {order.carBrand && (
                        <Box
                            component="span"
                            sx={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#475569",
                                backgroundColor: "#f1f5f9",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                maxWidth: 90,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {order.carBrand}
                        </Box>
                    )}
                    {unreadCount > 0 && (
                        <Badge
                            badgeContent={unreadCount}
                            sx={{
                                "& .MuiBadge-badge": {
                                    position: "static",
                                    transform: "none",
                                    minWidth: 20,
                                    height: 20,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    background:
                                        "linear-gradient(135deg, #4a7cff 0%, #3b82f6 100%)",
                                    color: "#ffffff",
                                    boxShadow: "0 4px 10px -2px rgba(59,130,246,0.4)",
                                    padding: "0 6px",
                                },
                            }}
                        />
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}
