import { useState } from "react";
import {
    Alert, Box, Button as MuiButton, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Stack, TextField, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useUserProfile } from "@common/hooks";
import { hasCapability } from "@common/lib/userAccess";
import { DashboardLayout } from "@modules/layout";
import { addStoryToHighlight, deleteStory, fetchAuthorHighlights, fetchAuthorStories, removeStoryFromHighlight } from "@modules/stories";
import { StoryComposer } from "@modules/stories/components/StoryComposer";
import { StoryCanvas } from "@modules/stories/components/StoryCanvas";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

export function Stories() {
    const { profile } = useUserProfile();
    const queryClient = useQueryClient();
    const [highlightStoryId, setHighlightStoryId] = useState<string | null>(null);
    const [highlightTitle, setHighlightTitle] = useState("");
    const canPublish = hasCapability(profile, "professionalCabinet");

    const activeStoriesQuery = useQuery({
        queryKey: ["stories", "author", profile?.id],
        queryFn: () => fetchAuthorStories(profile!.id),
        enabled: Boolean(profile?.id && canPublish),
        staleTime: 30_000,
    });

    const highlightsQuery = useQuery({
        queryKey: ["stories", "highlights", profile?.id],
        queryFn: () => fetchAuthorHighlights(profile!.id),
        enabled: Boolean(profile?.id && canPublish),
        staleTime: 60_000,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStory,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "author", profile?.id] });
            void queryClient.invalidateQueries({ queryKey: ["stories", "home"] });
            toast.success("Объявление удалено");
        },
        onError: () => toast.error("Не удалось удалить объявление"),
    });

    const highlightMutation = useMutation({
        mutationFn: () => addStoryToHighlight(highlightStoryId!, highlightTitle.trim()),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", profile?.id] });
            setHighlightStoryId(null);
            setHighlightTitle("");
            toast.success("Объявление добавлено в актуальные акции");
        },
        onError: () => toast.error("Не удалось сохранить объявление в актуальные акции"),
    });
    const removeHighlightMutation = useMutation({
        mutationFn: ({ storyId, highlightId }: { storyId: string; highlightId: string }) =>
            removeStoryFromHighlight(storyId, highlightId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", profile?.id] });
            toast.success("Объявление убрано из актуальных акций");
        },
        onError: () => toast.error("Не удалось убрать объявление из подборки"),
    });

    if (!profile) {
        return <DashboardLayout title="Объявления"><CircularProgress /></DashboardLayout>;
    }

    if (!canPublish) {
        return (
            <DashboardLayout title="Объявления">
                <Alert severity="info">Публиковать объявления могут только мастера и бизнес-аккаунты.</Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Объявления">
            <Stack spacing={2.5} sx={{ pb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Новое объявление</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Добавьте до 10 слайдов. Объявление автоматически исчезнет через 24 часа.
                    </Typography>
                </Box>

                <StoryComposer authorId={profile.id} />

                <Box sx={{ pt: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Опубликованные объявления</Typography>
                    {activeStoriesQuery.isLoading ? <CircularProgress size={22} /> : activeStoriesQuery.data?.length ? (
                        <Stack spacing={1}>
                            {activeStoriesQuery.data.map((story, index) => (
                                <Stack key={story.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                                        <Box sx={{ width: 48, height: 76, flexShrink: 0, overflow: "hidden", borderRadius: 1.5, bgcolor: "#0b1020" }}>
                                            <StoryCanvas frame={story.frames[0]} />
                                        </Box>
                                        <Typography variant="body2" sx={{ minWidth: 0 }}>Объявление {index + 1} · {story.frames.length} слайд(а)</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.35, flexShrink: 0 }}>
                                            <VisibilityOutlinedIcon sx={{ fontSize: 14 }} /> {story.viewCount ?? 0}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5}>
                                        <MuiButton size="small" onClick={() => { setHighlightStoryId(story.id); setHighlightTitle(""); }} disabled={highlightMutation.isPending || removeHighlightMutation.isPending}>В актуальные акции</MuiButton>
                                        <MuiButton color="error" size="small" onClick={() => deleteMutation.mutate(story.id)} disabled={deleteMutation.isPending}>Удалить</MuiButton>
                                    </Stack>
                                </Stack>
                            ))}
                        </Stack>
                    ) : <Typography variant="body2" color="text.secondary">Пока нет опубликованных объявлений.</Typography>}
                </Box>

                <Dialog open={Boolean(highlightStoryId)} onClose={() => setHighlightStoryId(null)} fullWidth maxWidth="xs">
                    <DialogTitle>Сохранить в актуальные акции</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Название подборки"
                            placeholder="Акции, Работы, Новости"
                            value={highlightTitle}
                            onChange={(event) => setHighlightTitle(event.target.value)}
                            inputProps={{ maxLength: 48 }}
                            sx={{ mt: 1 }}
                        />
                        {(highlightsQuery.data?.length ?? 0) > 0 && (
                            <>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.75 }}>
                                    Или выберите существующую подборку
                                </Typography>
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                    {highlightsQuery.data?.map((highlight) => {
                                        const includesStory = Boolean(
                                            highlightStoryId && highlight.stories.some((story) => story.id === highlightStoryId),
                                        );
                                        return (
                                            <Stack key={highlight.id} direction="row" spacing={0.5} alignItems="center">
                                                <MuiButton
                                                    size="small"
                                                    variant={highlightTitle === highlight.title ? "contained" : "outlined"}
                                                    onClick={() => setHighlightTitle(highlight.title)}
                                                >
                                                    {highlight.title}
                                                </MuiButton>
                                                {includesStory ? (
                                                    <MuiButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => removeHighlightMutation.mutate({ storyId: highlightStoryId!, highlightId: highlight.id })}
                                                        disabled={removeHighlightMutation.isPending}
                                                        sx={{ minWidth: 0, px: 0.5 }}
                                                    >
                                                        Убрать
                                                    </MuiButton>
                                                ) : null}
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <MuiButton onClick={() => setHighlightStoryId(null)}>Отмена</MuiButton>
                        <MuiButton variant="contained" onClick={() => highlightMutation.mutate()} disabled={!highlightTitle.trim() || highlightMutation.isPending || removeHighlightMutation.isPending}>
                            Сохранить
                        </MuiButton>
                    </DialogActions>
                </Dialog>
            </Stack>
        </DashboardLayout>
    );
}
