import { Box, Typography } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useQuery } from "@tanstack/react-query";
import { getOrderReview } from "@modules/reviews/api";

type OrderRatingBadgeProps = {
    orderId: string;
};

export function OrderRatingBadge({ orderId }: OrderRatingBadgeProps) {
    const { data: review } = useQuery({
        queryKey: ["orderReview", orderId],
        queryFn: () => getOrderReview(orderId),
        staleTime: 60_000,
    });

    if (!review) return null;

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.15,
                color: "#d97706",
            }}
            aria-label={`Оценка за заказ: ${review.rating.toFixed(1)}`}
        >
            <StarRoundedIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
                {review.rating.toFixed(1)}
            </Typography>
        </Box>
    );
}
