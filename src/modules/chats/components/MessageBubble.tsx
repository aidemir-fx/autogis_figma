import React from "react";
import { Box, IconButton, TextField, Typography } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { ChatMessage } from "@modules/chats/api";

type MessageBubbleProps = {
    message: ChatMessage;
    isMine: boolean;
    footer: string;
    onEditMessage?: (messageId: string, nextText: string) => void;
};

function StatusIcon({ status }: { status: ChatMessage["status"] }) {
    if (status === "sent") {
        return (
            <DoneIcon
                sx={{ fontSize: 14, color: "rgba(255,255,255,0.75)", ml: 0.3, flexShrink: 0 }}
            />
        );
    }
    if (status === "delivered") {
        return (
            <DoneAllIcon
                sx={{ fontSize: 14, color: "rgba(255,255,255,0.75)", ml: 0.3, flexShrink: 0 }}
            />
        );
    }
    // read
    return (
        <DoneAllIcon
            sx={{ fontSize: 14, color: "#ffffff", ml: 0.3, flexShrink: 0 }}
        />
    );
}

export function MessageBubble(props: MessageBubbleProps) {
    const { message, isMine, footer, onEditMessage } = props;
    const [isEditing, setIsEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(message.message);

    React.useEffect(() => {
        setDraft(message.message);
    }, [message.message]);

    const handleSave = () => {
        const trimmed = draft.trim();
        if (!trimmed || !onEditMessage) return;
        onEditMessage(message.id, trimmed);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setDraft(message.message);
        setIsEditing(false);
    };

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
            }}
        >
            <Box sx={{ maxWidth: "82%" }}>
                {isEditing ? (
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: "18px",
                            backgroundColor: "#ffffff",
                            boxShadow: "0 1px 2px rgba(30,40,70,0.05)",
                            border: "1px solid #dfe7ff",
                            minWidth: 220,
                        }}
                    >
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            size="small"
                            sx={{
                                mb: 1,
                                "& .MuiInputBase-root": {
                                    borderRadius: "12px",
                                },
                            }}
                        />
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                            <IconButton onClick={handleCancel} size="small" aria-label="Отмена">
                                <CloseRoundedIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={handleSave} size="small" color="primary" aria-label="Сохранить">
                                <CheckRoundedIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            borderRadius: isMine
                                ? "20px 20px 6px 20px"
                                : "20px 20px 20px 6px",
                            background: isMine
                                ? "linear-gradient(135deg, #4a7cff 0%, #3b82f6 100%)"
                                : "#ffffff",
                            color: isMine ? "#ffffff" : "#222738",
                            boxShadow: isMine
                                ? "0 6px 16px -6px rgba(59,130,246,0.4)"
                                : "0 1px 2px rgba(30,40,70,0.05)",
                            position: "relative",
                        }}
                    >
                        {isMine && onEditMessage && (
                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mb: 0.5 }}>
                                <IconButton onClick={() => setIsEditing(true)} size="small" sx={{ color: "rgba(255,255,255,0.8)", p: 0.35 }} aria-label="Редактировать">
                                    <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        )}

                        <Typography
                            sx={{
                                fontSize: 15,
                                fontWeight: 500,
                                lineHeight: 1.4,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {message.message}
                            {message.isEdited && (
                                <Box component="span" sx={{ fontSize: 10, opacity: 0.75, ml: 0.4 }}>
                                    • изменено
                                </Box>
                            )}
                        </Typography>

                        {isMine && (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    mt: 0.4,
                                    gap: 0.3,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 10.5,
                                        color: "rgba(255,255,255,0.8)",
                                        lineHeight: 1,
                                        fontWeight: 500,
                                    }}
                                >
                                    {footer.split(" • ")[0]}
                                </Typography>
                                <StatusIcon status={message.status} />
                            </Box>
                        )}
                    </Box>
                )}

                {!isMine && (
                    <Typography
                        sx={{
                            mt: 0.4,
                            px: 1,
                            fontSize: 10.5,
                            color: "#7b8291",
                            textAlign: "left",
                            fontWeight: 500,
                        }}
                    >
                        {footer}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
