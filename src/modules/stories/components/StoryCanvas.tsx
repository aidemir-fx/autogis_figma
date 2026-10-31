import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Box } from "@mui/material";
import type { StoryFrameKind, StoryImageLayout, StoryPromo } from "../api";

export type StoryCanvasFrame = StoryImageLayout & {
    kind: StoryFrameKind;
    imageUrl?: string;
    videoUrl?: string;
    videoStart?: number;
    videoEnd?: number;
    text?: string;
    background: string;
    fontSize: number;
    textColor?: string;
    textBg?: string;
    textAlign?: "center" | "left" | "right";
    textBadge?: boolean;
    promo?: StoryPromo;
};

const WIDTH = 360;
const HEIGHT = 640;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
type Point = { x: number; y: number };

/** One 9:16 composition for the editor, thumbnails and published viewer. */
export function StoryCanvas({
    frame,
    onImageChange,
    onTextChange,
    onTextClick,
    onCanvasClick,
    onPromoClick,
    onPromoActionClick,
    sound = false,
}: {
    frame: StoryCanvasFrame;
    onImageChange?: (layout: StoryImageLayout) => void;
    onTextChange?: (layout: Pick<StoryImageLayout, "textX" | "textY">) => void;
    onTextClick?: () => void;
    onCanvasClick?: () => void;
    onPromoClick?: () => void;
    onPromoActionClick?: (actionType?: "book" | "call") => void;
    sound?: boolean;
}) {
    const root = useRef<HTMLDivElement>(null);
    const text = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);
    const liveFrame = useRef(frame);
    liveFrame.current = frame;
    const points = useRef(new Map<number, Point>());
    const gesture = useRef({ x: 0, y: 0, distance: 0, zoom: 1, offsetX: 0, offsetY: 0 });
    const textGesture = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

    useLayoutEffect(() => {
        const node = root.current;
        if (!node) return;
        const resize = () => setScale(Math.min(node.clientWidth / WIDTH, node.clientHeight / HEIGHT));
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => { setImageFailed(false); }, [frame.imageUrl]);
    useLayoutEffect(() => {
        const node = text.current;
        if (!node) return;
        let size = frame.fontSize;
        node.style.fontSize = `${size}px`;
        // Keep long announcements entirely inside the same safe area on all screens.
        const maxHeight = frame.kind === "image" ? 440 : 560;
        while (node.scrollHeight > maxHeight && size > 10) {
            node.style.fontSize = `${--size}px`;
        }
    }, [frame.text, frame.fontSize, frame.kind]);

    const center = () => {
        const values = [...points.current.values()];
        const first = values[0];
        const second = values[1] ?? first;
        return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2,
            distance: Math.hypot(first.x - second.x, first.y - second.y) };
    };
    const startGesture = () => {
        if (!points.current.size) return;
        gesture.current = { ...center(), zoom: liveFrame.current.imageScale ?? 1,
            offsetX: liveFrame.current.imageX ?? 0, offsetY: liveFrame.current.imageY ?? 0 };
    };
    const release = (event: PointerEvent<HTMLDivElement>) => {
        points.current.delete(event.pointerId);
        startGesture();
    };
    const editable = frame.kind === "image" && Boolean(onImageChange);
    const textEditable = Boolean(onTextChange) && Boolean(frame.text);
    const textX = frame.textX ?? 0;
    // Keep existing image/video stories at their former bottom position until
    // they are edited; newly created drafts explicitly start at the same spot.
    const textY = frame.textY === 0 && frame.kind !== "text" ? 0.32 : (frame.textY ?? (frame.kind === "text" ? 0 : 0.32));
    // Older API responses may not contain imageFit. Keep the published image
    // fully visible in that case; only an explicit "cover" may crop it.
    const imageFit = frame.imageFit === "cover" ? "cover" : "contain";
    const videoRef = useRef<HTMLVideoElement>(null);
    const isVideo = frame.kind === "video" && Boolean(frame.videoUrl);

    return (
        <Box ref={root} sx={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
            <Box
                aria-label={editable ? "Фото: переместите пальцем, измените масштаб двумя пальцами" : "Предпросмотр объявления"}
                onPointerDown={editable ? (event: PointerEvent<HTMLDivElement>) => {
                    if (event.pointerType === "mouse" && event.button !== 0) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
                    startGesture();
                } : undefined}
                onPointerMove={editable ? (event: PointerEvent<HTMLDivElement>) => {
                    if (!points.current.has(event.pointerId) || !scale) return;
                    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
                    const current = center();
                    const start = gesture.current;
                    onImageChange?.({
                        imageScale: clamp(start.distance > 0 ? start.zoom * current.distance / start.distance : start.zoom, 1, 4),
                        imageX: clamp(start.offsetX + (current.x - start.x) / (WIDTH * scale), -0.5, 0.5),
                        imageY: clamp(start.offsetY + (current.y - start.y) / (HEIGHT * scale), -0.5, 0.5),
                    });
                } : undefined}
                onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
                sx={{ position: "absolute", width: WIDTH, height: HEIGHT, top: "50%", left: "50%",
                    transform: `translate(-50%, -50%) scale(${scale})`, overflow: "hidden", borderRadius: "12px",
                    bgcolor: frame.background, color: "white", touchAction: editable ? "none" : "auto",
                    cursor: editable ? "grab" : "default", userSelect: editable ? "none" : "auto" }}
            >
                {isVideo && (
                    <Box component="video" ref={videoRef} src={frame.videoUrl} muted={!sound} autoPlay loop playsInline
                        onLoadedMetadata={() => {
                            if (videoRef.current) videoRef.current.currentTime = frame.videoStart ?? 0;
                        }}
                        onTimeUpdate={() => {
                            const video = videoRef.current;
                            const end = frame.videoEnd ?? 0;
                            if (video && end > 0 && video.currentTime >= end) video.currentTime = frame.videoStart ?? 0;
                        }}
                        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                            objectFit: "contain", objectPosition: "center", pointerEvents: "none" }} />
                )}
                {frame.kind === "image" && frame.imageUrl && !imageFailed && (
                <Box component="img" src={frame.imageUrl} alt="Фото объявления" draggable={false}
                        onError={() => setImageFailed(true)}
                        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                            objectFit: imageFit, objectPosition: "center", pointerEvents: "none",
                            transformOrigin: "center center",
                            transform: `translate(${(frame.imageX ?? 0) * WIDTH}px, ${(frame.imageY ?? 0) * HEIGHT}px) scale(${frame.imageScale ?? 1})` }} />
                )}
                {imageFailed && <Box sx={{ p: 3, textAlign: "center" }}>Не удалось загрузить фото</Box>}
                <Box
                    sx={{ position: "absolute", inset: 0, pointerEvents: onCanvasClick ? "auto" : "none", boxSizing: "border-box" }}
                    onClick={() => onCanvasClick?.()}
                >
                    <Box
                        ref={text}
                        onClick={(event) => {
                            if (textEditable && onTextClick) {
                                event.stopPropagation();
                                onTextClick();
                            }
                        }}
                        onPointerDown={textEditable ? (event: PointerEvent<HTMLDivElement>) => {
                            if (event.pointerType === "mouse" && event.button !== 0) return;
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            textGesture.current = { x: event.clientX, y: event.clientY, offsetX: textX, offsetY: textY };
                        } : undefined}
                        onPointerMove={textEditable ? (event: PointerEvent<HTMLDivElement>) => {
                            if (!event.currentTarget.hasPointerCapture(event.pointerId) || !scale) return;
                            event.stopPropagation();
                            onTextChange?.({
                                textX: clamp(textGesture.current.offsetX + (event.clientX - textGesture.current.x) / (WIDTH * scale), -0.38, 0.38),
                                textY: clamp(textGesture.current.offsetY + (event.clientY - textGesture.current.y) / (HEIGHT * scale), -0.42, 0.42),
                            });
                        } : undefined}
                        onPointerUp={(event) => { event.stopPropagation(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
                        onPointerCancel={(event) => { event.stopPropagation(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
                        sx={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: "calc(100% - 40px)",
                            maxHeight: "calc(100% - 64px)",
                            transform: `translate(calc(-50% + ${textX * WIDTH}px), calc(-50% + ${textY * HEIGHT}px))`,
                            display: "flex",
                            justifyContent: frame.textAlign === "left" ? "flex-start" : frame.textAlign === "right" ? "flex-end" : "center",
                            textAlign: frame.textAlign || "center",
                            pointerEvents: textEditable ? "auto" : "none",
                            cursor: textEditable ? "pointer" : "default",
                            touchAction: textEditable ? "none" : "auto",
                            userSelect: "none",
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                display: "inline-block",
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                                fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                                fontSize: frame.fontSize,
                                fontWeight: 800,
                                lineHeight: 1.25,
                                color: frame.textColor || "#FFFFFF",
                                backgroundColor: frame.textBadge
                                    ? (frame.textBg || "rgba(0, 0, 0, 0.72)")
                                    : "transparent",
                                padding: frame.textBadge ? "6px 14px" : "2px 6px",
                                borderRadius: frame.textBadge ? "12px" : "4px",
                                boxShadow: frame.textBadge ? "0 4px 14px rgba(0,0,0,0.35)" : "none",
                                textShadow: !frame.textBadge && frame.kind !== "text"
                                    ? "0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)"
                                    : "none",
                                border: textEditable ? "1.5px dashed rgba(255, 255, 255, 0.45)" : "none",
                                transition: "all 0.15s ease",
                            }}
                        >
                            {frame.text}
                        </Box>
                    </Box>

                    {frame.promo && (
                        <Box
                            onClick={(event) => {
                                if (onPromoClick) {
                                    event.stopPropagation();
                                    onPromoClick();
                                }
                            }}
                            sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: "16px 14px 18px",
                                zIndex: 12,
                                background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 65%, transparent 100%)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "7px",
                                boxSizing: "border-box",
                                cursor: onPromoClick ? "pointer" : "default",
                                pointerEvents: "auto",
                                textAlign: "left",
                                border: onPromoClick ? "1.5px dashed rgba(56, 189, 248, 0.5)" : "none",
                                borderRadius: "0 0 16px 16px",
                            }}
                        >
                            {frame.promo.tag && (
                                <Box
                                    sx={{
                                        alignSelf: "flex-start",
                                        backgroundColor: "#2563EB",
                                        color: "#FFFFFF",
                                        padding: "3px 9px",
                                        borderRadius: "6px",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {frame.promo.tag}
                                </Box>
                            )}

                            <Box sx={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.25 }}>
                                {frame.promo.title}
                            </Box>

                            {frame.promo.description && (
                                <Box sx={{ fontSize: 11, color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.35 }}>
                                    {frame.promo.description}
                                </Box>
                            )}

                            {frame.promo.benefit && (
                                <Box
                                    sx={{
                                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                                        border: "1px solid rgba(255, 255, 255, 0.25)",
                                        backdropFilter: "blur(6px)",
                                        borderRadius: "8px",
                                        padding: "6px 10px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#FEF08A",
                                    }}
                                >
                                    ✨ {frame.promo.benefit}
                                </Box>
                            )}

                            <Box
                                component="button"
                                type="button"
                                onClick={(event) => {
                                    if (onPromoActionClick) {
                                        event.stopPropagation();
                                        onPromoActionClick(frame.promo?.actionType);
                                    } else if (onPromoClick) {
                                        event.stopPropagation();
                                        onPromoClick();
                                    }
                                }}
                                sx={{
                                    marginTop: "4px",
                                    height: 38,
                                    backgroundColor: "#4BA82E",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    boxShadow: "0 4px 12px rgba(75, 168, 46, 0.4)",
                                    transition: "all 0.15s ease",
                                    "&:active": { transform: "scale(0.98)" },
                                }}
                            >
                                {frame.promo.actionType === "call" ? "Позвонить" : "Записаться онлайн"}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
