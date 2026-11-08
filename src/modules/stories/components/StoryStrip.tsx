import { useMemo, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@common/hooks";
import { fetchAuthorStories, fetchHomeStories, type Story } from "../api";
import { StoryViewer } from "./StoryViewer";
import { getStoryRingBackground } from "./StoryRing";

type StoryStripProps = {
    authorId?: string;
    title?: string;
    showTitle?: boolean;
    compact?: boolean;
};

function groupStories(stories: Story[]): Story[][] {
    const grouped = new Map<string, Story[]>();
    const seenStories = new Set<string>();
    for (const story of stories) {
        if (seenStories.has(story.id)) continue;
        seenStories.add(story.id);
        const key = story.author.userId;
        const current = grouped.get(key) ?? [];
        current.push(story);
        grouped.set(key, current);
    }

    const orderedGroups = Array.from(grouped.values()).map((group) => group.sort(
        (left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0),
    ));

    // Instagram-like ordering: profiles with unseen stories go first, and
    // the newest profile is first within each viewed-state bucket.
    return orderedGroups.sort((left, right) => {
        const leftHasUnviewed = left.some((story) => !story.isViewed);
        const rightHasUnviewed = right.some((story) => !story.isViewed);
        const viewedStateOrder = Number(rightHasUnviewed) - Number(leftHasUnviewed);
        if (viewedStateOrder !== 0) return viewedStateOrder;

        const newest = (group: Story[]) => group.reduce(
            (latest, story) => Math.max(latest, Date.parse(story.createdAt) || 0),
            0,
        );
        return newest(right) - newest(left);
    });
}

function getStoryThumbnail(story: Story) {
    const firstFrame = [...story.frames].sort((left, right) => left.position - right.position)[0];
    const imageFrame = story.frames.find((frame) => frame.kind === "image" && frame.imageUrl);

    return {
        frame: firstFrame,
        imageUrl: imageFrame?.imageUrl,
        videoUrl: firstFrame?.kind === "video" ? firstFrame.videoUrl : undefined,
    };
}

export function StoryStrip({
    authorId,
    title = "Объявления",
    showTitle = true,
    compact = false,
}: StoryStripProps) {
    const { isAuthenticated } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const query = useQuery({
        queryKey: authorId ? ["stories", "author", authorId] : ["stories", "home"],
        queryFn: () => authorId ? fetchAuthorStories(authorId) : fetchHomeStories(),
        enabled: Boolean(authorId) || !authorId || isAuthenticated,
        staleTime: 30_000,
    });
    const groups = useMemo(() => groupStories(query.data ?? []), [query.data]);
    if (query.isLoading) {
        return <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}><CircularProgress size={22} /></Box>;
    }
    if (query.isError || groups.length === 0) {
        return authorId && isAuthenticated ? (
            <Stack direction="row" alignItems="center" sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">Пока нет активных объявлений</Typography>
            </Stack>
        ) : null;
    }

    return (
        <Box sx={{ py: compact ? 2 : 1.5, px: compact ? 2 : 0 }}>
            {showTitle && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{title}</Typography>
                </Stack>
            )}
            <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                {groups.map((group, index) => {
                    const story = group[0];
                    const thumbnail = getStoryThumbnail(story);
                    const singleStoryColor = group.length === 1
                        ? (story.isViewed ? "#8492a5" : "#4673d5")
                        : undefined;
                    return (
                        <Box key={story.author.userId} component="button" onClick={() => setSelectedGroup(index)} sx={{ border: 0, background: "none", p: 0, minWidth: compact ? 60 : 68, cursor: "pointer" }}>
                            <Box sx={{ width: compact ? 54 : 62, height: compact ? 54 : 62, boxSizing: "border-box", position: "relative", mx: "auto", display: "grid", placeItems: "center", p: singleStoryColor ? 0 : "3px", border: singleStoryColor ? `3px solid ${singleStoryColor}` : 0, background: singleStoryColor ? "transparent" : getStoryRingBackground(group), borderRadius: compact ? "16px" : 2.5 }}>
                                <Box sx={{ width: compact ? 48 : 56, height: compact ? 48 : 56, position: "relative", zIndex: 2, overflow: "hidden", display: "grid", placeItems: "center", border: "1px solid #fff", borderRadius: "13px", background: thumbnail.frame?.background || "linear-gradient(135deg, #dbeafe, #94a3b8)", color: "#ffffff" }}>
                                    {thumbnail.imageUrl ? (
                                        <Box component="img" src={thumbnail.imageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    ) : thumbnail.videoUrl ? (
                                        <Box component="video" src={thumbnail.videoUrl} muted playsInline autoPlay loop aria-label="Видео истории" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    ) : thumbnail.frame?.text ? (
                                        <Typography sx={{ px: 0.75, color: "inherit", fontSize: compact ? 9 : 10, lineHeight: 1.1, fontWeight: 800, textAlign: "center", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                            {thumbnail.frame.text}
                                        </Typography>
                                    ) : (
                                        <Typography sx={{ color: "inherit", fontSize: compact ? 15 : 18, fontWeight: 800 }}>История</Typography>
                                    )}
                                </Box>
                            </Box>
                            <Typography sx={{ mt: 0.5, fontSize: compact ? 12 : 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#212c3f" }}>
                                {story.author.displayName}
                            </Typography>
                        </Box>
                    );
                })}
            </Stack>
            {selectedGroup !== null && <StoryViewer groups={groups} initialGroupIndex={selectedGroup} open onClose={() => setSelectedGroup(null)} />}
        </Box>
    );
}

export function StoryPublishHint() {
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", fontSize: 13 }}>
            <AddRoundedIcon fontSize="small" />
            <span>Публикуйте акции и новости в объявлениях</span>
        </Stack>
    );
}
