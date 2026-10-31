import { Box, IconButton, InputBase } from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

type ChatInputProps = {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    isSending: boolean;
};

export function ChatInput(props: ChatInputProps) {
    const { value, onChange, onBlur, isSending } = props;
    const isDisabled = !value.trim() || isSending;

    return (
        <>
            <Box
                sx={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    px: 1.75,
                    py: 0.25,
                    display: "flex",
                    alignItems: "center",
                    minHeight: 44,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
            >
                <InputBase
                    fullWidth
                    placeholder="Сообщение…"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    multiline
                    maxRows={5}
                    sx={{
                        fontSize: 14.5,
                        fontWeight: 500,
                        color: "#262626",
                        lineHeight: 1.4,
                        "& ::placeholder": {
                            color: "#7b8291",
                            opacity: 1,
                        },
                    }}
                />
            </Box>

            <IconButton
                type="submit"
                disabled={isDisabled}
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #4a7cff 0%, #3b82f6 100%)",
                    boxShadow: "0 6px 14px -4px rgba(59,130,246,0.45)",
                    transition: "transform .15s ease, box-shadow .15s ease",
                    "&:hover": {
                        background:
                            "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        transform: "translateY(-1px)",
                    },
                    "&.Mui-disabled": {
                        background:
                            "linear-gradient(135deg, #c8d7ff 0%, #b4caff 100%)",
                        color: "#ffffff",
                        boxShadow: "none",
                    },
                }}
            >
                <SendRoundedIcon fontSize="small" />
            </IconButton>
        </>
    );
}
