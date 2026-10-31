import { http } from "@common/lib/http";

export type OrderTimePreference = "urgent" | "not_urgent";

export const ORDER_TIME_PREFERENCE_LABELS: Record<OrderTimePreference, string> = {
    urgent: "Срочно",
    not_urgent: "Не срочно",
};

export interface CreateOrderData {
    providerIds: string[];
    activityTypeId: string;
    name: string;
    phone: string;
    carBrand: string;
    description: string;
    timePreference: OrderTimePreference;
    photoAssetIds?: string[];
}

export interface Order {
    id: string;
    customer: any;
    provider: any;
    activityType: any;
    status: string;
    name: string;
    phone: string;
    carBrand: string;
    description: string;
    timePreference?: OrderTimePreference;
    photoAssetIds?: string[];
    price?: number;
    createdAt: string;
    updatedAt: string;
}

export async function createOrder(data: CreateOrderData): Promise<Order> {
    const response = await http.post("/orders", data);
    return response.data;
}

export async function getActivityTypeByName(name: string): Promise<{ id: string; name: string; displayName: string }> {
    const response = await http.get<
        Array<{ id: string; name: string; displayName: string }>
    >(`/activity-types`);
    const found = response.data.find((activityType) => activityType.name === name);
    if (!found) {
        throw new Error(`Activity type "${name}" not found`);
    }
    return found;
}

export async function acceptOrderInvitation(orderId: string): Promise<Order> {
    const response = await http.post(`/orders/${orderId}/accept`);
    return response.data;
}
