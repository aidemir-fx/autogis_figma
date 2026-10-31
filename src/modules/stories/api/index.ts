import { http } from "@common/lib/http";
import {
    confirmUpload,
    createUploadIntent,
    getAsset,
    uploadToS3,
} from "@modules/media/api";

export type StoryFrameKind = "text" | "image" | "video";
export type StoryImageLayout = {
    imageFit?: "contain" | "cover";
    imageScale?: number;
    /** Displacement as a fraction of the 9:16 canvas, independent of device size. */
    imageX?: number;
    imageY?: number;
    /** Text displacement as a fraction of the 9:16 canvas. */
    textX?: number;
    textY?: number;
    videoStart?: number;
    videoEnd?: number;
};
export type StoryReportReason = "spam" | "abuse" | "inappropriate" | "other";

export type StoryAuthor = {
    userId: string;
    displayName: string;
    role: string;
    /** Professional profile image (business cover when configured). */
    avatarUrl?: string;
};

export type StoryPromo = {
    tag?: string;
    title: string;
    description?: string;
    benefit?: string;
    actionType?: "book" | "call";
};

export type StoryFrame = StoryImageLayout & {
    id: string;
    position: number;
    kind: StoryFrameKind;
    assetId?: string;
    imageUrl?: string;
    videoUrl?: string;
    text?: string;
    background: string;
    fontSize: number;
    textColor?: string;
    textBg?: string;
    textAlign?: "center" | "left" | "right";
    textBadge?: boolean;
    promo?: StoryPromo;
};

export type Story = {
    id: string;
    author: StoryAuthor;
    frames: StoryFrame[];
    expiresAt: string;
    createdAt: string;
    isViewed: boolean;
    viewCount: number;
};

export type StoryFeed = { stories: Story[] };

export type StoryHighlight = {
    id: string;
    title: string;
    author: StoryAuthor;
    stories: Story[];
    createdAt: string;
};

export type CreateStoryFrame = StoryImageLayout & {
    kind: StoryFrameKind;
    assetId?: string;
    text?: string;
    background?: string;
    fontSize?: number;
    textColor?: string;
    textBg?: string;
    textAlign?: "center" | "left" | "right";
    textBadge?: boolean;
    promo?: StoryPromo;
};

export async function fetchHomeStories(): Promise<Story[]> {
    const { data } = await http.get<StoryFeed>("/stories/home");
    return data.stories ?? [];
}

export async function fetchAuthorStories(authorId: string): Promise<Story[]> {
    const { data } = await http.get<StoryFeed>(`/stories/author/${authorId}`);
    return data.stories ?? [];
}

export async function fetchAuthorHighlights(authorId: string): Promise<StoryHighlight[]> {
    const { data } = await http.get<{ highlights: StoryHighlight[] }>(
        `/stories/highlights/author/${authorId}`,
    );
    return data.highlights ?? [];
}

export async function createStory(frames: CreateStoryFrame[]): Promise<Story> {
    const { data } = await http.post<Story>("/stories", { frames });
    return data;
}

export async function deleteStory(storyId: string): Promise<void> {
    await http.delete(`/stories/${storyId}`);
}

export async function addStoryToHighlight(storyId: string, title: string): Promise<StoryHighlight> {
    const { data } = await http.post<StoryHighlight>(`/stories/${storyId}/highlight`, { title });
    return data;
}

export async function removeStoryFromHighlight(storyId: string, highlightId: string): Promise<void> {
    await http.delete(`/stories/${storyId}/highlight/${highlightId}`);
}

export async function markStoryViewed(storyId: string): Promise<void> {
    await http.post(`/stories/${storyId}/view`);
}

export async function reportStory(
    storyId: string,
    reason: StoryReportReason,
): Promise<void> {
    await http.post(`/stories/${storyId}/report`, { reason });
}

export async function isFollowing(authorId: string): Promise<boolean> {
    const { data } = await http.get<{ following: boolean }>(
        `/subscriptions/${authorId}`,
    );
    return Boolean(data.following);
}

export async function followAuthor(authorId: string): Promise<void> {
    await http.post(`/subscriptions/${authorId}`);
}

export async function unfollowAuthor(authorId: string): Promise<void> {
    await http.delete(`/subscriptions/${authorId}`);
}

export type SubscriptionStats = {
    followingCount: number;
    followersCount: number;
    following: SubscriptionProfile[];
    followers: SubscriptionProfile[];
};

export type SubscriptionProfile = {
    id: string;
    displayName: string;
    role: string;
    isProfessional: boolean;
};

export async function fetchMySubscriptionStats(): Promise<SubscriptionStats> {
    const { data } = await http.get<SubscriptionStats>("/subscriptions/me");
    return data;
}

export async function uploadStoryMedia(
    userId: string,
    file: File,
    onProgress?: (percent: number) => void,
    trimStart?: number,
    trimEnd?: number,
): Promise<string> {
    const isImage = file.type.startsWith("image/");
    const isVideo = ["video/mp4", "video/webm"].includes(file.type);
    if (!isImage && !isVideo) {
        throw new Error("Поддерживаются изображения JPEG/PNG/WebP и видео MP4/WebM");
    }
    if (file.size > (isVideo ? 400 : 15) * 1024 * 1024) {
        throw new Error(isVideo ? "Размер видео не может превышать 400 МБ" : "Максимальный размер изображения — 15 МБ");
    }

    const intent = await createUploadIntent({
        entityType: "story",
        entityId: userId,
        category: "story",
        mimeType: file.type,
        sizeBytes: file.size,
        trimStart,
        trimEnd,
    });
    await uploadToS3(intent.uploadUrl, file, intent.headers, onProgress);
    const { assetId } = await confirmUpload(intent.intentId, intent.stagingKey);

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        const asset = await getAsset(assetId);
        if (asset.status === "ready") return assetId;
        if (asset.status === "failed") {
            throw new Error("Не удалось обработать медиафайл");
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Медиафайл обрабатывается слишком долго");
}

export const uploadStoryImage = uploadStoryMedia;
