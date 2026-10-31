import { apiBaseURL, http } from "@common/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaEntityType = "account" | "work" | "object" | "story";
export type MediaCategory = "avatar" | "photo" | "story";
export type MediaAssetStatus = "processing" | "ready" | "failed";

export interface UploadIntentRequest {
    entityType: MediaEntityType;
    entityId: string;
    category: MediaCategory;
    mimeType: string;
    sizeBytes: number;
    trimStart?: number;
    trimEnd?: number;
}

export interface UploadIntentResponse {
    intentId: string;
    uploadUrl: string;
    stagingKey: string;
    expiresAt: string;
    headers: Record<string, string>;
}

export interface ConfirmUploadResponse {
    assetId: string;
    status: MediaAssetStatus;
}

export interface DerivativeURLs {
    jpeg?: string;
    webp?: string;
}

export interface AssetURLs {
    original?: string;
    thumb?: DerivativeURLs;
    medium?: DerivativeURLs;
    large?: DerivativeURLs;
}

export interface MediaAsset {
    assetId: string;
    category: MediaCategory;
    status: MediaAssetStatus;
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
    createdAt: string;
    urls?: AssetURLs;
}

function backendOrigin(): string {
    try {
        return new URL(apiBaseURL, window.location.origin).origin;
    } catch {
        return window.location.origin;
    }
}

function normalizeMediaUrl(url?: string): string | undefined {
    if (!url) return undefined;

    const trimmed = url.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;

    try {
        return new URL(trimmed).toString();
    } catch {
        // Relative URL from backend/CDN config. Resolve against backend host.
    }

    if (trimmed.startsWith("//")) {
        return `${window.location.protocol}${trimmed}`;
    }

    const origin = backendOrigin();
    if (trimmed.startsWith("/")) {
        return `${origin}${trimmed}`;
    }
    return `${origin}/${trimmed}`;
}

function normalizeDerivativeUrls(derivative?: DerivativeURLs): DerivativeURLs | undefined {
    if (!derivative) return undefined;
    return {
        jpeg: normalizeMediaUrl(derivative.jpeg),
        webp: normalizeMediaUrl(derivative.webp),
    };
}

function normalizeAsset(asset: MediaAsset): MediaAsset {
    return {
        ...asset,
        urls: asset.urls
            ? {
                  original: normalizeMediaUrl(asset.urls.original),
                  thumb: normalizeDerivativeUrls(asset.urls.thumb),
                  medium: normalizeDerivativeUrls(asset.urls.medium),
                  large: normalizeDerivativeUrls(asset.urls.large),
              }
            : undefined,
    };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Step 1: request a pre-signed PUT URL from our backend. */
export async function createUploadIntent(
    req: UploadIntentRequest
): Promise<UploadIntentResponse> {
    const response = await http.post("/v1/media/upload-intent", req);
    return response.data;
}

/** Step 2: upload the file through the authenticated backend proxy. */
export async function uploadToS3(
    uploadUrl: string,
    file: File,
    headers: Record<string, string>,
    onProgress?: (percent: number) => void
): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // Backend returns a relative proxy URL. Resolve it against the same
        // API origin/prefix as axios so production (frontend :3000 + backend
        // :3001) does not accidentally post the file to the frontend server.
        const resolvedUploadUrl = uploadUrl.startsWith("/")
            ? `${apiBaseURL}${uploadUrl}`
            : uploadUrl;
        xhr.open("POST", resolvedUploadUrl, true);

        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        }

        // Do not set Content-Type manually: the browser adds the multipart
        // boundary. S3-specific headers from old intent responses are ignored.

        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
            }
        };
        xhr.onerror = () => reject(new Error("S3 upload network error"));
        const form = new FormData();
        form.append("file", file, file.name || "upload");
        xhr.send(form);
    });
}

/** Step 3: tell our backend the upload is complete. */
export async function confirmUpload(
    intentId: string,
    stagingKey: string
): Promise<ConfirmUploadResponse> {
    const response = await http.post("/v1/media/confirm-upload", {
        intentId,
        stagingKey,
    });
    return response.data;
}

/** Poll a single asset until status = ready | failed, or timeout. */
export async function getAsset(assetId: string): Promise<MediaAsset> {
    const response = await http.get(`/v1/media/assets/${assetId}`);
    return normalizeAsset(response.data);
}

/** Returns all assets for an entity (e.g. the user's avatar). */
export async function getEntityMedia(
    entityType: MediaEntityType,
    entityId: string
): Promise<{ assets: MediaAsset[] }> {
    const response = await http.get(`/v1/media/${entityType}/${entityId}`);
    return {
        assets: (response.data.assets ?? []).map((asset: MediaAsset) =>
            normalizeAsset(asset)
        ),
    };
}

/** Soft-deletes an asset. */
export async function deleteAsset(assetId: string): Promise<void> {
    await http.delete(`/v1/media/assets/${assetId}`);
}

const accountAvatarCache = new Map<string, string | null>();

function pickReadyAvatarUrl(assets: MediaAsset[]): string | null {
    const avatar = assets.find(
        (asset) => asset.category === "avatar" && asset.status === "ready"
    );
    return avatar?.urls?.original ?? null;
}

export async function getAccountAvatarUrl(
    accountId: string,
    forceRefresh = false
): Promise<string | null> {
    if (!accountId) return null;

    if (!forceRefresh && accountAvatarCache.has(accountId)) {
        return accountAvatarCache.get(accountId) ?? null;
    }

    try {
        const { assets } = await getEntityMedia("account", accountId);
        const avatarUrl = pickReadyAvatarUrl(assets);
        accountAvatarCache.set(accountId, avatarUrl);
        return avatarUrl;
    } catch {
        accountAvatarCache.set(accountId, null);
        return null;
    }
}

export async function getAccountAvatars(
    accountIds: string[]
): Promise<Record<string, string | null>> {
    const uniqueIds = Array.from(new Set(accountIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    const results = await Promise.all(
        uniqueIds.map(async (id) => [id, await getAccountAvatarUrl(id)] as const)
    );

    return Object.fromEntries(results);
}
