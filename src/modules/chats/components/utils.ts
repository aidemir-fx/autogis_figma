import { ChatMessage, ChatOrder, ChatUser } from "@modules/chats/api";

export function formatRelativeTime(value: string) {
    const now = Date.now();
    const date = new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.floor((now - date) / 60000));

    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;

    return new Date(value).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
    });
}

export function getCompanion(order: ChatOrder, userId?: string): ChatUser {
    if (!userId) return order.provider ?? order.customer;
    if (order.customer?.id === userId) {
        return order.provider ?? {
            id: "unknown-provider",
            phone: "Исполнитель",
            name: "Исполнитель",
        };
    }
    return order.customer ?? {
        id: "unknown-customer",
        phone: "Заказчик",
        name: "Заказчик",
    };
}

export function getStatusLabel(status: ChatMessage["status"]) {
    if (status === "read") return "Прочитано";
    if (status === "delivered") return "Доставлено";
    return "Отправлено";
}

export function getInitialLabel(nameOrPhone?: string) {
    return (nameOrPhone || "?").slice(0, 1).toUpperCase();
}

const AVATAR_GRADIENTS = [
    "linear-gradient(135deg, #60a5fa 0%, #4a7cff 100%)",
    "linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
    "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
];

export function getAvatarGradient(seed?: string): string {
    const source = seed || "?";
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    }
    return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
