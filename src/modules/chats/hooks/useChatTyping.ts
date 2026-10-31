import { useCallback, useEffect, useRef } from "react";

type UseChatTypingOptions = {
    selectedOrderId?: string | null;
    emitTypingEvent: (orderId: string, isTyping: boolean) => void;
    idleMs?: number;
};

export function useChatTyping(options: UseChatTypingOptions) {
    const { selectedOrderId, emitTypingEvent, idleMs = 1200 } = options;

    const typingStopTimeoutRef = useRef<number | null>(null);
    const isTypingSentRef = useRef(false);

    const emitTyping = useCallback(
        (isTyping: boolean) => {
            if (!selectedOrderId) return;

            if (isTyping && !isTypingSentRef.current) {
                emitTypingEvent(selectedOrderId, true);
                isTypingSentRef.current = true;
                return;
            }

            if (!isTyping && isTypingSentRef.current) {
                emitTypingEvent(selectedOrderId, false);
                isTypingSentRef.current = false;
            }
        },
        [emitTypingEvent, selectedOrderId]
    );

    const onInputChange = useCallback(
        (nextValue: string) => {
            const hasText = nextValue.trim().length > 0;

            if (!hasText) {
                if (typingStopTimeoutRef.current) {
                    window.clearTimeout(typingStopTimeoutRef.current);
                    typingStopTimeoutRef.current = null;
                }
                emitTyping(false);
                return;
            }

            emitTyping(true);

            if (typingStopTimeoutRef.current) {
                window.clearTimeout(typingStopTimeoutRef.current);
            }

            typingStopTimeoutRef.current = window.setTimeout(() => {
                emitTyping(false);
                typingStopTimeoutRef.current = null;
            }, idleMs);
        },
        [emitTyping, idleMs]
    );

    const stopTyping = useCallback(() => {
        if (typingStopTimeoutRef.current) {
            window.clearTimeout(typingStopTimeoutRef.current);
            typingStopTimeoutRef.current = null;
        }
        emitTyping(false);
    }, [emitTyping]);

    useEffect(() => {
        return () => {
            if (typingStopTimeoutRef.current) {
                window.clearTimeout(typingStopTimeoutRef.current);
                typingStopTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (isTypingSentRef.current && selectedOrderId) {
                emitTypingEvent(selectedOrderId, false);
                isTypingSentRef.current = false;
            }
        };
    }, [emitTypingEvent, selectedOrderId]);

    return {
        onInputChange,
        stopTyping,
    };
}
