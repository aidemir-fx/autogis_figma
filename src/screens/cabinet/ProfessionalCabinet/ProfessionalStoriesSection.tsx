import { useState, type ChangeEvent } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    addStoryToHighlight,
    deleteStory,
    fetchAuthorHighlights,
    fetchAuthorStories,
    removeStoryFromHighlight,
    type Story,
} from "@modules/stories";
import { StoryCanvas } from "@modules/stories/components/StoryCanvas";
import { StoryComposer } from "@modules/stories/components/StoryComposer";
import { StoryHighlights } from "@modules/stories/components/StoryHighlights";
import { StoryViewer } from "@modules/stories/components/StoryViewer";

type ProfessionalStoriesSectionProps = {
    authorId: string;
};

function getStoryLabel(story: Story, index: number) {
    const text = story.frames
        .find((frame) => frame.text?.trim())
        ?.text?.trim()
        ?.split("\n")[0];

    if (text) {
        return text.length > 18 ? `${text.slice(0, 17)}…` : text;
    }

    return `Фото ${index + 1}`;
}

function StoryThumb({ story }: { story: Story }) {
    return (
        <Box
            sx={{
                width: 60,
                height: 60,
                borderRadius: "17px",
                overflow: "hidden",
                background: story.frames[0]?.background || "#1d4ed8",
            }}
        >
            {story.frames[0] ? <StoryCanvas frame={story.frames[0]} /> : null}
        </Box>
    );
}

export function ProfessionalStoriesSection({ authorId }: ProfessionalStoriesSectionProps) {
    const queryClient = useQueryClient();
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [highlightTitle, setHighlightTitle] = useState("");
    const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);

    const activeStoriesQuery = useQuery({
        queryKey: ["stories", "author", authorId],
        queryFn: () => fetchAuthorStories(authorId),
        staleTime: 30_000,
    });
    const highlightsQuery = useQuery({
        queryKey: ["stories", "highlights", authorId],
        queryFn: () => fetchAuthorHighlights(authorId),
        staleTime: 60_000,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStory,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "author", authorId] });
            void queryClient.invalidateQueries({ queryKey: ["stories", "home"] });
            setSelectedStory(null);
            toast.success("Объявление удалено");
        },
        onError: () => toast.error("Не удалось удалить объявление"),
    });

    const highlightMutation = useMutation({
        mutationFn: () => addStoryToHighlight(selectedStory!.id, highlightTitle.trim()),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", authorId] });
            void queryClient.invalidateQueries({ queryKey: ["stories", "author", authorId] });
            setSelectedStory(null);
            setHighlightDialogOpen(false);
            setHighlightTitle("");
            toast.success("Объявление добавлено в актуальные акции");
        },
        onError: () => toast.error("Не удалось сохранить объявление в актуальные акции"),
    });

    const removeHighlightMutation = useMutation({
        mutationFn: ({ storyId, highlightId }: { storyId: string; highlightId: string }) =>
            removeStoryFromHighlight(storyId, highlightId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", authorId] });
            toast.success("Объявление убрано из актуальных акций");
        },
        onError: () => toast.error("Не удалось убрать объявление из подборки"),
    });

    const stories = activeStoriesQuery.data ?? [];

    return (
        <Box
            sx={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                p: { xs: 1.75, sm: 2 },
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.25 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", bgcolor: "#e0f2fe", color: "#0284c7" }}>
                        <AutoStoriesRoundedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>Объявления</Typography>
                    </Box>
                </Box>
                <Typography sx={{ color: "#64748b", fontSize: 11, whiteSpace: "nowrap" }}>
                    {stories.length}/10
                </Typography>
            </Box>

            {activeStoriesQuery.isLoading ? (
                <Box sx={{ minHeight: 72, display: "grid", placeItems: "center" }}>
                    <CircularProgress size={22} />
                </Box>
            ) : (
                <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 0.5, mx: -0.25, px: 0.25, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                    <StoryComposer authorId={authorId} compact />
                    {stories.map((story, index) => (
                        <Box
                            key={story.id}
                            component="button"
                            type="button"
                            onClick={() => {
                                setSelectedStory(story);
                                setHighlightTitle("");
                            }}
                            aria-label={`Управление объявлением: ${getStoryLabel(story, index)}`}
                            sx={{
                                width: 66,
                                flex: "0 0 66px",
                                border: 0,
                                background: "transparent",
                                p: 0,
                                cursor: "pointer",
                                textAlign: "center",
                                font: "inherit",
                            }}
                        >
                            <Box sx={{ width: 60, height: 60, mx: "auto", p: "2.5px", borderRadius: "20px", background: "linear-gradient(135deg, #ff6a00, #f43f5e, #0284c7)" }}>
                                <StoryThumb story={story} />
                            </Box>
                            <Typography sx={{ mt: 0.5, color: "#0f172a", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {getStoryLabel(story, index)}
                            </Typography>
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.35, color: "#64748b", fontSize: 10 }}>
                                <VisibilityOutlinedIcon sx={{ fontSize: 12 }} />
                                {story.viewCount ?? 0}
                            </Box>
                        </Box>
                    ))}
                </Stack>
            )}

            <StoryHighlights authorId={authorId} compact manage />

            <StoryViewer
                groups={selectedStory ? [[selectedStory]] : []}
                initialGroupIndex={0}
                open={Boolean(selectedStory)}
                onClose={() => setSelectedStory(null)}
                footer={selectedStory ? (
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ width: "100%", maxWidth: 560, mx: "auto" }}
                    >
                        {highlightsQuery.data
                            ?.filter((highlight) => highlight.stories.some((story) => story.id === selectedStory.id))
                            .map((highlight) => (
                                <Button
                                    key={highlight.id}
                                    fullWidth
                                    color="error"
                                    variant="contained"
                                    startIcon={<DeleteOutlineRoundedIcon />}
                                    disabled={deleteMutation.isPending || highlightMutation.isPending || removeHighlightMutation.isPending}
                                    onClick={() => removeHighlightMutation.mutate({
                                        storyId: selectedStory.id,
                                        highlightId: highlight.id,
                                    })}
                                    sx={{ minHeight: 44 }}
                                >
                                    Убрать из «{highlight.title}"
                                </Button>
                            ))}
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<AutoStoriesRoundedIcon />}
                            disabled={deleteMutation.isPending || highlightMutation.isPending || removeHighlightMutation.isPending}
                            onClick={() => {
                                setHighlightTitle("");
                                setHighlightDialogOpen(true);
                            }}
                            sx={{ minHeight: 44 }}
                        >
                            В актуальные акции
                        </Button>
                        <Button
                            fullWidth
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlineRoundedIcon />}
                            disabled={deleteMutation.isPending || highlightMutation.isPending || removeHighlightMutation.isPending}
                            onClick={() => deleteMutation.mutate(selectedStory.id)}
                            sx={{ minHeight: 44, backgroundColor: "rgba(255,255,255,.96)" }}
                        >
                            Удалить
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setSelectedStory(null)}
                            sx={{ minHeight: 44, color: "white", borderColor: "rgba(255,255,255,.75)" }}
                        >
                            Отмена
                        </Button>
                    </Stack>
                ) : null}
            />

            <Dialog
                open={highlightDialogOpen}
                onClose={() => setHighlightDialogOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Добавить в актуальные акции</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                            Выберите существующую подборку или создайте новую. Объявление будет доступно в ней после публикации.
                        </Typography>

                        {highlightsQuery.data && highlightsQuery.data.length > 0 ? (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                                    Существующие подборки
                                </Typography>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                    {highlightsQuery.data.map((highlight) => {
                                        const includesStory = Boolean(
                                            selectedStory && highlight.stories.some((story) => story.id === selectedStory.id),
                                        );
                                        return (
                                            <Stack key={highlight.id} direction="row" spacing={0.5} alignItems="center">
                                                <Button
                                                    size="small"
                                                    variant={highlightTitle === highlight.title ? "contained" : "outlined"}
                                                    onClick={() => setHighlightTitle(highlight.title)}
                                                >
                                                    {highlight.title}
                                                </Button>
                                                {includesStory ? (
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        variant="text"
                                                        onClick={() => removeHighlightMutation.mutate({ storyId: selectedStory!.id, highlightId: highlight.id })}
                                                        disabled={removeHighlightMutation.isPending}
                                                        sx={{ minWidth: 0, px: 0.5 }}
                                                    >
                                                        Убрать
                                                    </Button>
                                                ) : null}
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        ) : null}

                        <Button
                            variant="outlined"
                            startIcon={<AddRoundedIcon />}
                            onClick={() => setHighlightTitle("")}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Создать новую подборку
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            Название подборки
                        </Typography>
                        <Box
                            component="input"
                            autoFocus
                            value={highlightTitle}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setHighlightTitle(event.target.value.slice(0, 48))}
                            placeholder="Акции, Работы, Новости"
                            sx={{ width: "100%", minHeight: 46, px: 1.25, border: "1px solid #cbd5e1", borderRadius: 1.5, font: "inherit", boxSizing: "border-box" }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setHighlightDialogOpen(false)}>Отмена</Button>
                    <Button
                        variant="contained"
                        disabled={!highlightTitle.trim() || highlightMutation.isPending || deleteMutation.isPending || removeHighlightMutation.isPending}
                        onClick={() => highlightMutation.mutate()}
                    >
                        Добавить
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
