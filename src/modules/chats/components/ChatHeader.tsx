import { Avatar, Box, IconButton, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { getAvatarGradient, getInitialLabel } from "./utils";

type ChatHeaderProps = {
    name: string;
    avatarUrl?: string | null;
    isOnline: boolean;
    onBack: () => void;
    onArchiveChat?: () => void;
};

export function ChatHeader(props: ChatHeaderProps) {
    const { name, avatarUrl, isOnline, onBack, onArchiveChat } = props;
    const avatarGradient = getAvatarGradient(name);

    return (
        <Box
            sx={{
                px: 1.5,
                py: 1.25,
                backgroundColor: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(228,232,240,0.6)",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                position: "relative",
                zIndex: 2,
            }}
        >
            <IconButton
                aria-label="Назад"
                onClick={onBack}
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "14px",
                    backgroundColor: "#ffffff",
                    color: "#262626",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    "&:hover": { backgroundColor: "#f7f7f8" },
                }}
            >
                <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>

            <Box sx={{ position: "relative" }}>
                <Avatar
                    src={avatarUrl ?? undefined}
                    alt={name}
                    variant="rounded"
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "16px",
                        background: avatarUrl ? "#d2d5dd" : avatarGradient,
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: 16,
                    }}
                >
                    {getInitialLabel(name)}
                </Avatar>
                {isOnline && (
                    <Box
                        sx={{
                            position: "absolute",
                            right: -2,
                            bottom: -2,
                            width: 12,
                            height: 12,
                            borderRadius: "999px",
                            backgroundColor: "#22c55e",
                            border: "2px solid #ffffff",
                        }}
                    />
                )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: 15,
                        letterSpacing: "-0.01em",
                        color: "#262626",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isOnline ? "#22c55e" : "#7b8291",
                        mt: "1px",
                    }}
                >
                    {isOnline ? "в сети" : "не в сети"}
                </Typography>
            </Box>

            {onArchiveChat && (
                <IconButton
                    aria-label="Архивировать чат"
                    onClick={onArchiveChat}
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "14px",
                        backgroundColor: "#ffffff",
                        color: "#475569",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        "&:hover": { backgroundColor: "#f7f7f8" },
                    }}
                >
                    <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>Архив</Typography>
                </IconButton>
            )}

            <IconButton
                aria-label="Позвонить"
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "14px",
                    backgroundColor: "#ffffff",
                    color: "#3b82f6",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    "&:hover": { backgroundColor: "#f7f7f8" },
                }}
            >
                <PhoneOutlinedIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}
