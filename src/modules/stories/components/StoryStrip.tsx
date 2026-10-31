import { useMemo, useState } from "react";
import { Avatar, Box, CircularProgress, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@common/hooks";
import { fetchAuthorStories, fetchHomeStories, type Story } from "../api";
import { StoryViewer } from "./StoryViewer";
import { getStoryRingBackground } from "./StoryRing";

type StoryStripProps = {
    authorId?: string;
    title?: string;
};

function groupStories(stories: Story[]): Story[][] {
    const grouped = new Map<string, Story[]>();
    for (const story of stories) {
        const key = story.author.userId;
        const current = grouped.get(key) ?? [];
        current.push(story);
        grouped.set(key, current);
    }

    // Instagram-like ordering: profiles with unseen stories go first, and
    // the newest profile is first within each viewed-state bucket.
    return Array.from(grouped.values()).sort((left, right) => {
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

export function StoryStrip({ authorId, title = "Объявления" }: StoryStripProps) {
    const { isAuthenticated } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const query = useQuery({
        queryKey: authorId ? ["stories", "author", authorId] : ["stories", "home"],
        queryFn: () => authorId ? fetchAuthorStories(authorId) : fetchHomeStories(),
        enabled: Boolean(authorId) || isAuthenticated,
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
        <Box sx={{ py: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{title}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 0.5 }}>
                {groups.map((group, index) => {
                    const story = group[0];
                    // This strip represents professional profiles. Never use
                    // the personal account avatar as a fallback.
                    const avatar = story.author.avatarUrl;
                    return (
                        <Box key={story.author.userId} component="button" onClick={() => setSelectedGroup(index)} sx={{ border: 0, background: "none", p: 0, minWidth: 68, cursor: "pointer" }}>
                            <Box sx={{ width: 62, height: 62, borderRadius: 2.5, p: "3px", background: getStoryRingBackground(group), mx: "auto" }}>
                                <Avatar src={avatar ?? undefined} sx={{ width: "100%", height: "100%", borderRadius: 2, bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }}>
                                    {story.author.displayName.slice(0, 1).toUpperCase()}
                                </Avatar>
                            </Box>
                            <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
