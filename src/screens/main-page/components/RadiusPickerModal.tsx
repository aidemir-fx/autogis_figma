import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Radio,
} from "@mui/material";
import { styled } from "styled-components";
import { CrossIcon } from "@common/icons";

interface RadiusPickerModalProps {
    open: boolean;
    onClose: () => void;
    currentRadius: number;
    onSelectRadius: (radius: number) => void;
}

const RADIUS_OPTIONS = [
    { value: 5, label: "5 км", hint: "Рядом, пешая доступность" },
    { value: 10, label: "10 км", hint: "Ближайший район" },
    { value: 25, label: "25 км", hint: "В пределах города" },
    { value: 50, label: "50 км", hint: "Город и пригород (рекомендуется)" },
    { value: 100, label: "100 км", hint: "Вся область и регион" },
];

const OptionItem = styled.div<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    margin-bottom: 8px;
    border-radius: 14px;
    border: 1.5px solid ${({ $selected }) => ($selected ? "#2563eb" : "#e5e7eb")};
    background: ${({ $selected }) => ($selected ? "#eff6ff" : "#ffffff")};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: #3b82f6;
    }

    &:last-child {
        margin-bottom: 0;
    }
`;

const OptionText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OptionTitle = styled.span<{ $selected: boolean }>`
    font-size: 15px;
    font-weight: 700;
    color: ${({ $selected }) => ($selected ? "#1d4ed8" : "#111827")};
`;

const OptionHint = styled.span`
    font-size: 12px;
    color: #6b7280;
`;

export const RadiusPickerModal = ({
    open,
    onClose,
    currentRadius,
    onSelectRadius,
}: RadiusPickerModalProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: "20px",
                    p: 1,
                    m: 2,
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pb: 1,
                    pt: 1.5,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 18 }}>
                    Радиус поиска
                </Typography>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{ color: "#6b7280" }}
                    aria-label="Закрыть"
                >
                    <CrossIcon style={{ width: 14, height: 14 }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 1, pb: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {RADIUS_OPTIONS.map((opt) => {
                        const isSelected = currentRadius === opt.value;
                        return (
                            <OptionItem
                                key={opt.value}
                                $selected={isSelected}
                                onClick={() => {
                                    onSelectRadius(opt.value);
                                    onClose();
                                }}
                            >
                                <OptionText>
                                    <OptionTitle $selected={isSelected}>
                                        {opt.label}
                                    </OptionTitle>
                                    <OptionHint>{opt.hint}</OptionHint>
                                </OptionText>
                                <Radio
                                    checked={isSelected}
                                    size="small"
                                    sx={{
                                        p: 0,
                                        color: isSelected ? "#2563eb" : "#cbd5e1",
                                        "&.Mui-checked": {
                                            color: "#2563eb",
                                        },
                                    }}
                                />
                            </OptionItem>
                        );
                    })}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
