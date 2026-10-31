import { useState } from "react";
import {
    Box,
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
    variant?: "booking" | "chat";
};

export function OrderReviewPrompt({
    orderId,
    variant = "booking",
}: OrderReviewPromptProps) {
    const queryClient = useQueryClient();
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
            };
            return review
                ? updateOrderReview(orderId, data)
                : createOrderReview(orderId, data);
        },
        onSuccess: (createdReview) => {
            queryClient.setQueryData(["orderReview", orderId], createdReview);
            setOpen(false);
            setRating(null);
            setComment("");
            setTags([]);
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    (review ? "Не удалось сохранить отзыв" : "Не удалось отправить отзыв"),
            );
        },
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

    const openEditor = () => {
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
            onClick={() => {
                setRating(null);
                setComment("");
                setTags([]);
                setOpen(true);
            }}
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
                onClose={() => !mutation.isPending && setOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{review ? "Изменить отзыв" : "Как прошёл заказ?"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} alignItems="center" sx={{ pt: 1 }}>
                        <Rating
                            value={rating}
                            onChange={(_, value) => setRating(value)}
                            size="large"
                        />
                        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
                            {rating ? REVIEW_LABELS[rating] : "Выберите оценку"}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center">
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
                        </Stack>
                        <TextField
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            label="Комментарий"
                            placeholder="Расскажите о результате — это поможет другим клиентам"
                            multiline
                            minRows={3}
                            fullWidth
                            inputProps={{ maxLength: 2000 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpen(false)} disabled={mutation.isPending}>
                        Позже
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => mutation.mutate()}
                        disabled={!rating || mutation.isPending}
                    >
                        {review ? "Сохранить изменения" : "Отправить отзыв"}
                    </Button>
                </DialogActions>
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
