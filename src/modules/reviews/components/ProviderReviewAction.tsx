import { useQuery } from "@tanstack/react-query";
import { useUserProfile } from "@common/hooks";
import { getCustomerOrders } from "@modules/chats/api";
import type { Review } from "../api";
import { OrderReviewPrompt } from "./OrderReviewPrompt";

export function ProviderReviewAction({ providerId, reviews }: { providerId: string; reviews: Review[] }) {
    const loggedIn = Boolean(localStorage.getItem("accessToken"));
    const { profile } = useUserProfile({ enabled: loggedIn });
    const { data: orders } = useQuery({
        queryKey: ["customerBookings", profile?.id],
        queryFn: getCustomerOrders,
        enabled: Boolean(profile?.id && profile.id !== providerId),
    });
    const reviewed = new Set(reviews.filter((review) => review.fromId === profile?.id).map((review) => review.orderId));
    const eligible = (orders ?? []).filter((order) =>
        order.status === "completed" && order.provider?.id === providerId && !reviewed.has(order.id),
    ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    // Keep the dialog mounted while the public reviews list refreshes after submit.
    const fallback = orders?.find((order) => order.status === "completed" && order.provider?.id === providerId);
    const order = eligible[0] ?? fallback;
    if (!order) return null;
    return <OrderReviewPrompt orderId={order.id} variant="profile" />;
}

export function ReviewPhotos({ urls }: { urls?: string[] }) {
    if (!urls?.length) return null;
    return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Фото к отзыву" width={64} height={64} loading="lazy"
                style={{ borderRadius: 8, objectFit: "cover" }} />
        </a>)}
    </div>;
}
