import React, { useRef, useEffect } from "react";
import { CameraAlt as CameraIcon, PersonOutline as PersonIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useAvatarUpload, type UploadPhase } from "@modules/media/hooks/useAvatarUpload";
import {
    Root,
    AvatarCircle,
    AvatarImage,
    AvatarFallback,
    Overlay,
    OverlayIcon,
    SpinnerRing,
    ProgressBar,
    EditBadge,
    ErrorText,
    ProcessingPulse,
} from "./styles";

interface AvatarUploadProps {
    /** ID of the user / entity. Required to fetch and upload the avatar. */
    entityId: string | null | undefined;
    /** Optional name initials to show as fallback. */
    fallbackText?: string;
    className?: string;
}

export function AvatarUpload({ entityId, fallbackText, className }: AvatarUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { avatarUrl, phase, uploadProgress, error, upload, refetch } =
        useAvatarUpload(entityId);

    // Load current avatar on mount
    useEffect(() => {
        refetch();
    }, [refetch]);

    const isActive =
        phase === "uploading" || phase === "processing" || phase === "validating";
    const isProcessing = phase === "processing";
    const isUploading = phase === "uploading";

    const handleClick = () => {
        if (!entityId || isActive) return;
        inputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so the same file can be re-selected after an error
        e.target.value = "";
        upload(file);
    };

    const overlayContent = () => {
        if (isUploading) {
            return (
                <OverlayIcon>
                    <SpinnerRing />
                </OverlayIcon>
            );
        }
        if (isProcessing) {
            return (
                <OverlayIcon>
                    <ProcessingPulse>
                        <SpinnerRing />
                    </ProcessingPulse>
                </OverlayIcon>
            );
        }
        return (
            <OverlayIcon>
                <CameraIcon />
            </OverlayIcon>
        );
    };

    const tooltipTitle = isUploading
        ? `Загрузка: ${uploadProgress}%`
        : isProcessing
        ? "Обработка фото..."
        : phase === "error" && error
        ? error
        : avatarUrl
        ? "Изменить фото"
        : "Добавить фото";

    return (
        <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title={tooltipTitle} placement="right" arrow>
                <Root onClick={handleClick} role="button" aria-label="Загрузить фото профиля">
                    <AvatarCircle $hasImage={!!avatarUrl} $isActive={isActive}>
                        {avatarUrl ? (
                            <AvatarImage
                                src={avatarUrl}
                                alt="Фото профиля"
                                onError={() => refetch()}
                            />
                        ) : (
                            <AvatarFallback>
                                {fallbackText ? (
                                    <span style={{ fontSize: 22, fontWeight: 600 }}>
                                        {fallbackText.charAt(0).toUpperCase()}
                                    </span>
                                ) : (
                                    <PersonIcon />
                                )}
                            </AvatarFallback>
                        )}

                        <Overlay $visible={isActive}>
                            {overlayContent()}
                        </Overlay>

                        {isUploading && <ProgressBar $percent={uploadProgress} />}
                    </AvatarCircle>

                    {/* Small camera badge in the bottom-right corner */}
                    {!isActive && (
                        <EditBadge>
                            <CameraIcon />
                        </EditBadge>
                    )}
                </Root>
            </Tooltip>

            {phase === "error" && error && (
                <ErrorText>{error}</ErrorText>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
                aria-hidden="true"
            />
        </div>
    );
}
