import { useState } from "react";
import {
    Alert,
    Box,
    useMediaQuery,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Rating,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { theme } from "@common/theme";
import { usePhotoUpload } from "@modules/masters/features/CreateOrderModal/usePhotoUpload";
import { COMPACT_LAYOUT_MEDIA_QUERY } from "@modules/layout/features/layoutViewport";
import {
    createOrderReview,
    deleteOrderReview,
    getOrderReview,
    updateOrderReview,
    type Review,
} from "@modules/reviews/api";

const REVIEW_TAGS = [
    "Качество работы",
    "Соблюдение сроков",
    "Цена соответствует результату",
    "Вежливость",
    "Профессионализм",
];

const REVIEW_LABELS: Record<number, string> = {
    1: "Очень плохо",
    2: "Плохо",
    3: "Нормально",
    4: "Хорошо",
    5: "Отлично",
};

type OrderReviewPromptProps = {
    orderId: string;
    variant?: "booking" | "chat" | "profile";
};

export function OrderReviewPrompt({
    orderId,
    variant = "booking",
}: OrderReviewPromptProps) {
    const queryClient = useQueryClient();
    const compact = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const photoUpload = usePhotoUpload("review");
    const [retainedPhotos, setRetainedPhotos] = useState<string[]>([]);
    const [formError, setFormError] = useState("");
    const [sent, setSent] = useState(false);
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { data: review, isLoading } = useQuery<Review | null>({
        queryKey: ["orderReview", orderId],
        queryFn: () => getOrderReview(orderId),
    });

    const mutation = useMutation({
        mutationFn: () => {
            const data = {
                rating: rating as number,
                comment: comment.trim(),
                tags,
                photoAssetIds: [...retainedPhotos, ...photoUpload.uploadedAssetIds],
            };
            return review
                ? updateOrderReview(orderId, data)
                : createOrderReview(orderId, data);
        },
        onSuccess: (createdReview) => {
            queryClient.invalidateQueries({ queryKey: ["providerReviews", createdReview.toId] });
            queryClient.setQueryData(["orderReview", orderId], createdReview);
            if (compact) setSent(true);
            else setOpen(false);
            photoUpload.clearPhotos();
            setRating(null);
            setComment("");
            setTags([]);
        },
        onError: () => setFormError("Не удалось сохранить отзыв. Попробуйте ещё раз."),
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteOrderReview(orderId),
        onSuccess: () => {
            queryClient.setQueryData(["orderReview", orderId], null);
            if (review?.toId) {
                queryClient.invalidateQueries({ queryKey: ["providerReviews", review.toId] });
            }
            setDeleteOpen(false);
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "Не удалось удалить отзыв",
            );
        },
    });

    if (isLoading) return null;

    const closeEditor = () => {
        if (mutation.isPending) return;
        setOpen(false);
        setSent(false);
        setFormError("");
        photoUpload.clearPhotos();
    };
    const openEditor = () => {
        photoUpload.clearPhotos();
        setRetainedPhotos(review?.photoAssetIds ?? []);
        setFormError("");
        setSent(false);
        setRating(review?.rating ?? null);
        setComment(review?.comment ?? "");
        setTags(review?.tags ?? []);
        setOpen(true);
    };

    const reviewContent = review ? (
        <Stack
            spacing={1}
            sx={{ pt: 1, borderTop: `1px solid ${theme.palette.base.generic}` }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, fontWeight: 700 }}>
                    Ваш отзыв
                </Typography>
                <Rating value={review.rating} readOnly size="small" />
            </Stack>
            {review.comment && (
                <Typography
                    sx={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: theme.palette.text.primary,
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {review.comment}
                </Typography>
            )}
            {review.tags && review.tags.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {review.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                </Stack>
            )}
            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    onClick={openEditor}
                    sx={{
                        flex: 1,
                        minHeight: 36,
                        borderColor: theme.palette.actions.brand,
                        color: theme.palette.actions.brandHeavy,
                        textTransform: "none",
                        fontWeight: 700,
                    }}
                >
                    Изменить отзыв
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteOpen(true)}
                    sx={{
                        minHeight: 36,
                        borderWidth: 1.5,
                        backgroundColor: "#fff7f7",
                        textTransform: "none",
                        fontWeight: 700,
                        "&:hover": {
                            borderWidth: 1.5,
                            backgroundColor: "#feecec",
                        },
                    }}
                >
                    Удалить
                </Button>
            </Stack>
        </Stack>
    ) : null;

    const button = (
        <Button
            variant="outlined"
            onClick={openEditor}
            fullWidth={variant === "chat"}
            sx={{
                mt: variant === "booking" ? 0.25 : 0,
                minHeight: 40,
                borderColor: theme.palette.actions.brand,
                color: theme.palette.actions.brandHeavy,
                textTransform: "none",
                fontWeight: 800,
                "&:hover": {
                    borderColor: theme.palette.actions.brandHeavy,
                    backgroundColor: theme.palette.success.light,
                },
            }}
        >
            Оставить отзыв
        </Button>
    );

    return (
        <>
            {review ? (
                reviewContent
            ) : variant === "chat" ? (
                <Box
                    sx={{
                        mt: 0.75,
                        p: 1.25,
                        borderRadius: "14px",
                        backgroundColor: "#fffaf0",
                        border: "1px solid #f5d99a",
                    }}
                >
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#8a5a00" }}>
                        Заказ завершён
                    </Typography>
                    <Typography sx={{ mt: 0.35, mb: 1, fontSize: 12, color: "#7a6540" }}>
                        Поделитесь впечатлениями об исполнителе — это займёт меньше минуты.
                    </Typography>
                    {button}
                </Box>
            ) : (
                button
            )}

            <Dialog
                open={open}
                onClose={closeEditor}
                fullWidth
                maxWidth="xs"
                PaperProps={{ sx: compact ? { m: 2, width: "calc(100% - 32px)", borderRadius: "12px" } : undefined }}
            >
                {sent ? <>
                    <DialogTitle>Отзыв отправлен</DialogTitle>
                    <DialogContent>Спасибо, что поделились впечатлениями.</DialogContent>
                    <DialogActions><Button onClick={closeEditor}>Готово</Button></DialogActions>
                </> : <>
                <DialogTitle>{review ? "Изменить отзыв" : "Оставить отзыв"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} alignItems={compact ? "stretch" : "center"} sx={{ pt: 1 }}>
                        {compact && <Typography sx={{ fontSize: 12 }}>Ваша оценка</Typography>}
                        <Rating
                            value={rating}
                            onChange={(_, value) => setRating(value)}
                            size="large"
                        />
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                            {rating ? REVIEW_LABELS[rating] : "Выберите оценку"}
                        </Typography>
                        {!compact && <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center">
                            {REVIEW_TAGS.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    clickable
                                    color={tags.includes(tag) ? "success" : "default"}
                                    variant={tags.includes(tag) ? "filled" : "outlined"}
                                    onClick={() =>
                                        setTags((current) =>
                                            current.includes(tag)
                                                ? current.filter((item) => item !== tag)
                                                : [...current, tag],
                                        )
                                    }
                                />
                            ))}
                        </Stack>}
                        <TextField
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            label={compact ? "Ваш отзыв (необязательно)" : "Комментарий"}
                            placeholder="Расскажите о результате — это поможет другим клиентам"
                            multiline
                            minRows={3}
                            fullWidth
                            inputProps={{ maxLength: 2000 }}
                        />
                        <Typography sx={{ fontSize: 12 }}>Фотографии (необязательно, до 10 фото)</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            {retainedPhotos.map((id, index) => <Box key={id} sx={{ position: "relative" }}>
                                {review?.photoUrls?.[index] && <Box component="img" sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 2 }} src={review.photoUrls[index]} alt="" />}
                                <Button size="small" onClick={() => setRetainedPhotos((current) => current.filter((value) => value !== id))}>Убрать фото</Button>
                            </Box>)}
                            {photoUpload.photos.map((photo) => <Box key={photo.id}>
                                <Box component="img" sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 2 }} src={photo.previewUrl} alt="" />
                                <Button size="small" onClick={() => photoUpload.removePhoto(photo.id)}>{photo.error ? "Убрать фото с ошибкой" : "Убрать фото"}</Button>
                            </Box>)}
                            {retainedPhotos.length + photoUpload.photos.length < 10 && <Button component="label" variant="outlined" sx={{ width: 72, minHeight: 72, borderStyle: "dashed", textTransform: "none" }}>
                                + Фото
                                <input hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                                    const files = Array.from(event.target.files ?? []);
                                    if (files.length + retainedPhotos.length + photoUpload.photos.length > 10) {
                                        setFormError("Можно добавить до 10 фотографий.");
                                    } else {
                                        setFormError("");
                                        photoUpload.addPhotos(files);
                                    }
                                    event.target.value = "";
                                }} />
                            </Button>}
                        </Stack>
                        {formError && <Alert severity="error">{formError}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeEditor} disabled={mutation.isPending}>
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (!rating) { setFormError("Выберите оценку."); return; }
                            if (photoUpload.photos.some((photo) => photo.error)) { setFormError("Уберите фото, которые не загрузились."); return; }
                            setFormError("");
                            mutation.mutate();
                        }}
                        disabled={photoUpload.isUploading || mutation.isPending}
                    >
                        {mutation.isPending ? "Отправляем…" : review ? "Сохранить изменения" : "Отправить отзыв"}
                    </Button>
                </DialogActions>
                </>}
            </Dialog>

            <Dialog
                open={deleteOpen}
                onClose={() => !deleteMutation.isPending && setDeleteOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Удалить отзыв?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: theme.palette.text.secondary }}>
                        Оценка, комментарий и теги будут удалены, а рейтинг исполнителя пересчитан.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteOpen(false)}
                        disabled={deleteMutation.isPending}
                    >
                        Отмена
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                    >
                        Удалить отзыв
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
