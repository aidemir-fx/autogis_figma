import React, { useEffect, useRef, useState } from "react";
import { CameraIcon } from "@common/icons";
import { useObjectCoverUpload } from "@modules/media/hooks/useObjectCoverUpload";
import {
    ActionButton,
    Actions,
    Description,
    EmptyHint,
    EmptyState,
    EmptyText,
    ErrorText,
    Guidance,
    Overlay,
    OverlayText,
    PreviewImage,
    ProgressTrack,
    ProgressValue,
    Root,
    Title,
    UploadFrame,
} from "./styles";

type CoverPhotoValue = {
    url: string;
    assetId?: string;
};

type CoverPhotoUploadProps = {
    entityId: string | null | undefined;
    value?: CoverPhotoValue | null;
    onChange: (value: CoverPhotoValue | null) => void;
    onUploadStateChange?: (isUploading: boolean) => void;
    title?: string;
    description?: string;
};

export function CoverPhotoUpload({
    entityId,
    value,
    onChange,
    onUploadStateChange,
    title = "Главное фото точки",
    description = "Это фото будет показываться в поиске, на карте и на странице точки. Формат такой же, как в карточках: 16:10, например 1600x1000 или 1280x800. Если фото другого размера, оно будет аккуратно кадрировано по центру.",
}: CoverPhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const { phase, uploadProgress, error, upload } =
        useObjectCoverUpload(entityId);

    const isActive =
        phase === "validating" ||
        phase === "uploading" ||
        phase === "processing";
    const currentUrl = localPreview || value?.url || "";

    useEffect(() => {
        onUploadStateChange?.(isActive);
    }, [isActive, onUploadStateChange]);

    const openFileDialog = () => {
        if (isActive || !entityId) return;
        inputRef.current?.click();
    };

    const handleFile = async (file: File) => {
        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        const result = await upload(file);
        URL.revokeObjectURL(previewUrl);
        setLocalPreview(null);

        if (result) {
            onChange({ url: result.url, assetId: result.assetId });
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
            handleFile(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file && !isActive) {
            handleFile(file);
        }
    };

    const overlayText =
        phase === "uploading"
            ? `Загрузка ${uploadProgress}%`
            : phase === "processing"
              ? "Обработка фото..."
              : value?.url
                ? "Заменить фото"
                : "Добавить фото";

    return (
        <Root>
            <Guidance>
                <Title>{title}</Title>
                <Description>{description}</Description>
            </Guidance>

            <UploadFrame
                type="button"
                $hasImage={Boolean(currentUrl)}
                disabled={isActive || !entityId}
                onClick={openFileDialog}
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                aria-label="Загрузить главное фото точки"
            >
                {currentUrl ? (
                    <PreviewImage src={currentUrl} alt="Главное фото точки" />
                ) : (
                    <EmptyState>
                        <div>
                            <CameraIcon />
                            <EmptyText>Добавьте фото в пропорции 16:10</EmptyText>
                            <EmptyHint>JPEG, PNG или WebP, до 15 МБ</EmptyHint>
                        </div>
                    </EmptyState>
                )}

                <Overlay $visible={isActive}>
                    <OverlayText>{overlayText}</OverlayText>
                    {phase === "uploading" && (
                        <ProgressTrack>
                            <ProgressValue $percent={uploadProgress} />
                        </ProgressTrack>
                    )}
                </Overlay>
            </UploadFrame>

            <Actions>
                <ActionButton
                    type="button"
                    disabled={isActive || !entityId}
                    onClick={openFileDialog}
                >
                    {value?.url ? "Заменить фото" : "Выбрать фото"}
                </ActionButton>
                {value?.url && (
                    <ActionButton
                        type="button"
                        $variant="danger"
                        disabled={isActive}
                        onClick={() => onChange(null)}
                    >
                        Убрать фото
                    </ActionButton>
                )}
            </Actions>

            {error && <ErrorText>{error}</ErrorText>}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleInputChange}
            />
        </Root>
    );
}
