import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
    createUploadIntent,
    uploadToS3,
    confirmUpload,
} from "@modules/media/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 10;

export interface PhotoItem {
    id: string; // local temp id
    file: File;
    previewUrl: string;
    assetId: string | null; // null while uploading
    uploading: boolean;
    error: string | null;
}

export interface UsePhotoUploadReturn {
    photos: PhotoItem[];
    addPhotos: (files: FileList | File[]) => void;
    removePhoto: (id: string) => void;
    uploadedAssetIds: string[];
    isUploading: boolean;
}

export function usePhotoUpload(): UsePhotoUploadReturn {
    const [photos, setPhotos] = useState<PhotoItem[]>([]);

    const addPhotos = useCallback(
        (files: FileList | File[]) => {
            const fileArray = Array.from(files);
            const currentCount = photos.length;

            if (currentCount + fileArray.length > MAX_FILES) {
                toast.error(`Можно прикрепить не более ${MAX_FILES} фотографий`);
                return;
            }

            const validFiles: File[] = [];
            for (const file of fileArray) {
                if (!ALLOWED_TYPES.includes(file.type)) {
                    toast.error("Допустимые форматы: JPG, PNG, WebP");
                    continue;
                }
                if (file.size > MAX_SIZE_BYTES) {
                    toast.error("Размер файла не должен превышать 10 MB");
                    continue;
                }
                validFiles.push(file);
            }

            if (validFiles.length === 0) return;

            const newItems: PhotoItem[] = validFiles.map((file) => ({
                id: `${Date.now()}-${Math.random()}`,
                file,
                previewUrl: URL.createObjectURL(file),
                assetId: null,
                uploading: true,
                error: null,
            }));

            setPhotos((prev) => [...prev, ...newItems]);

            // Upload each photo
            newItems.forEach((item) => {
                uploadPhoto(item.id, item.file);
            });
        },
        [photos.length]
    );

    const uploadPhoto = useCallback(async (localId: string, file: File) => {
        try {
            const intent = await createUploadIntent({
                entityType: "object",
                entityId: localId,
                category: "photo",
                mimeType: file.type,
                sizeBytes: file.size,
            });

            await uploadToS3(intent.uploadUrl, file, intent.headers);

            const { assetId } = await confirmUpload(intent.intentId, intent.stagingKey);

            setPhotos((prev) =>
                prev.map((p) =>
                    p.id === localId
                        ? { ...p, assetId, uploading: false, error: null }
                        : p
                )
            );
        } catch (error: any) {
            const status = error?.response?.status;
            const isMediaApiUnavailable = status === 404 || status === 503;

            if (isMediaApiUnavailable) {
                toast.warning(
                    "Сервис фото временно недоступен. Заявка будет отправлена без фото."
                );
            } else {
                toast.error("Не удалось загрузить фотографию. Попробуйте ещё раз");
            }

            setPhotos((prev) =>
                prev.map((p) =>
                    p.id === localId
                        ? { ...p, uploading: false, error: "Ошибка загрузки" }
                        : p
                )
            );
        }
    }, []);

    const removePhoto = useCallback((id: string) => {
        setPhotos((prev) => {
            const item = prev.find((p) => p.id === id);
            if (item) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter((p) => p.id !== id);
        });
    }, []);

    const uploadedAssetIds = photos
        .filter((p) => p.assetId !== null && !p.error)
        .map((p) => p.assetId as string);

    const isUploading = photos.some((p) => p.uploading);

    return {
        photos,
        addPhotos,
        removePhoto,
        uploadedAssetIds,
        isUploading,
    };
}
