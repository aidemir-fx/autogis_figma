import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { markStoryViewed, reportStory, type Story, type StoryReportReason } from "../api";

import { StoryCanvas } from "./StoryCanvas";

type StoryViewerProps = {
    groups: Story[][];
    initialGroupIndex: number;
    open: boolean;
    onClose: () => void;
    footer?: ReactNode | ((story: Story) => ReactNode);
    onAction?: (actionType?: "book" | "call", story?: Story) => void;
};

const REPORT_OPTIONS: Array<{ value: StoryReportReason; label: string }> = [
    { value: "spam", label: "Спам" },
    { value: "abuse", label: "Оскорбление" },
    { value: "inappropriate", label: "Неприемлемый контент" },
    { value: "other", label: "Другое" },
];

export function StoryViewer({ groups, initialGroupIndex, open, onClose, footer, onAction }: StoryViewerProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // The feed is invalidated after marking a story as viewed. Keep the list
    // used by the current viewer stable, otherwise Instagram-like sorting can
    // move the next unseen author into the current numeric index and advance
    // through the whole feed without any user action.
    const [sessionGroups, setSessionGroups] = useState(groups);
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [frameIndex, setFrameIndex] = useState(0);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState<StoryReportReason>("spam");

    useEffect(() => {
        if (open) {
            setSessionGroups(groups);
            setGroupIndex(initialGroupIndex);
            setStoryIndex(0);
            setFrameIndex(0);
        }
        // `groups` is intentionally not a dependency: it can change after a
        // view is recorded, but the active viewer must remain on its snapshot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialGroupIndex, open]);

    const group = sessionGroups[groupIndex] ?? [];
    const story = group[storyIndex] ?? group[0];
    const frame = story?.frames[frameIndex] ?? story?.frames[0];

    useEffect(() => {
        if (open && story && new Date(story.expiresAt).getTime() > Date.now()) {
            void markStoryViewed(story.id)
                .then(() => queryClient.invalidateQueries({ queryKey: ["stories"] }))
                .catch(() => undefined);
        }
    }, [open, queryClient, story?.id]);

    const progress = useMemo(
        () => (story?.frames ?? []).map((_, index) => (index < frameIndex ? "done" : index === frameIndex ? "active" : "idle")),
        [frameIndex, story],
    );

    const goNext = () => {
        if (story && frameIndex < story.frames.length - 1) {
            setFrameIndex((value) => value + 1);
            return;
        }
        if (storyIndex < group.length - 1) {
            setStoryIndex((value) => value + 1);
            setFrameIndex(0);
            return;
        }
        if (groupIndex < sessionGroups.length - 1) {
            setGroupIndex((value) => value + 1);
            setStoryIndex(0);
            setFrameIndex(0);
            return;
        }
        onClose();
    };

    const goPrevious = () => {
        if (frameIndex > 0) {
            setFrameIndex((value) => value - 1);
            return;
        }
        if (storyIndex > 0) {
            const previousStory = group[storyIndex - 1];
            setStoryIndex((value) => value - 1);
            setFrameIndex(Math.max(previousStory.frames.length - 1, 0));
            return;
        }
        if (groupIndex > 0) {
            const previousGroup = sessionGroups[groupIndex - 1] ?? [];
            setGroupIndex((value) => value - 1);
            setStoryIndex(Math.max(previousGroup.length - 1, 0));
            setFrameIndex(Math.max((previousGroup[previousGroup.length - 1]?.frames.length ?? 1) - 1, 0));
        }
    };

    const submitReport = async () => {
        if (!story) return;
        try {
            await reportStory(story.id, reportReason);
            toast.success("Жалоба отправлена");
            setReportOpen(false);
        } catch {
            toast.error("Не удалось отправить жалобу");
        }
    };

    if (!story || !frame) return null;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen
                PaperProps={{ sx: { background: "#0b1020", color: "white" } }}
            >
                <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", pt: "env(safe-area-inset-top)", pb: "env(safe-area-inset-bottom)" }}>
                    <Box sx={{ display: "flex", gap: 0.5, p: 1.5, zIndex: 2 }}>
                        {progress.map((state, index) => (
                            <Box key={index} sx={{ height: 3, flex: 1, borderRadius: 2, background: state === "idle" ? "rgba(255,255,255,.35)" : "white" }} />
                        ))}
                    </Box>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        onClick={() => {
                            onClose();
                            navigate(`/master-details?id=${story.author.userId}&type=${story.author.role || "master"}`);
                        }}
                        sx={{ px: 2, pb: 1, zIndex: 2, cursor: "pointer", "&:hover": { opacity: 0.9 } }}
                    >
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: "#2563EB", color: "#ffffff", display: "grid", placeItems: "center", fontWeight: 800 }}>
                            {story.author.displayName.slice(0, 1).toUpperCase()}
                        </Box>
                        <Typography sx={{ fontWeight: 700, flex: 1 }}>{story.author.displayName} ↗</Typography>
                        <IconButton onClick={(e) => { e.stopPropagation(); setReportOpen(true); }} aria-label="Пожаловаться" sx={{ color: "white" }}>
                            <FlagOutlinedIcon />
                        </IconButton>
                        <IconButton onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Закрыть" sx={{ color: "white" }}>
                            <CloseRoundedIcon />
                        </IconButton>
                    </Stack>

                    <Box
                        aria-label="Переключение объявлений"
                        onClick={(event) => {
                            if ((event.target as HTMLElement).closest("button")) return;
                            const bounds = event.currentTarget.getBoundingClientRect();
                            if (event.clientX < bounds.left + bounds.width / 2) {
                                goPrevious();
                            } else {
                                goNext();
                            }
                        }}
                        sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", px: 2 }}
                    >
                        <IconButton onClick={goPrevious} aria-label="Предыдущее объявление" sx={{ position: "absolute", left: 8, zIndex: 2, color: "white", background: "rgba(0,0,0,.3)" }}>
                            <ArrowBackIosNewRoundedIcon />
                        </IconButton>
                        <Box sx={{ height: "100%", width: "100%", maxWidth: 440 }}>
                            <StoryCanvas key={frame.id} frame={frame} sound onPromoActionClick={(actionType) => onAction?.(actionType, story)} />
                        </Box>
                        <IconButton onClick={goNext} aria-label="Следующее объявление" sx={{ position: "absolute", right: 8, zIndex: 2, color: "white", background: "rgba(0,0,0,.3)" }}>
                            <ArrowForwardIosRoundedIcon />
                        </IconButton>
                    </Box>
                    {footer ? (
                        <Box sx={{ width: "100%", px: 2, pt: 1, pb: 2, zIndex: 2, boxSizing: "border-box", flexShrink: 0, position: "relative", background: "linear-gradient(180deg, rgba(11,16,32,0) 0%, rgba(11,16,32,.96) 24%)" }}>
                            {typeof footer === "function" ? footer(story) : footer}
                        </Box>
                    ) : null}
                </Box>
            </Dialog>

            <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Пожаловаться на объявление</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Выберите причину. Публикация будет передана команде АвтоГис.
                    </Typography>
                    <Select fullWidth value={reportReason} onChange={(event) => setReportReason(event.target.value as StoryReportReason)}>
                        {REPORT_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReportOpen(false)}>Отмена</Button>
                    <Button variant="contained" color="error" onClick={() => void submitReport()}>Отправить жалобу</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
