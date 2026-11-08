import { useMemo, useRef, useState } from "react";
import { Button, Checkbox, FormControlLabel, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteAsset, getEntityMedia, type MediaAsset } from "@modules/media/api";
import { useWorkPhotoUpload } from "@modules/media/hooks/useWorkPhotoUpload";
import { Master } from "@modules/masters";
import { updateMyProfile } from "@modules/masters/domain/api";
import { SettingsSection } from "@common/components";

export const MASTER_FEATURE_OPTIONS = [
    ["parking", "Парковка"],
    ["waiting_area", "Зона ожидания"],
    ["coffee", "Кофе для клиентов"],
    ["wifi", "Wi-Fi"],
    ["towing", "Эвакуатор"],
    ["spare_parts", "Запчасти в наличии"],
] as const;

function assetUrl(asset: MediaAsset) {
    return asset.urls?.medium?.webp || asset.urls?.medium?.jpeg || asset.urls?.original || "";
}

function orderedAssets(profile: Master, assets: MediaAsset[]) {
    const order = new Map((profile.workPhotoAssetIds ?? []).map((id, index) => [id, index]));
    return [...assets].sort((a, b) => (order.get(a.assetId) ?? 9999) - (order.get(b.assetId) ?? 9999));
}

type Props = { profile: Master };

export function MasterWorkGallerySettings({ profile }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const mediaQuery = useQuery({
        queryKey: ["masterWorkMedia", profile.userId],
        queryFn: () => getEntityMedia("work", profile.userId),
        enabled: Boolean(profile.userId),
    });
    const assets = useMemo(() => orderedAssets(profile, mediaQuery.data?.assets ?? []), [profile, mediaQuery.data?.assets]);
    const [order, setOrder] = useState<string[]>(profile.workPhotoAssetIds ?? []);
    const [heroes, setHeroes] = useState<string[]>(profile.heroWorkPhotoAssetIds ?? []);
    const uploader = useWorkPhotoUpload(profile.userId);

    const syncMutation = useMutation({
        mutationFn: (next: { order: string[]; heroes: string[] }) => updateMyProfile({
            workPhotoAssetIds: next.order,
            heroWorkPhotoAssetIds: next.heroes,
        }),
        onSuccess: (data) => {
            queryClient.setQueryData(["masterProfile", "me"], data);
            void queryClient.invalidateQueries({ queryKey: ["masterWorkMedia", profile.userId] });
        },
        onError: () => toast.error("Не удалось сохранить порядок фотографий"),
    });

    const currentOrder = order.length > 0 ? order : assets.map((asset) => asset.assetId);
    const visibleAssets = currentOrder.map((id) => assets.find((asset) => asset.assetId === id)).filter(Boolean) as MediaAsset[];

    const saveGallery = (nextOrder: string[], nextHeroes: string[]) => {
        setOrder(nextOrder);
        setHeroes(nextHeroes);
        syncMutation.mutate({ order: nextOrder, heroes: nextHeroes });
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;
        let nextOrder = [...currentOrder];
        for (const file of Array.from(files)) {
            const asset = await uploader.upload(file);
            if (asset && !nextOrder.includes(asset.assetId)) nextOrder.push(asset.assetId);
        }
        if (nextOrder.length !== currentOrder.length) saveGallery(nextOrder, heroes);
        void mediaQuery.refetch();
    };

    const handleDelete = async (assetId: string) => {
        try {
            await deleteAsset(assetId);
            saveGallery(currentOrder.filter((id) => id !== assetId), heroes.filter((id) => id !== assetId));
            toast.success("Фото удалено");
        } catch {
            toast.error("Не удалось удалить фото");
        }
    };

    const handleDrop = (targetId: string) => {
        if (!draggedId || draggedId === targetId) return;
        const next = [...currentOrder];
        const from = next.indexOf(draggedId);
        const to = next.indexOf(targetId);
        if (from < 0 || to < 0) return;
        next.splice(from, 1);
        next.splice(to, 0, draggedId);
        saveGallery(next, heroes);
        setDraggedId(null);
    };

    const toggleHero = (assetId: string) => {
        if (heroes.includes(assetId)) {
            saveGallery(currentOrder, heroes.filter((id) => id !== assetId));
            return;
        }
        if (heroes.length >= 2) {
            toast.info("Можно выбрать не более двух hero-фото");
            return;
        }
        saveGallery(currentOrder, [...heroes, assetId]);
    };

    return (
        <SettingsSection title="Фото работ">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Добавьте фотографии выполненных работ. Перетаскиванием задайте порядок, а звёздочкой выберите до двух фото для верхнего блока профиля.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.25}>
                {visibleAssets.map((asset) => (
                    <div
                        key={asset.assetId}
                        draggable
                        onDragStart={() => setDraggedId(asset.assetId)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDrop(asset.assetId)}
                        style={{ position: "relative", width: 132, borderRadius: 12, overflow: "hidden", border: heroes.includes(asset.assetId) ? "2px solid #4f7bd9" : "1px solid #e2e8f0", background: "#f8fafc" }}
                    >
                        <img src={assetUrl(asset)} alt="Фото работы" style={{ display: "block", width: "100%", aspectRatio: "1.2", objectFit: "cover" }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, minHeight: 38 }}>
                            <IconButton size="small" onClick={() => toggleHero(asset.assetId)} color={heroes.includes(asset.assetId) ? "primary" : "default"} aria-label="Выбрать hero-фото"><StarRoundedIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => handleDelete(asset.assetId)} color="error" aria-label="Удалить фото"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                        </Stack>
                    </div>
                ))}
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploader.phase === "uploading" || uploader.phase === "processing"} style={{ width: 132, minHeight: 148, border: "1px dashed #9aaac0", borderRadius: 12, background: "#f8fafc", color: "#5375a5", cursor: "pointer", font: "600 13px Manrope, sans-serif" }}>
                    {uploader.phase === "uploading" ? `Загрузка ${uploader.uploadProgress}%` : "+ Добавить фото"}
                </button>
            </Stack>
            {uploader.phase === "uploading" && <LinearProgress variant="determinate" value={uploader.uploadProgress} sx={{ mt: 1.5 }} />}
            {uploader.error && <Typography color="error" variant="caption">{uploader.error}</Typography>}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { void handleUpload(event.target.files); event.target.value = ""; }} />
        </SettingsSection>
    );
}

export function MasterFeaturesSettings({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
    return (
        <SettingsSection title="Особенности">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Выберите удобства, которые будут видны клиентам в профиле.
            </Typography>
            <Stack direction="row" flexWrap="wrap" columnGap={2}>
                {MASTER_FEATURE_OPTIONS.map(([key, label]) => (
                    <FormControlLabel key={key} control={<Checkbox checked={value.includes(key)} onChange={(event) => onChange(event.target.checked ? [...value, key] : value.filter((item) => item !== key))} />} label={label} />
                ))}
            </Stack>
        </SettingsSection>
    );
}
