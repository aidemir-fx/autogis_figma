import { http } from "@common/lib/http";
import { getAccountAvatars } from "@modules/media/api";

export type ReviewAuthor = {
    id: string;
    name?: string | null;
    phone?: string;
    avatarUrl?: string | null;
};

export type Review = {
    id: string;
    fromId: string;
    from?: ReviewAuthor | null;
    toId: string;
    orderId?: string;
    rating: number;
    comment: string;
    tags?: string[];
    createdAt: string;
};

export type CreateReviewData = {
    rating: number;
    comment?: string;
    tags?: string[];
};

export async function getOrderReview(orderId: string): Promise<Review | null> {
    const response = await http.get<Review | null>(`/orders/${orderId}/review`);
    return response.data ?? null;
}

export async function createOrderReview(
    orderId: string,
    data: CreateReviewData,
): Promise<Review> {
    const response = await http.post<Review>(`/orders/${orderId}/review`, data);
    return response.data;
}

export async function deleteOrderReview(orderId: string): Promise<void> {
    await http.delete(`/orders/${orderId}/review`);
}

export async function updateOrderReview(
    orderId: string,
    data: CreateReviewData,
): Promise<Review> {
    const response = await http.put<Review>(`/orders/${orderId}/review`, data);
    return response.data;
}

export async function getProviderReviews(providerUserId: string): Promise<Review[]> {
    const response = await http.get<Review[]>(`/reviews/${providerUserId}`);
    const reviews = response.data ?? [];
    const avatarMap = await getAccountAvatars(reviews.map((review) => review.fromId));

    return reviews.map((review) => ({
        ...review,
        from: review.from
            ? {
                  ...review.from,
                  avatarUrl: avatarMap[review.from.id] ?? null,
              }
            : review.from,
    }));
}
