import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@common/hooks";
import { getUnreadCounts, OrderChatResponse, UnreadCount } from "../api";

/**
 * Считает суммарное количество непрочитанных сообщений по всем чатам.
 *
 * Стратегия двух слоёв:
 * 1. Базовый слой — GET /chat-messages/unread-count (polling 30 сек).
 *    Работает всегда, даже если чаты никогда не открывались.
 * 2. Оверлей кэша — для чатов, уже загруженных в React Query, берём
 *    актуальные данные прямо из кэша (обновляются по WS мгновенно).
 *    Это позволяет badge реагировать на incoming WS-сообщение без ожидания poll.
 */
export function useUnreadChatsCount(enabled = true): number {
    const queryClient = useQueryClient();
    const accessToken =
        typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
    const { profile } = useUserProfile({ enabled });
    const shouldFetch = enabled && !!accessToken && !!profile?.id;

    // Базовый слой: polling сервера
    const { data: serverCounts } = useQuery<UnreadCount[]>({
        queryKey: ["unreadCounts"],
        queryFn: getUnreadCounts,
        enabled: shouldFetch,
        refetchInterval: 30_000,
        staleTime: 15_000,
        retry: false,
    });

    // Оверлей: слушаем изменения кэша, чтобы мгновенно реагировать на WS
    const [cacheRevision, setCacheRevision] = useState(0);
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event?.query?.queryKey?.[0] === "orderChat") {
                setCacheRevision((n) => n + 1);
            }
        });
        return unsubscribe;
    }, [queryClient]);

    return useMemo(() => {
        if (!shouldFetch || !profile?.id) return 0;

        // Строим map из серверных данных
        const countByChat = new Map<string, number>(
            (serverCounts ?? []).map((c) => [c.chatId || c.orderId, c.count])
        );

        // Для каждого закэшированного чата перетираем серверное значение
        // точными данными из кэша (они всегда свежее, т.к. обновляются по WS)
        const cachedQueries = queryClient.getQueriesData<OrderChatResponse>({
            queryKey: ["orderChat"],
        });
        for (const [, chat] of cachedQueries) {
            if (!chat) continue;
            const orderId = chat.order?.id;
            if (!orderId) continue;
            const chatKey = chat.order.chatId || orderId;
            const unread = chat.messages.filter(
                (m) => m.sender.id !== profile.id && m.status !== "read"
            ).length;
            countByChat.set(chatKey, unread);
        }

        // Учитываем локально прочитанные пользователем чаты
        try {
            const raw = typeof window !== "undefined" ? window.localStorage.getItem("autogis.chat.readOrderIds.v1") : null;
            if (raw) {
                const readIds: string[] = JSON.parse(raw);
                if (Array.isArray(readIds)) {
                    for (const orderId of readIds) {
                        const cached = queryClient.getQueryData<OrderChatResponse>(["orderChat", orderId]);
                        if (cached) {
                            const unread = cached.messages.filter(
                                (m) => m.sender.id !== profile.id && m.status !== "read"
                            ).length;
                            countByChat.set(cached.order.chatId || orderId, unread);
                        } else {
                            countByChat.set(orderId, 0);
                        }
                    }
                }
            }
        } catch {
            // ignore JSON error
        }

        let total = 0;
        countByChat.forEach((c) => (total += c));
        return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverCounts, cacheRevision, profile?.id, queryClient, shouldFetch]);
}
