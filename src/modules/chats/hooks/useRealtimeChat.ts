import { useCallback, useEffect, useRef, useState } from "react";
import { getRealtimeBaseURL, http } from "@common/lib/http";
import { ChatMessage } from "@modules/chats/api";
import { playNotificationSound } from "@common/lib/sound";

export type ChatRealtimeEvent = {
    orderId: string;
    chatId?: string;
    message: ChatMessage;
};

export type ChatMessageStatusEvent = {
    orderId: string;
    chatId?: string;
    messageId: string;
    status: ChatMessage["status"];
};

export type ChatTypingEvent = {
    orderId: string;
    chatId?: string;
    userId: string;
    isTyping: boolean;
};

type UseRealtimeChatOptions = {
    profileId?: string;
    selectedOrderId?: string | null;
    onNewOrderMessage?: (payload: ChatRealtimeEvent) => void;
    onMessageStatusUpdated?: (payload: ChatMessageStatusEvent) => void;
};

type OutboundEnvelope = {
    event: string;
    data?: Record<string, unknown>;
    requestId?: string;
};

type InboundEnvelope = {
    event: string;
    data?: any;
    requestId?: string;
};

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 12000];

export function useRealtimeChat(options: UseRealtimeChatOptions) {
    const { profileId, selectedOrderId, onNewOrderMessage, onMessageStatusUpdated } = options;

    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
    const [typingByOrder, setTypingByOrder] = useState<Record<string, string | null>>({});

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const reconnectAttemptRef = useRef(0);
    const shouldReconnectRef = useRef(true);
    const connectRef = useRef<() => void>(() => {});
    const activeOrderRef = useRef<string | null | undefined>(selectedOrderId);
    const onNewOrderMessageRef = useRef(onNewOrderMessage);
    const onMessageStatusUpdatedRef = useRef(onMessageStatusUpdated);
    const pendingAcksRef = useRef<
        Map<
            string,
            {
                resolve: (msg: ChatMessage) => void;
                reject: (error: Error) => void;
                timeoutId: number;
            }
        >
    >(new Map());

    useEffect(() => {
        onNewOrderMessageRef.current = onNewOrderMessage;
    }, [onNewOrderMessage]);

    useEffect(() => {
        onMessageStatusUpdatedRef.current = onMessageStatusUpdated;
    }, [onMessageStatusUpdated]);

    useEffect(() => {
        activeOrderRef.current = selectedOrderId;

        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN && selectedOrderId) {
            sendEnvelope({
                event: "join_order_chat",
                data: { orderId: selectedOrderId },
            });
        }
    }, [selectedOrderId]);

    const clearReconnectTimer = () => {
        if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const cleanupPendingAcks = useCallback((error: Error) => {
        pendingAcksRef.current.forEach((pending) => {
            window.clearTimeout(pending.timeoutId);
            pending.reject(error);
        });
        pendingAcksRef.current.clear();
    }, []);

    const sendEnvelope = (payload: OutboundEnvelope) => {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(payload));
    };

    const refreshAuthToken = useCallback(async () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");

        if (accessToken && !refreshToken) {
            return true;
        }

        if (refreshToken) {
            try {
                const response = await http.post("/auth/refresh", { refreshToken });
                const nextToken = response?.data?.accessToken ?? null;
                if (nextToken) {
                    localStorage.setItem("accessToken", nextToken);
                    return true;
                }
            } catch {
                // Keep socket auth silent; retry loop will stop when refresh fails.
            }
        }

        return !!accessToken;
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!shouldReconnectRef.current) return;

        clearReconnectTimer();
        const idx = Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1);
        const delay = RECONNECT_DELAYS_MS[idx];

        reconnectTimerRef.current = window.setTimeout(() => {
            reconnectAttemptRef.current += 1;
            void connectRef.current();
        }, delay);
    }, []);

    const handleServerEvent = useCallback((envelope: InboundEnvelope) => {
        if (!envelope?.event) return;

        if (envelope.event === "send_order_message_ack") {
            const requestId = envelope.requestId;
            if (!requestId) return;

            const pending = pendingAcksRef.current.get(requestId);
            if (!pending) return;

            window.clearTimeout(pending.timeoutId);
            pendingAcksRef.current.delete(requestId);

            if (envelope.data?.ok && envelope.data.message) {
                pending.resolve(envelope.data.message as ChatMessage);
                return;
            }

            pending.reject(new Error(envelope.data?.error || "Failed to send message"));
            return;
        }

        if (envelope.event === "new_order_message") {
            playNotificationSound();
            onNewOrderMessageRef.current?.(envelope.data as ChatRealtimeEvent);
            return;
        }

        if (envelope.event === "message_status_updated") {
            onMessageStatusUpdatedRef.current?.(envelope.data as ChatMessageStatusEvent);
            return;
        }

        if (envelope.event === "typing_indicator") {
            const payload = envelope.data as ChatTypingEvent;
            setTypingByOrder((prev) => ({
                ...prev,
                [payload.orderId]: payload.isTyping ? payload.userId : null,
            }));
        }
    }, []);

    const connect = useCallback(async () => {
        if (!profileId) return;

        const hasFreshToken = await refreshAuthToken();
        const accessToken = localStorage.getItem("accessToken");
        if (!hasFreshToken || !accessToken) {
            setIsRealtimeConnected(false);
            shouldReconnectRef.current = false;
            return;
        }

        const base = getRealtimeBaseURL().replace(/^http/, "ws");
        const wsUrl = `${base}/ws/chat`;
        const ws = new WebSocket(wsUrl, ["bearer", accessToken]);
        socketRef.current = ws;

        ws.onopen = () => {
            setIsRealtimeConnected(true);
            reconnectAttemptRef.current = 0;
            const orderId = activeOrderRef.current;
            if (orderId) {
                sendEnvelope({ event: "join_order_chat", data: { orderId } });
            }
        };

        ws.onmessage = (event) => {
            try {
                const envelope = JSON.parse(event.data) as InboundEnvelope;
                handleServerEvent(envelope);
            } catch {
                // Ignore malformed messages so the socket can stay alive.
            }
        };

        ws.onclose = () => {
            setIsRealtimeConnected(false);
            cleanupPendingAcks(new Error("Socket disconnected"));

            const hasToken = !!localStorage.getItem("accessToken");
            if (shouldReconnectRef.current && profileId && hasToken) {
                scheduleReconnect();
            }
        };

        ws.onerror = () => {
            setIsRealtimeConnected(false);
        };
    }, [cleanupPendingAcks, handleServerEvent, profileId, scheduleReconnect]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        return () => {
            shouldReconnectRef.current = false;
            clearReconnectTimer();
            cleanupPendingAcks(new Error("Chat socket disposed"));

            const ws = socketRef.current;
            if (ws) {
                ws.close();
                socketRef.current = null;
            }
        };
    }, [cleanupPendingAcks, connect]);

    const emitTypingEvent = useCallback((orderId: string, isTyping: boolean) => {
        sendEnvelope({
            event: isTyping ? "typing_start" : "typing_stop",
            data: { orderId },
        });
    }, []);

    const sendMessageViaSocket = useCallback((orderId: string, text: string) => {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error("Socket not connected");
        }

        return new Promise<ChatMessage>((resolve, reject) => {
            const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const timeoutId = window.setTimeout(() => {
                pendingAcksRef.current.delete(requestId);
                reject(new Error("Socket send timeout"));
            }, 10000);

            pendingAcksRef.current.set(requestId, {
                resolve,
                reject,
                timeoutId,
            });

            sendEnvelope({
                event: "send_order_message",
                requestId,
                data: {
                    orderId,
                    message: text,
                },
            });
        });
    }, []);

    return {
        isRealtimeConnected,
        typingByOrder,
        emitTypingEvent,
        sendMessageViaSocket,
    };
}
