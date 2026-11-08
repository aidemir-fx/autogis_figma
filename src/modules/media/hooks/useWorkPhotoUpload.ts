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

export function useWorkPhotoUpload(entityId: string | null | undefined) {
    const [phase, setPhase] = useState<UploadPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(async (file: File) => {
        if (!entityId) {
            setError("Профиль мастера ещё не создан");
            setPhase("error");
            return null;
        }
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
            setError(null);
            setPhase("validating");
            setUploadProgress(0);
            const intent = await createUploadIntent({
                entityType: "work",
                entityId,
                category: "photo",
                mimeType: file.type,
                sizeBytes: file.size,
            });
            setPhase("uploading");
            await uploadToS3(intent.uploadUrl, file, intent.headers, setUploadProgress);
            const { assetId } = await confirmUpload(intent.intentId, intent.stagingKey);
            setPhase("processing");
            const asset = await pollUntilReady(assetId);
            setPhase("done");
            return asset;
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Ошибка загрузки фото");
            setPhase("error");
            return null;
        }
    }, [entityId]);

    return { phase, uploadProgress, error, upload };
}

async function pollUntilReady(assetId: string): Promise<MediaAsset> {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const asset = await getAsset(assetId);
        if (asset.status === "ready" && (asset.urls?.large || asset.urls?.original)) return asset;
        if (asset.status === "failed") throw new Error("Обработка изображения завершилась с ошибкой");
        await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new Error("Обработка занимает больше времени. Фото появится позже.");
}
