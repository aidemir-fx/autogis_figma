import { http } from "@common/lib/http";
import { getAccountAvatars } from "@modules/media/api";
import { OrderTimePreference } from "@modules/orders/api";

export type OrderStatus = "new" | "in_progress" | "completed" | "cancelled";
export type NormalizedOrderStatus =
    | "pending"
    | "scheduled"
    | "completed"
    | "cancelled";

export interface ChatUser {
    id: string;
    name?: string;
    phone: string;
    avatarUrl?: string | null;
}

export interface ActivityTypeInfo {
    id: string;
    name: string;
    displayName: string;
}

export interface ChatOrder {
    id: string;
    status: NormalizedOrderStatus;
    name: string;
    carBrand: string;
    description: string;
    timePreference?: OrderTimePreference;
    phone: string;
    price?: number;
    photoAssetIds?: string[];
    confirmedDateTime?: string;
    cancelReason?: string;
    chatId?: string;
    createdAt: string;
    updatedAt?: string;
    customer: ChatUser;
    provider?: ChatUser;
    activityType: ActivityTypeInfo;
}

export interface ChatMessage {
    id: string;
    message: string;
    createdAt: string;
    status: "sent" | "delivered" | "read";
    sender: ChatUser;
    isEdited?: boolean;
}

export interface OrderChatResponse {
    order: ChatOrder;
    messages: ChatMessage[];
}

function normalizeOrderStatus(status: string): NormalizedOrderStatus {
    if (status === "pending") return "pending";
    if (status === "scheduled") return "scheduled";
    if (status === "new") return "pending";
    if (status === "in_progress") return "scheduled";
    if (status === "completed" || status === "cancelled") return status;
    return "pending";
}

function toBackendOrderStatus(status: NormalizedOrderStatus): NormalizedOrderStatus {
    return status;
}

function normalizeOrder(order: ChatOrder): ChatOrder {
    return {
        ...order,
        status: normalizeOrderStatus(order.status),
    };
}

function withAvatar(user: ChatUser, avatarMap: Record<string, string | null>): ChatUser {
    return { ...user, avatarUrl: avatarMap[user.id] ?? null };
}

async function applyAvatarsToOrders(orders: ChatOrder[]): Promise<ChatOrder[]> {
    if (orders.length === 0) return orders;
    const accountIds = orders.flatMap((order) =>
        [order.customer?.id, order.provider?.id].filter(
            (id): id is string => Boolean(id),
        ),
    );
    const avatarMap = await getAccountAvatars(accountIds);
    return orders.map((order) => ({
        ...order,
        customer: order.customer
            ? withAvatar(order.customer, avatarMap)
            : order.customer,
        provider: order.provider
            ? withAvatar(order.provider, avatarMap)
            : order.provider,
    }));
}

async function applyAvatarsToOrder(order: ChatOrder): Promise<ChatOrder> {
    const accountIds = [order.customer?.id, order.provider?.id].filter(
        (id): id is string => Boolean(id),
    );
    const avatarMap = await getAccountAvatars(accountIds);
    return {
        ...order,
        customer: order.customer
            ? withAvatar(order.customer, avatarMap)
            : order.customer,
        provider: order.provider
            ? withAvatar(order.provider, avatarMap)
            : order.provider,
    };
}

export async function getCustomerOrders(): Promise<ChatOrder[]> {
    const response = await http.get("/orders/my");
    const orders = (response.data as ChatOrder[]).map(normalizeOrder);
    return applyAvatarsToOrders(orders);
}

export async function getProviderOrders(): Promise<ChatOrder[]> {
    const response = await http.get("/orders/provider");
    const orders = (response.data as ChatOrder[]).map(normalizeOrder);
    return applyAvatarsToOrders(orders);
}

export async function getOrderById(orderId: string): Promise<ChatOrder> {
    const response = await http.get(`/orders/${orderId}`);
    const order = normalizeOrder(response.data as ChatOrder);
    return applyAvatarsToOrder(order);
}

export async function updateOrderStatus(
    orderId: string,
    payload: {
        status: NormalizedOrderStatus;
        confirmedDateTime?: string;
        cancelReason?: string;
        expectedUpdatedAt?: string;
    }
): Promise<ChatOrder> {
    const response = await http.put(`/orders/${orderId}/status`, {
        ...payload,
        status: toBackendOrderStatus(payload.status),
    });
    const order = normalizeOrder(response.data as ChatOrder);
    return applyAvatarsToOrder(order);
}

export async function getOrderChat(orderId: string): Promise<OrderChatResponse> {
    const response = await http.get(`/chat-messages/order/${orderId}`);
    const data = response.data as OrderChatResponse;
    const order = await applyAvatarsToOrder(data.order);
    return {
        ...data,
        order,
        messages: applyLocalMessageEdits(orderId, data.messages ?? []),
    };
}

export async function sendOrderMessage(
    orderId: string,
    message: string
): Promise<ChatMessage> {
    const response = await http.post(`/chat-messages/order/${orderId}`, {
        message,
    });
    return response.data;
}

export interface UnreadCount {
    orderId: string;
    chatId?: string;
    count: number;
}

const CHAT_MESSAGE_EDIT_STORAGE_KEY = "autogis.chat.editedMessages.v1";

function readEditedMessages(): Record<string, Record<string, string>> {
    try {
        const raw = localStorage.getItem(CHAT_MESSAGE_EDIT_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function persistEditedMessages(nextValue: Record<string, Record<string, string>>) {
    try {
        localStorage.setItem(CHAT_MESSAGE_EDIT_STORAGE_KEY, JSON.stringify(nextValue));
    } catch {
        // ignore storage issues in private mode or restricted environments
    }
}

function applyLocalMessageEdits(orderId: string, messages: ChatMessage[]): ChatMessage[] {
    const edits = readEditedMessages()[orderId] ?? {};
    if (!Object.keys(edits).length) return messages;

    return messages.map((message) => {
        const updatedText = edits[message.id];
        if (!updatedText) return message;
        return { ...message, message: updatedText, isEdited: true };
    });
}

export function saveEditedMessageText(orderId: string, messageId: string, nextText: string) {
    const trimmed = nextText.trim();
    if (!trimmed) return;

    const all = readEditedMessages();
    const orderEdits = all[orderId] ?? {};
    orderEdits[messageId] = trimmed;
    all[orderId] = orderEdits;
    persistEditedMessages(all);
}

export async function getUnreadCounts(): Promise<UnreadCount[]> {
    try {
        const response = await http.get("/chat-messages/unread-count");
        return response.data ?? [];
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 404) {
            return [];
        }
        throw error;
    }
}
