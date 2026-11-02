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

export function useWorkPhotoUpload(masterId: string | null | undefined) {
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(async (file: File): Promise<MediaAsset | null> => {
        if (!masterId) {
            setError("Профиль мастера ещё не создан");
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
                entityType: "work",
                entityId: masterId,
                category: "photo",
                mimeType: file.type,
                sizeBytes: file.size,
            });

            setPhase("uploading");
            await uploadToS3(intent.uploadUrl, file, intent.headers, setUploadProgress);
            setUploadProgress(100);

            const { assetId } = await confirmUpload(intent.intentId, intent.stagingKey);
            setPhase("processing");
            const asset = await pollUntilReady(assetId);
            setPhase("done");
            return asset;
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    "Ошибка загрузки фото",
            );
            setPhase("error");
            return null;
        }
    }, [masterId]);

    return {
        phase,
        uploadProgress,
        error,
        isUploading: phase === "validating" || phase === "uploading" || phase === "processing",
        upload,
    };
}

async function pollUntilReady(assetId: string): Promise<MediaAsset> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const asset = await getAsset(assetId);
        if (asset.status === "ready") return asset;
        if (asset.status === "failed") {
            throw new Error("Обработка изображения завершилась с ошибкой");
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error("Обработка занимает больше времени. Фото появится автоматически позже.");
}
