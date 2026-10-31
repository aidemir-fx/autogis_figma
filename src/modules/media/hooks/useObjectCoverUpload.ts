import { useCallback, useState } from "react";
import {
    confirmUpload,
    createUploadIntent,
    getAsset,
    uploadToS3,
    type MediaAsset,
} from "../api";
import type { UploadPhase } from "./useAvatarUpload";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

export type CoverUploadResult = {
    assetId: string;
    url: string;
};

export type UseObjectCoverUploadReturn = {
    phase: UploadPhase;
    uploadProgress: number;
    error: string | null;
    upload: (file: File) => Promise<CoverUploadResult | null>;
};

export function useObjectCoverUpload(
    objectId: string | null | undefined
): UseObjectCoverUploadReturn {
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(
        async (file: File): Promise<CoverUploadResult | null> => {
            if (!objectId) {
                setError("Профиль точки ещё не создан");
                setPhase("error");
                return null;
            }

            setError(null);
            setUploadProgress(0);
            setPhase("validating");

            if (!ALLOWED_TYPES.includes(file.type)) {
                setError("Допустимые форматы: JPEG, PNG, WebP");
                setPhase("error");
                return null;
            }
            if (file.size > MAX_SIZE_BYTES) {
                setError("Максимальный размер файла — 15 МБ");
                setPhase("error");
                return null;
            }

            try {
                const intent = await createUploadIntent({
                    entityType: "object",
                    entityId: objectId,
                    category: "photo",
                    mimeType: file.type,
                    sizeBytes: file.size,
                });

                setPhase("uploading");
                await uploadToS3(
                    intent.uploadUrl,
                    file,
                    intent.headers,
                    (pct) => setUploadProgress(pct)
                );
                setUploadProgress(100);

                const { assetId } = await confirmUpload(
                    intent.intentId,
                    intent.stagingKey
                );

                setPhase("processing");
                const url = await pollUntilReady(assetId);
                setPhase("done");

                return { assetId, url };
            } catch (err: any) {
                const message =
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    "Ошибка загрузки фото";
                setError(message);
                setPhase("error");
                return null;
            }
        },
        [objectId]
    );

    return { phase, uploadProgress, error, upload };
}

async function pollUntilReady(assetId: string): Promise<string> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const asset: MediaAsset = await getAsset(assetId);

        if (asset.status === "ready") {
            const url = pickCoverUrl(asset);
            if (url) {
                return url;
            }
        }
        if (asset.status === "failed") {
            throw new Error("Обработка изображения завершилась с ошибкой");
        }

        await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(
        "Обработка занимает больше времени. Фото появится автоматически чуть позже."
    );
}

function pickCoverUrl(asset: MediaAsset): string | undefined {
    return (
        asset.urls?.large?.webp ||
        asset.urls?.large?.jpeg ||
        asset.urls?.medium?.webp ||
        asset.urls?.medium?.jpeg ||
        asset.urls?.original
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
