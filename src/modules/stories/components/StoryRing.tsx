import { ReactNode } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { toast } from "react-toastify";
import { addStoryToHighlight, deleteStory, fetchAuthorHighlights, fetchAuthorStories, removeStoryFromHighlight, type Story } from "../api";
import { StoryViewer } from "./StoryViewer";

type StoryRingProps = {
    authorId?: string;
    children: ReactNode;
    size?: number;
    interactive?: boolean;
    manage?: boolean;
};

const NEW_STORY_COLORS = ["#2563eb", "#7c3aed", "#ec4899"];

/** Draw one continuous ring for one story and separated Instagram-like arcs for several. */
export function getStoryRingBackground(stories: Story[]): string {
    if (stories.length === 0) return "transparent";
    const colors = stories.map((story, index) => story.isViewed ? "#cbd5e1" : NEW_STORY_COLORS[index % NEW_STORY_COLORS.length]);
    if (stories.length === 1) return colors[0];

    const segment = 360 / stories.length;
    const gap = Math.min(6, segment * 0.18);
    const stops = stories.flatMap((_, index) => {
        const start = index * segment;
        const end = (index + 1) * segment;
        return [
            `${colors[index]} ${start + gap / 2}deg ${end - gap / 2}deg`,
            `transparent ${end - gap / 2}deg ${end}deg`,
        ];
    });

    return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

/** Instagram-like square story outline used around existing profile avatars. */
export function StoryRing({ authorId, children, size, interactive = false, manage = false }: StoryRingProps) {
    const queryClient = useQueryClient();
    const [viewerOpen, setViewerOpen] = useState(false);
    const [highlightStory, setHighlightStory] = useState<Story | null>(null);
    const [highlightTitle, setHighlightTitle] = useState("");
    const query = useQuery({
        queryKey: ["stories", "author", authorId],
        queryFn: () => fetchAuthorStories(authorId!),
        enabled: Boolean(authorId),
        staleTime: 30_000,
    });
    const stories = query.data ?? [];
    const hasStories = stories.length > 0;
    const highlightsQuery = useQuery({
        queryKey: ["stories", "highlights", authorId],
        queryFn: () => fetchAuthorHighlights(authorId!),
        enabled: Boolean(authorId && manage),
        staleTime: 60_000,
    });
    const deleteMutation = useMutation({
        mutationFn: deleteStory,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "author", authorId] });
            void queryClient.invalidateQueries({ queryKey: ["stories", "home"] });
            setHighlightStory(null);
            setViewerOpen(false);
            toast.success("Объявление удалено");
        },
        onError: () => toast.error("Не удалось удалить объявление"),
    });
    const highlightMutation = useMutation({
        mutationFn: () => addStoryToHighlight(highlightStory!.id, highlightTitle.trim()),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", authorId] });
            setHighlightStory(null);
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
    const ringPadding = size && size <= 44 ? 2 : 3;
    const ringSize = size ? size + ringPadding * 2 : undefined;

    return (
        <>
            <Box
                sx={{
                    display: "inline-flex",
                    width: ringSize,
                    height: ringSize,
                    minWidth: ringSize,
                    maxWidth: ringSize,
                    boxSizing: "border-box",
                    p: `${ringPadding}px`,
                    borderRadius: size && size <= 44 ? "14px" : "11px",
                    background: hasStories
                        ? getStoryRingBackground(stories)
                        : "transparent",
                    lineHeight: 0,
                    flex: "0 0 auto",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: interactive && hasStories ? "pointer" : "default",
                }}
                component={interactive && hasStories ? "button" : "div"}
                type={interactive && hasStories ? "button" : undefined}
                aria-label={interactive && hasStories ? "Открыть объявления" : undefined}
                onClick={interactive && hasStories ? () => setViewerOpen(true) : undefined}
            >
                {children}
            </Box>
            {interactive && hasStories && (
                <StoryViewer
                    groups={[stories]}
                    initialGroupIndex={0}
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    footer={manage ? (story) => (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%", maxWidth: 560, mx: "auto" }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AutoStoriesRoundedIcon />}
                                disabled={deleteMutation.isPending || highlightMutation.isPending || removeHighlightMutation.isPending}
                                onClick={() => {
                                    setHighlightStory(story);
                                    setHighlightTitle("");
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
                                onClick={() => deleteMutation.mutate(story.id)}
                                sx={{ minHeight: 44, backgroundColor: "rgba(255,255,255,.96)" }}
                            >
                                Удалить
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setViewerOpen(false)}
                                sx={{ minHeight: 44, color: "white", borderColor: "rgba(255,255,255,.75)" }}
                            >
                                Отмена
                            </Button>
                        </Stack>
                    ) : undefined}
                />
            )}
            {manage && (
                <Dialog open={Boolean(highlightStory)} onClose={() => setHighlightStory(null)} fullWidth maxWidth="xs">
                    <DialogTitle>Добавить в актуальные акции</DialogTitle>
                    <DialogContent>
                        <Stack spacing={1.5}>
                            <Typography variant="body2" color="text.secondary">
                                Выберите существующую подборку или создайте новую.
                            </Typography>
                            {highlightsQuery.data && highlightsQuery.data.length > 0 ? (
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                    {highlightsQuery.data.map((highlight) => {
                                        const includesStory = Boolean(
                                            highlightStory && highlight.stories.some((story) => story.id === highlightStory.id),
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
                                                        onClick={() => removeHighlightMutation.mutate({ storyId: highlightStory!.id, highlightId: highlight.id })}
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
                            ) : null}
                            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setHighlightTitle("")} sx={{ alignSelf: "flex-start" }}>
                                Создать новую подборку
                            </Button>
                            <Box
                                component="input"
                                autoFocus
                                value={highlightTitle}
                                onChange={(event) => setHighlightTitle(event.target.value.slice(0, 48))}
                                placeholder="Акции, Работы, Новости"
                                sx={{ width: "100%", minHeight: 46, px: 1.25, border: "1px solid #cbd5e1", borderRadius: 1.5, font: "inherit", boxSizing: "border-box" }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHighlightStory(null)}>Отмена</Button>
                        <Button variant="contained" onClick={() => highlightMutation.mutate()} disabled={!highlightTitle.trim() || highlightMutation.isPending || removeHighlightMutation.isPending}>
                            Добавить
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}
