import { useState, useCallback } from "react";
import {
    createUploadIntent,
    uploadToS3,
    confirmUpload,
    getAsset,
    getEntityMedia,
    type MediaAsset,
} from "../api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

export type UploadPhase =
    | "idle"
    | "validating"
    | "uploading"
    | "processing"
    | "done"
    | "error";

export interface UseAvatarUploadReturn {
    /** Current avatar URL (original), or null if none. */
    avatarUrl: string | null;
    phase: UploadPhase;
    uploadProgress: number; // 0-100 during "uploading"
    error: string | null;
    /** Call with a File to start the full upload flow. */
    upload: (file: File) => Promise<void>;
    /** Re-fetch the current avatar from the server. */
    refetch: () => Promise<void>;
}

/**
 * Manages the complete avatar upload flow for an entity.
 *
 * Flow:
 *   validate → upload-intent → PUT to S3 → confirm-upload → poll until ready
 */
export function useAvatarUpload(
    entityId: string | null | undefined
): UseAvatarUploadReturn {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!entityId) return;
        try {
            const { assets } = await getEntityMedia("account", entityId);
            const avatar = assets.find(
                (a) => a.category === "avatar" && a.status === "ready"
            );
            setAvatarUrl(avatar?.urls?.original ?? null);
        } catch {
            // Silently ignore — avatar just won't show
        }
    }, [entityId]);

    const upload = useCallback(
        async (file: File) => {
            if (!entityId) return;

            setError(null);
            setUploadProgress(0);

            // ── 1. Client-side validation ──────────────────────────────────
            setPhase("validating");
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError("Допустимые форматы: JPEG, PNG, WebP");
                setPhase("error");
                return;
            }
            if (file.size > MAX_SIZE_BYTES) {
                setError("Максимальный размер файла — 5 МБ");
                setPhase("error");
                return;
            }

            try {
                // ── 2. Get pre-signed URL ──────────────────────────────────
                const intent = await createUploadIntent({
                    entityType: "account",
                    entityId,
                    category: "avatar",
                    mimeType: file.type,
                    sizeBytes: file.size,
                });

                // ── 3. Upload to S3 ────────────────────────────────────────
                setPhase("uploading");
                await uploadToS3(
                    intent.uploadUrl,
                    file,
                    intent.headers,
                    (pct) => setUploadProgress(pct)
                );
                setUploadProgress(100);

                // ── 4. Confirm upload ──────────────────────────────────────
                const { assetId } = await confirmUpload(
                    intent.intentId,
                    intent.stagingKey
                );

                // ── 5. Poll until ready ────────────────────────────────────
                setPhase("processing");
                const url = await pollUntilReady(assetId);
                setAvatarUrl(url);
                setPhase("done");
            } catch (err: any) {
                const message =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Ошибка загрузки фото";
                setError(message);
                setPhase("error");
            }
        },
        [entityId]
    );

    return { avatarUrl, phase, uploadProgress, error, upload, refetch };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function pollUntilReady(assetId: string): Promise<string> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const asset: MediaAsset = await getAsset(assetId);

        if (asset.status === "ready" && asset.urls?.original) {
            return asset.urls.original;
        }
        if (asset.status === "failed") {
            throw new Error("Обработка изображения завершилась с ошибкой");
        }

        await sleep(POLL_INTERVAL_MS);
    }

    // Timeout — processing is still ongoing, return null gracefully
    throw new Error(
        "Обработка занимает больше времени. Фото появится автоматически чуть позже."
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
