import { AdminSupportList } from "@modules/chats/components/AdminSupportList";
import { SupportChat } from "@modules/chats/components/SupportChat";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, useMediaQuery } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasCapability } from "@common/lib/userAccess";
import { goBackOrNavigate } from "@common/lib/navigation";
import { useUserProfile } from "@common/hooks";
import {
    ChatMessage,
    ChatOrder,
    getCustomerOrders,
    getOrderChat,
    OrderChatResponse,
    getProviderOrders,
    saveEditedMessageText,
    sendOrderMessage,
    getUnreadCounts,
    UnreadCount,
} from "@modules/chats/api";
import {
    ChatList,
    ChatRoom,
    formatRelativeTime,
    getCompanion,
    getStatusLabel,
} from "@modules/chats/components";
import {
    ChatMessageStatusEvent,
    ChatRealtimeEvent,
    useChatTyping,
    useRealtimeChat,
} from "@modules/chats/hooks";
import { COMPACT_LAYOUT_MEDIA_QUERY } from "@modules/layout/features/layoutViewport";

type ChatTab = "ordinary" | "professional" | "archive" | "support";
type ChatView = "list" | "chat";

const ARCHIVE_ORDER_STORAGE_KEY = "autogis.chat.archiveOrderIds.v1";
const READ_ORDER_STORAGE_KEY = "autogis.chat.readOrderIds.v1";

function directChatKey(order: { chatId?: string; customer?: { id?: string }; provider?: { id?: string } }) {
    if (order.chatId) return order.chatId;
    const ids = [order.customer?.id, order.provider?.id].filter(Boolean).sort();
    return ids.join(":") || "order";
}

function uniqueDirectChats(orders: ChatOrder[], preferredOrderId?: string | null): ChatOrder[] {
    const result = new Map<string, ChatOrder>();
    for (const order of orders) {
        const key = directChatKey(order);
        const current = result.get(key);
        if (
            !current ||
            order.id === preferredOrderId ||
            (current.id !== preferredOrderId &&
                new Date(order.createdAt).getTime() > new Date(current.createdAt).getTime())
        ) {
            result.set(key, order);
        }
    }
    return Array.from(result.values());
}

function getStoredReadOrderIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(READ_ORDER_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
        return [];
    }
}

export function Chats() {
    const navigate = useNavigate();
    const isMobile = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { profile } = useUserProfile();

    const hasExplicitTab = searchParams.has("tab");
    const requestedOrderId = searchParams.get("orderId");
    const tabParam =
        searchParams.get("tab") === "professional"
            ? "professional"
            : searchParams.get("tab") === "archive"
              ? "archive"
                            : searchParams.get("tab") === "support"
                                ? "support"
              : "ordinary";

    const [message, setMessage] = useState("");
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [view, setView] = useState<ChatView>("list");
    const [archiveOrderIds, setArchiveOrderIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(ARCHIVE_ORDER_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
        } catch {
            return [];
        }
    });

    const [readOrderIds, setReadOrderIds] = useState<string[]>(getStoredReadOrderIds);

    const markOrderAsReadLocally = useCallback(
        (orderId: string) => {
            setReadOrderIds((prev) => {
                if (prev.includes(orderId)) return prev;
                const updated = [...prev, orderId];
                if (typeof window !== "undefined") {
                    try {
                        window.localStorage.setItem(READ_ORDER_STORAGE_KEY, JSON.stringify(updated));
                    } catch {
                        // ignore quota error
                    }
                }
                return updated;
            });

            queryClient.setQueryData<UnreadCount[]>(["unreadCounts"], (old) =>
                (old ?? []).filter((item) => item.orderId !== orderId)
            );

            queryClient.setQueryData<OrderChatResponse>(["orderChat", orderId], (current) => {
                if (!current) return current;
                let changed = false;
                const updated = current.messages.map((item) => {
                    if (item.sender.id !== profile?.id && item.status !== "read") {
                        changed = true;
                        return { ...item, status: "read" as const };
                    }
                    return item;
                });
                return changed ? { ...current, messages: updated } : current;
            });
        },
        [profile?.id, queryClient]
    );

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const hasProfessionalChatAccess = hasCapability(
        profile,
        "professionalChat",
    );

    const { data: customerOrders, isLoading: isCustomerOrdersLoading } = useQuery({
        queryKey: ["customerOrdersForChat", profile?.id],
        queryFn: getCustomerOrders,
        enabled: !!profile?.id,
    });

    const { data: providerOrders, isLoading: isProviderOrdersLoading } = useQuery({
        queryKey: ["providerOrdersForChat", profile?.id],
        queryFn: getProviderOrders,
        enabled: !!profile?.id && hasProfessionalChatAccess,
    });

    const { data: serverUnreadCounts } = useQuery<UnreadCount[]>({
        queryKey: ["unreadCounts"],
        queryFn: getUnreadCounts,
        enabled: !!profile?.id,
        refetchInterval: 30_000,
        staleTime: 15_000,
        retry: false,
    });

    const serverUnreadMap = useMemo(
        () => new Map<string, number>((serverUnreadCounts ?? []).map((c) => [c.orderId, c.count])),
        [serverUnreadCounts]
    );
    const serverUnreadChatMap = useMemo(
        () =>
            new Map<string, number>(
                (serverUnreadCounts ?? [])
                    .filter((count) => Boolean(count.chatId))
                    .map((count) => [count.chatId as string, count.count]),
            ),
        [serverUnreadCounts],
    );

    const customerOrderIds = useMemo(
        () => new Set((customerOrders ?? []).map((order) => order.id)),
        [customerOrders]
    );

    const providerOrderIds = useMemo(
        () => new Set((providerOrders ?? []).map((order) => order.id)),
        [providerOrders]
    );

    const getEffectiveUnread = useCallback(
        (orderId: string): number => {
            if (selectedOrderId === orderId) return 0;

            const cachedChat = queryClient.getQueryData<OrderChatResponse>(["orderChat", orderId]);
            if (cachedChat) {
                const unreadInCache = cachedChat.messages.filter(
                    (item) => item.sender.id !== profile?.id && item.status !== "read"
                ).length;
                if (unreadInCache === 0 || readOrderIds.includes(orderId)) {
                    return 0;
                }
                return unreadInCache;
            }

            if (readOrderIds.includes(orderId)) {
                return 0;
            }

            const order = (customerOrders ?? []).find((item) => item.id === orderId) ??
                (providerOrders ?? []).find((item) => item.id === orderId);
            return serverUnreadMap.get(orderId) ??
                (order?.chatId ? serverUnreadChatMap.get(order.chatId) : 0) ??
                0;
        },
        [customerOrders, profile?.id, providerOrders, queryClient, readOrderIds, selectedOrderId, serverUnreadChatMap, serverUnreadMap]
    );

    const unreadProviderCount = useMemo(() => {
        let total = 0;
        for (const order of uniqueDirectChats(providerOrders ?? [])) {
            total += getEffectiveUnread(order.id);
        }
        return total;
    }, [getEffectiveUnread, providerOrderIds, providerOrders]);

    const archiveOrders = useMemo(
        () =>
            [...(customerOrders ?? []), ...(providerOrders ?? [])].filter((order) =>
                archiveOrderIds.includes(order.id)
            ),
        [archiveOrderIds, customerOrders, providerOrders]
    );

    const allActiveOrders = useMemo(() => {
        const visibleCustomerOrders = (customerOrders ?? []).filter(
            (order) => !archiveOrderIds.includes(order.id)
        );
        const visibleProviderOrders = (providerOrders ?? []).filter(
            (order) => !archiveOrderIds.includes(order.id)
        );

        if (tabParam === "professional") return visibleProviderOrders;
        if (tabParam === "archive") return archiveOrders;
        return visibleCustomerOrders;
    }, [archiveOrderIds, archiveOrders, customerOrders, providerOrders, tabParam]);

    const activeOrders = useMemo(
        () => uniqueDirectChats(allActiveOrders, requestedOrderId),
        [allActiveOrders, requestedOrderId],
    );

    useEffect(() => {
        if (tabParam === "professional" && !hasProfessionalChatAccess) {
            setSearchParams({ tab: "ordinary" }, { replace: true });
        }
    }, [hasProfessionalChatAccess, setSearchParams, tabParam]);

    useEffect(() => {
        if (hasExplicitTab || !hasProfessionalChatAccess) return;
        if (unreadProviderCount > 0 && tabParam !== "professional") {
            setSearchParams({ tab: "professional" }, { replace: true });
        }
    }, [
        hasExplicitTab,
        hasProfessionalChatAccess,
        tabParam,
        unreadProviderCount,
        setSearchParams,
    ]);

    useEffect(() => {
        if (!requestedOrderId) return;

        if (
            hasProfessionalChatAccess &&
            providerOrderIds.has(requestedOrderId) &&
            tabParam !== "professional"
        ) {
            setSearchParams({ tab: "professional" }, { replace: true });
            return;
        }

        if (customerOrderIds.has(requestedOrderId) && tabParam !== "ordinary") {
            setSearchParams({ tab: "ordinary" }, { replace: true });
        }
    }, [
        customerOrderIds,
        hasProfessionalChatAccess,
        providerOrderIds,
        requestedOrderId,
        setSearchParams,
        tabParam,
    ]);

    useEffect(() => {
        try {
            window.localStorage.setItem(ARCHIVE_ORDER_STORAGE_KEY, JSON.stringify(archiveOrderIds));
        } catch {
            // ignore storage failures
        }
    }, [archiveOrderIds]);

    useEffect(() => {
        if (tabParam === "archive") {
            if (requestedOrderId) {
                const hasRequested = archiveOrders.some((order) => order.id === requestedOrderId);
                if (hasRequested) {
                    if (selectedOrderId !== requestedOrderId) {
                        setSelectedOrderId(requestedOrderId);
                    }
                    setView("chat");
                    return;
                }
            }

            if (!selectedOrderId) {
                setView("list");
                return;
            }

            const hasSelected = archiveOrders.some((order) => order.id === selectedOrderId);
            if (hasSelected) {
                setView("chat");
                return;
            }

            setSelectedOrderId(null);
            setView("list");
            return;
        }

        if (activeOrders.length === 0) {
            setSelectedOrderId(null);
            setView("list");
            return;
        }

        if (requestedOrderId) {
            const hasRequested = activeOrders.some((order) => order.id === requestedOrderId);
            if (hasRequested) {
                if (selectedOrderId !== requestedOrderId) {
                    setSelectedOrderId(requestedOrderId);
                }
                setView("chat");
            } else {
                setSelectedOrderId(null);
                setView("list");
            }
            return;
        }

        if (!selectedOrderId) {
            setView("list");
            return;
        }

        const hasSelected = activeOrders.some((order) => order.id === selectedOrderId);
        if (!hasSelected) {
            setSelectedOrderId(null);
            setView("list");
        }
    }, [activeOrders, archiveOrders, archiveOrderIds, isMobile, requestedOrderId, selectedOrderId, tabParam]);

    useEffect(() => {
        if (!profile?.id || !serverUnreadCounts?.length) return;

        const knownOrderIds = new Set<string>([
            ...(customerOrders ?? []).map((order) => order.id),
            ...(providerOrders ?? []).map((order) => order.id),
        ]);
        const hasUnknownUnreadOrder = serverUnreadCounts.some(
            (item) => item.count > 0 && !knownOrderIds.has(item.orderId)
        );

        if (!hasUnknownUnreadOrder) return;

        queryClient.invalidateQueries({
            queryKey: ["customerOrdersForChat", profile.id],
        });
        queryClient.invalidateQueries({
            queryKey: ["providerOrdersForChat", profile.id],
        });
        queryClient.invalidateQueries({ queryKey: ["providerOrders", profile.id] });
    }, [customerOrders, profile?.id, providerOrders, queryClient, serverUnreadCounts]);

    const { data: orderChat, isLoading: isChatLoading } = useQuery({
        queryKey: ["orderChat", selectedOrderId],
        queryFn: () => getOrderChat(selectedOrderId as string),
        enabled: !!selectedOrderId,
    });

    const updateMessageStatusInCache = useCallback(
        (payload: ChatMessageStatusEvent) => {
            const selectedCached = selectedOrderId
                ? queryClient.getQueryData<OrderChatResponse>(["orderChat", selectedOrderId])
                : undefined;
            const targetOrderId =
                payload.chatId && selectedCached?.order.chatId === payload.chatId
                    ? selectedOrderId!
                    : payload.orderId;
            queryClient.setQueryData<OrderChatResponse>(["orderChat", targetOrderId], (current) => {
                if (!current) return current;

                return {
                    ...current,
                    messages: current.messages.map((item) =>
                        item.id === payload.messageId ? { ...item, status: payload.status } : item
                    ),
                };
            });
        },
        [queryClient, selectedOrderId]
    );

    const handleNewOrderMessage = useCallback(
        (payload: ChatRealtimeEvent) => {
            const selectedCached = selectedOrderId
                ? queryClient.getQueryData<OrderChatResponse>(["orderChat", selectedOrderId])
                : undefined;
            const targetOrderId =
                payload.chatId && selectedCached?.order.chatId === payload.chatId
                    ? selectedOrderId
                    : payload.orderId;
            const cached = queryClient.getQueryData<OrderChatResponse>(["orderChat", targetOrderId]);

            if (profile?.id) {
                queryClient.invalidateQueries({
                    queryKey: ["customerOrdersForChat", profile.id],
                });
                queryClient.invalidateQueries({
                    queryKey: ["providerOrdersForChat", profile.id],
                });
                queryClient.invalidateQueries({ queryKey: ["providerOrders", profile.id] });
            }

            if (cached) {
                // Чат уже в кэше — обновляем его напрямую
                queryClient.setQueryData<OrderChatResponse>(
                    ["orderChat", targetOrderId],
                    (current) => {
                        if (!current) return current;
                        const alreadyExists = current.messages.some(
                            (item) => item.id === payload.message.id
                        );
                        if (alreadyExists) return current;
                        return {
                            ...current,
                            messages: [...current.messages, payload.message],
                        };
                    }
                );
                // Системное сообщение появляется и при смене статуса заказа.
                // Перечитываем заказ, чтобы prompt отзыва появился сразу после завершения.
                if (targetOrderId === selectedOrderId) {
                    queryClient.invalidateQueries({
                        queryKey: ["orderChat", targetOrderId],
                    });
                }
            } else {
                // Чат не открывался — инвалидируем серверный счётчик
                // чтобы badge в BottomNav обновился без ожидания polling'а
                queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
            }

            if (targetOrderId === selectedOrderId) {
                markOrderAsReadLocally(targetOrderId as string);
            } else {
                setReadOrderIds((prev) => {
                    if (!prev.includes(payload.orderId)) return prev;
                    const updated = prev.filter((id) => id !== payload.orderId);
                    if (typeof window !== "undefined") {
                        try {
                            window.localStorage.setItem(READ_ORDER_STORAGE_KEY, JSON.stringify(updated));
                        } catch {
                            // ignore
                        }
                    }
                    return updated;
                });
            }
        },
        [markOrderAsReadLocally, profile?.id, queryClient, selectedOrderId]
    );

    const handleMessageStatusUpdated = useCallback(
        (payload: ChatMessageStatusEvent) => {
            updateMessageStatusInCache(payload);
        },
        [updateMessageStatusInCache]
    );

    const {
        isRealtimeConnected,
        typingByOrder,
        emitTypingEvent,
        sendMessageViaSocket,
    } = useRealtimeChat({
        profileId: profile?.id,
        selectedOrderId,
        onNewOrderMessage: handleNewOrderMessage,
        onMessageStatusUpdated: handleMessageStatusUpdated,
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [orderChat?.messages.length, selectedOrderId]);

    const { onInputChange: handleTypingInputChange, stopTyping } = useChatTyping({
        selectedOrderId,
        emitTypingEvent,
    });

    const handleMessageChange = (nextValue: string) => {
        setMessage(nextValue);
        handleTypingInputChange(nextValue);
    };

    const sendMessageMutation = useMutation({
        mutationFn: async ({ orderId, text }: { orderId: string; text: string }) => {
            try {
                return await sendMessageViaSocket(orderId, text);
            } catch {
                return sendOrderMessage(orderId, text);
            }
        },
        onSuccess: (newMessage: ChatMessage, variables) => {
            setMessage("");
            queryClient.setQueryData<OrderChatResponse>(
                ["orderChat", variables.orderId],
                (current) => {
                    if (!current) return current;
                    const alreadyExists = current.messages.some(
                        (item) => item.id === newMessage.id
                    );
                    if (alreadyExists) return current;

                    return {
                        ...current,
                        messages: [...current.messages, newMessage],
                    };
                }
            );
        },
    });

    useEffect(() => {
        if (selectedOrderId) {
            markOrderAsReadLocally(selectedOrderId);
        }
    }, [selectedOrderId, markOrderAsReadLocally]);

    useEffect(() => {
        if (!selectedOrderId || !orderChat) return;
        const hasUnread = orderChat.messages.some(
            (item) => item.sender.id !== profile?.id && item.status !== "read"
        );
        if (hasUnread) {
            markOrderAsReadLocally(selectedOrderId);
        }
    }, [orderChat, profile?.id, selectedOrderId, markOrderAsReadLocally]);

    const openChat = async (orderId: string) => {
        setSelectedOrderId(orderId);
        setView("chat");
        markOrderAsReadLocally(orderId);

        await queryClient.prefetchQuery({
            queryKey: ["orderChat", orderId],
            queryFn: () => getOrderChat(orderId),
        });

        markOrderAsReadLocally(orderId);
        // После загрузки чата сервер пометил сообщения как read —
        // инвалидируем серверный счётчик, чтобы badge сразу упал
        queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
    };

    const handleSend = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = message.trim();
        if (!trimmed || !selectedOrderId) return;

        stopTyping();
        sendMessageMutation.mutate({ orderId: selectedOrderId, text: trimmed });
    };

    const updateMessageTextInCache = useCallback(
        (orderId: string, messageId: string, nextText: string) => {
            queryClient.setQueryData<OrderChatResponse>(["orderChat", orderId], (current) => {
                if (!current) return current;
                return {
                    ...current,
                    messages: current.messages.map((item) =>
                        item.id === messageId
                            ? { ...item, message: nextText, isEdited: true, status: item.status }
                            : item
                    ),
                };
            });
        },
        [queryClient]
    );

    const handleEditMessage = useCallback(
        (messageId: string, nextText: string) => {
            if (!selectedOrderId) return;
            saveEditedMessageText(selectedOrderId, messageId, nextText);
            updateMessageTextInCache(selectedOrderId, messageId, nextText);
        },
        [selectedOrderId, updateMessageTextInCache]
    );

    const handleArchiveCurrentChat = useCallback(() => {
        if (!selectedOrderId) return;

        setArchiveOrderIds((prev) => (prev.includes(selectedOrderId) ? prev : [...prev, selectedOrderId]));
        setSelectedOrderId(null);
        setView("list");
        setSearchParams({ tab: "archive" }, { replace: true });
    }, [selectedOrderId, setSearchParams]);

    if (!profile) return null;

    const selectedOrder = activeOrders.find((item) => item.id === selectedOrderId) ?? null;
    const selectedCompanion = selectedOrder ? getCompanion(selectedOrder, profile.id) : null;

    const isChatVisible = view === "chat" && !!selectedOrderId && !!selectedCompanion;
    const isListVisible = !isChatVisible;

    const folderCounts = useMemo<Record<ChatTab, number>>(() => {
        const counts: Record<ChatTab, number> = {
            ordinary: 0,
            professional: 0,
            archive: 0,
            support: 0,
        };

        const seenChatKeys = new Set<string>();
        const allOrders = [...(customerOrders ?? []), ...(providerOrders ?? [])];

        for (const order of allOrders) {
            const chatKey = directChatKey(order);
            if (seenChatKeys.has(chatKey)) continue;
            seenChatKeys.add(chatKey);

            const unread = getEffectiveUnread(order.id);
            if (unread <= 0) continue;

            if (archiveOrderIds.includes(order.id)) {
                counts.archive += unread;
            } else if (providerOrderIds.has(order.id)) {
                counts.professional += unread;
            } else {
                counts.ordinary += unread;
            }
        }

        return counts;
    }, [archiveOrderIds, customerOrders, getEffectiveUnread, providerOrderIds, providerOrders]);

    const getOrderMeta = (orderId: string) => {
        const cachedChat = queryClient.getQueryData<OrderChatResponse>(["orderChat", orderId]);
        const lastMessage = cachedChat?.messages[cachedChat.messages.length - 1];
        const unreadCount = getEffectiveUnread(orderId);
        return { lastMessage, unreadCount };
    };

    return (
        <Box
            sx={{
                minHeight: "calc(100vh - 80px)",
                display: "flex",
                justifyContent: "center",
                py: { xs: 1, md: 3 },
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 460,
                    borderRadius: 6,
                    overflow: "hidden",
                    backgroundColor: "#eff1f5",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: { xs: "calc(100vh - 96px)", md: "84vh" },
                }}
            >
                {isListVisible && (
                    tabParam === "support" ? (
                        profile.role === "admin" || profile.role === "moderator" ? (
                            <AdminSupportList
                                onBack={() => {
                                    setSearchParams({ tab: "ordinary" }, { replace: true });
                                }}
                            />
                        ) : (
                            <SupportChat
                                onBack={() => {
                                    setSearchParams(
                                        { tab: hasProfessionalChatAccess ? "professional" : "ordinary" },
                                        { replace: true }
                                    );
                                }}
                            />
                        )
                    ) : (
                        <ChatList
                            hasProfessionalChatAccess={hasProfessionalChatAccess}
                            tab={tabParam}
                            onChangeTab={(value) => {
                                setSearchParams({ tab: value }, { replace: true });
                            }}
                            onBack={() => goBackOrNavigate(navigate, "/cabinet")}
                            orders={activeOrders}
                            isLoading={isCustomerOrdersLoading || isProviderOrdersLoading}
                            profileId={profile.id}
                            getMeta={getOrderMeta}
                            onOpenChat={(orderId) => {
                                void openChat(orderId);
                            }}
                            formatRelativeTime={formatRelativeTime}
                            folderCounts={folderCounts}
                        />
                    )
                )}

                {isChatVisible && selectedCompanion && selectedOrderId && (
                    <ChatRoom
                        companion={selectedCompanion}
                        isOnline={isRealtimeConnected}
                        onBack={() => setView("list")}
                        isLoading={isChatLoading}
                        orderChat={orderChat}
                        profileId={profile.id}
                        isTypingVisible={
                            Boolean(typingByOrder[selectedOrderId]) &&
                            typingByOrder[selectedOrderId] !== profile.id
                        }
                        messagesEndRef={messagesEndRef}
                        messageValue={message}
                        onMessageChange={handleMessageChange}
                        onMessageBlur={stopTyping}
                        onSubmit={handleSend}
                        isSending={sendMessageMutation.isPending}
                        formatRelativeTime={formatRelativeTime}
                        getStatusLabel={getStatusLabel}
                        onEditMessage={handleEditMessage}
                        onArchiveChat={handleArchiveCurrentChat}
                    />
                )}
            </Paper>
        </Box>
    );
}
