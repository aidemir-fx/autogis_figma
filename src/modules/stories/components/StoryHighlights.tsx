import { useMemo, useState } from "react";
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "react-toastify";
import { useUserProfile } from "@common/hooks";
import { fetchAuthorHighlights, removeStoryFromHighlight, type StoryHighlight } from "../api";
import { StoryViewer } from "./StoryViewer";

type StoryHighlightsProps = {
    authorId: string;
    compact?: boolean;
    manage?: boolean;
};

function getCover(highlight: StoryHighlight) {
    const frames = highlight.stories[0]?.frames ?? [];
    return frames.find((frame) => frame.kind === "image" && frame.imageUrl)?.imageUrl;
}

export function StoryHighlights({ authorId, compact = false, manage = false }: StoryHighlightsProps) {
    const queryClient = useQueryClient();
    const { profile } = useUserProfile();
    const canManage = manage || profile?.id === authorId;
    const [selected, setSelected] = useState<number | null>(null);
    const query = useQuery({
        queryKey: ["stories", "highlights", authorId],
        queryFn: () => fetchAuthorHighlights(authorId),
        enabled: Boolean(authorId),
        staleTime: 60_000,
    });
    const highlights = query.data ?? [];
    const selectedHighlight = selected === null ? undefined : highlights[selected];
    const groups = useMemo(
        () => (selectedHighlight ? [selectedHighlight.stories] : []),
        [selectedHighlight],
    );
    const removeMutation = useMutation({
        mutationFn: ({ storyId, highlightId }: { storyId: string; highlightId: string }) =>
            removeStoryFromHighlight(storyId, highlightId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["stories", "highlights", authorId] });
            setSelected(null);
            toast.success("Объявление убрано из актуальных акций");
        },
        onError: () => toast.error("Не удалось убрать объявление из подборки"),
    });

    if (query.isLoading) {
        return <CircularProgress size={18} sx={{ m: 1 }} />;
    }
    if (highlights.length === 0) return null;

    return (
        <Box sx={{ mt: compact ? 1 : 1.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: compact ? 12 : 14, fontWeight: 800, mb: 0.75 }}>
                Актуальные акции
            </Typography>
            <Stack direction="row" spacing={1.25} sx={{ overflowX: "auto", pb: 0.5 }}>
                {highlights.map((highlight, index) => {
                    const cover = getCover(highlight);
                    const firstText = highlight.stories[0]?.frames.find((frame) => frame.text)?.text;
                    return (
                        <Box
                            key={highlight.id}
                            component="button"
                            type="button"
                            onClick={() => setSelected(index)}
                            sx={{
                                border: 0,
                                background: "transparent",
                                p: 0,
                                minWidth: compact ? 62 : 72,
                                cursor: "pointer",
                                textAlign: "center",
                            }}
                        >
                            <Box
                                sx={{
                                    width: compact ? 58 : 68,
                                    height: compact ? 58 : 68,
                                    borderRadius: 2.5,
                                    overflow: "hidden",
                                    mx: "auto",
                                    border: "1px solid #e2e8f0",
                                    background: highlight.stories[0]?.frames[0]?.background || "#1d4ed8",
                                    display: "grid",
                                    placeItems: "center",
                                }}
                            >
                                {cover ? (
                                    <Box component="img" src={cover} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : firstText ? (
                                    <Typography sx={{ px: 0.5, color: "white", fontSize: 9, lineHeight: 1.1, fontWeight: 700, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {firstText}
                                    </Typography>
                                ) : (
                                    <Avatar sx={{ width: "100%", height: "100%", borderRadius: 0, bgcolor: "transparent", color: "white" }}>
                                        {highlight.title.slice(0, 1).toUpperCase()}
                                    </Avatar>
                                )}
                            </Box>
                            <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {highlight.title}
                            </Typography>
                        </Box>
                    );
                })}
            </Stack>
            {selectedHighlight && groups.length > 0 && (
                <StoryViewer
                    groups={groups}
                    initialGroupIndex={0}
                    open
                    onClose={() => setSelected(null)}
                    footer={canManage && selectedHighlight ? (story) => (
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ width: "100%", maxWidth: 560, mx: "auto" }}
                        >
                            <Button
                                fullWidth
                                color="error"
                                variant="contained"
                                startIcon={<DeleteOutlineRoundedIcon />}
                                disabled={removeMutation.isPending}
                                onClick={() => removeMutation.mutate({
                                    storyId: story.id,
                                    highlightId: selectedHighlight.id,
                                })}
                                sx={{ minHeight: 44 }}
                            >
                                Удалить из актуальных
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setSelected(null)}
                                sx={{ minHeight: 44, color: "white", borderColor: "rgba(255,255,255,.75)" }}
                            >
                                Отмена
                            </Button>
                        </Stack>
                    ) : undefined}
                />
            )}
        </Box>
    );
}
