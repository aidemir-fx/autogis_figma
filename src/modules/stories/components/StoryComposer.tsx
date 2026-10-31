import { useEffect, useRef, useState, type ChangeEvent, type TouchEvent } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, LinearProgress, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import FlipCameraIosRoundedIcon from "@mui/icons-material/FlipCameraIosRounded";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import CropRoundedIcon from "@mui/icons-material/CropRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createStory, uploadStoryMedia, type CreateStoryFrame, type StoryPromo } from "../api";
import { StoryCanvas, type StoryCanvasFrame } from "./StoryCanvas";

const BACKGROUNDS = [
    "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
    "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    "linear-gradient(135deg, #1e3a8a, #3b82f6, #06b6d4)",
    "linear-gradient(135deg, #064e3b, #059669, #10b981)",
    "linear-gradient(135deg, #4c1d95, #7c3aed, #c026d3)",
    "linear-gradient(135deg, #7f1d1d, #dc2626, #f97316)",
    "linear-gradient(180deg, #18181b, #09090b)",
    "linear-gradient(135deg, #ea580c, #f59e0b, #fbbf24)",
];
const COLOR_NAMES = ["Закат", "Инстаграм", "Неон Синий", "Изумруд", "Пурпур", "Огонь", "Тёмный", "Золото"];

const INSTA_COLORS = [
    { label: "Белый", color: "#FFFFFF", text: "#000000" },
    { label: "Чёрный", color: "#000000", text: "#FFFFFF" },
    { label: "Жёлтый", color: "#FACC15", text: "#000000" },
    { label: "Оранжевый", color: "#FB923C", text: "#000000" },
    { label: "Красный", color: "#EF4444", text: "#FFFFFF" },
    { label: "Розовый", color: "#EC4899", text: "#FFFFFF" },
    { label: "Фиолетовый", color: "#A855F7", text: "#FFFFFF" },
    { label: "Синий", color: "#3B82F6", text: "#FFFFFF" },
    { label: "Бирюзовый", color: "#14B8A6", text: "#000000" },
    { label: "Зелёный", color: "#22C55E", text: "#FFFFFF" },
];
const MAX_FRAMES = 10;
const MAX_STORY_SECONDS = 4 * 60;
const MAX_VIDEO_SECONDS = 60;
const MAX_STORY_BYTES = 400 * 1024 * 1024;
type Draft = StoryCanvasFrame & {
    id: string;
    text: string;
    file?: File;
    videoSourceStart?: number;
    videoSourceEnd?: number;
};
type VideoTrimDraft = { file: File; url: string; duration: number; start: number; end: number };

type StoryCaptureProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onText: () => void;
    onPhoto: (file: File) => void;
    onVideo: (file: File) => void;
};

function StoryCapture({ open, loading, onClose, onText, onPhoto, onVideo }: StoryCaptureProps) {
    const preview = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const [mode, setMode] = useState<"photo" | "video">("photo");
    const [facing, setFacing] = useState<"environment" | "user">("environment");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const gallery = useRef<HTMLInputElement>(null);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (preview.current) preview.current.srcObject = null;
    };

    useEffect(() => {
        if (!open) {
            stopStream();
            return;
        }
        let cancelled = false;
        setCameraError(null);
        void navigator.mediaDevices?.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } },
            audio: true,
        }).then((stream) => {
            if (cancelled) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            if (preview.current) {
                preview.current.srcObject = stream;
                void preview.current.play();
            }
        }).catch(() => {
            if (!cancelled) setCameraError("Не удалось открыть камеру. Разрешите доступ к камере или выберите файл из галереи.");
        });
        return () => {
            cancelled = true;
            stopStream();
        };
    }, [open, facing]);

    useEffect(() => () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
    }, []);

    const close = () => {
        if (recording) recorderRef.current?.stop();
        stopStream();
        onClose();
    };
    const takePhoto = () => {
        const video = preview.current;
        if (!video || video.readyState < 2) return;
        const canvas = document.createElement("canvas");
        const ratio = video.videoWidth / Math.max(1, video.videoHeight);
        canvas.width = 1080;
        canvas.height = Math.round(canvas.width / ratio);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            onPhoto(new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
    };
    const startRecording = () => {
        const stream = streamRef.current;
        if (!stream || typeof MediaRecorder === "undefined") {
            setCameraError("Запись видео не поддерживается этим браузером.");
            return;
        }
        const mimeType = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onstop = () => {
            if (timerRef.current !== null) window.clearInterval(timerRef.current);
            setRecording(false);
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
            if (blob.size) onVideo(new File([blob], `story-${Date.now()}.webm`, { type: blob.type }));
            chunksRef.current = [];
        };
        recorderRef.current = recorder;
        recorder.start(250);
        setRecordSeconds(0);
        setRecording(true);
        timerRef.current = window.setInterval(() => setRecordSeconds((value) => {
            if (value >= 59) {
                recorder.stop();
                return value;
            }
            return value + 1;
        }), 1000);
    };
    const stopRecording = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();
    const handleTouchStart = (event: TouchEvent) => setDragStart(event.changedTouches[0].clientX);
    const handleTouchEnd = (event: TouchEvent) => {
        if (dragStart === null || recording) return;
        const delta = event.changedTouches[0].clientX - dragStart;
        if (Math.abs(delta) > 45) setMode(delta < 0 ? "video" : "photo");
        setDragStart(null);
    };

    return <Dialog fullScreen open={open} onClose={close} PaperProps={{ sx: { bgcolor: "#050505", color: "white" } }}>
        <input ref={gallery} hidden type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.type.startsWith("video/")) onVideo(file); else onPhoto(file);
        }} />
        <Box sx={{ position: "relative", height: "100dvh", overflow: "hidden", bgcolor: "#050505" }}
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Box component="video" ref={preview} muted playsInline autoPlay sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5), transparent 30%, transparent 66%, rgba(0,0,0,.7))", pointerEvents: "none" }} />
            <IconButton aria-label="Закрыть камеру" onClick={close} sx={{ position: "absolute", top: "env(safe-area-inset-top, 12px)", left: 12, color: "white", bgcolor: "rgba(0,0,0,.35)" }}><CloseRoundedIcon /></IconButton>
            <IconButton aria-label="Переключить камеру" onClick={() => setFacing((value) => value === "environment" ? "user" : "environment")} sx={{ position: "absolute", top: "env(safe-area-inset-top, 12px)", right: 12, color: "white", bgcolor: "rgba(0,0,0,.35)" }}><FlipCameraIosRoundedIcon /></IconButton>
            <Stack direction="row" spacing={3} sx={{ position: "absolute", top: "calc(env(safe-area-inset-top, 12px) + 62px)", left: 0, right: 0, justifyContent: "center" }}>
                <Button onClick={() => !recording && setMode("photo")} sx={{ color: "white", fontWeight: mode === "photo" ? 800 : 500, borderBottom: mode === "photo" ? "2px solid white" : "2px solid transparent", borderRadius: 0 }}>Фото</Button>
                <Button onClick={() => !recording && setMode("video")} sx={{ color: "white", fontWeight: mode === "video" ? 800 : 500, borderBottom: mode === "video" ? "2px solid white" : "2px solid transparent", borderRadius: 0 }}>Видео</Button>
            </Stack>
            {cameraError && <Alert severity="warning" sx={{ position: "absolute", top: "calc(env(safe-area-inset-top, 12px) + 110px)", left: 16, right: 16 }}>{cameraError}</Alert>}
            {recording && <Typography sx={{ position: "absolute", top: "calc(env(safe-area-inset-top, 12px) + 112px)", left: 0, right: 0, textAlign: "center", fontWeight: 700 }}>{`● ${recordSeconds}s / 60s`}</Typography>}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: "absolute", left: 24, right: 24, bottom: "calc(env(safe-area-inset-bottom, 18px) + 20px)" }}>
                <IconButton aria-label="Открыть галерею" onClick={() => gallery.current?.click()} disabled={loading || recording} sx={{ width: 56, height: 56, color: "white", bgcolor: "rgba(0,0,0,.48)", border: "1px solid rgba(255,255,255,.65)" }}><ImageRoundedIcon /></IconButton>
                <IconButton aria-label={recording ? "Остановить видео" : mode === "photo" ? "Сделать фото" : "Начать запись видео"} onClick={recording ? stopRecording : mode === "photo" ? takePhoto : startRecording} disabled={loading} sx={{ width: 78, height: 78, color: "white", bgcolor: recording ? "#ef4444" : "transparent", border: "5px solid white", "&:hover": { bgcolor: recording ? "#dc2626" : "rgba(255,255,255,.15)" } }}>{mode === "video" ? <VideocamRoundedIcon fontSize="large" /> : <PhotoCameraRoundedIcon fontSize="large" />}</IconButton>
                <IconButton aria-label="Добавить текст" onClick={onText} disabled={loading || recording} sx={{ width: 56, height: 56, color: "white", bgcolor: "rgba(0,0,0,.48)", border: "1px solid rgba(255,255,255,.65)", fontSize: 24, fontWeight: 800 }}>Aa</IconButton>
            </Stack>
            <Typography variant="caption" sx={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 18px) + 2px)", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.8)" }}>Свайпните влево/вправо для смены режима</Typography>
        </Box>
    </Dialog>;
}

/** A draft stays local until the explicit Publish action. */
export function StoryComposer({ authorId, compact = false }: { authorId: string; compact?: boolean }) {
    const queryClient = useQueryClient();
    const [frames, setFrames] = useState<Draft[]>([]);
    const [selected, setSelected] = useState(0);
    const [open, setOpen] = useState(false);
    const [chooseOpen, setChooseOpen] = useState(false);
    const [captureOpen, setCaptureOpen] = useState(false);
    const [textOpen, setTextOpen] = useState(false);
    const [textValue, setTextValue] = useState("");
    const [textSize, setTextSize] = useState(30);
    const [textColor, setTextColor] = useState("#FFFFFF");
    const [textBg, setTextBg] = useState("rgba(0,0,0,0.7)");
    const [textAlign, setTextAlign] = useState<"center" | "left" | "right">("center");
    const [textBadge, setTextBadge] = useState(true);
    const [backgroundOpen, setBackgroundOpen] = useState(false);
    const [cropOpen, setCropOpen] = useState(false);
    const [promoOpen, setPromoOpen] = useState(false);
    const [promoTag, setPromoTag] = useState("Акция");
    const [promoTitle, setPromoTitle] = useState("");
    const [promoDescription, setPromoDescription] = useState("");
    const [promoBenefit, setPromoBenefit] = useState("");
    const [promoActionType, setPromoActionType] = useState<"book" | "call">("book");
    const [videoTrim, setVideoTrim] = useState<VideoTrimDraft | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [loadingImage, setLoadingImage] = useState(false);
    const gallery = useRef<HTMLInputElement>(null);
    const camera = useRef<HTMLInputElement>(null);
    const urls = useRef(new Set<string>());
    const trimVideoRef = useRef<HTMLVideoElement>(null);
    const mounted = useRef(true);
    const publishLock = useRef(false);
    const nextId = useRef(0);
    const frame = frames[selected];

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            urls.current.forEach((url) => URL.revokeObjectURL(url));
            urls.current.clear();
        };
    }, []);

    const updateFrame = (patch: Partial<Draft>) => {
        setFrames((current) => current.map((item, index) => index === selected ? { ...item, ...patch } : item));
    };

    const editText = () => {
        if (!frame) return;
        setTextValue(frame.text || "");
        setTextSize(frame.fontSize || 30);
        setTextColor(frame.textColor || "#FFFFFF");
        setTextBg(frame.textBg || "rgba(0,0,0,0.7)");
        setTextAlign(frame.textAlign || "center");
        setTextBadge(frame.textBadge ?? true);
        setTextOpen(true);
    };

    const cycleBackground = () => {
        if (!frame) return;
        const currentIndex = BACKGROUNDS.indexOf(frame.background);
        const nextIndex = (currentIndex + 1) % BACKGROUNDS.length;
        updateFrame({ background: BACKGROUNDS[nextIndex] });
    };

    const toggleAlign = () => {
        const next = textAlign === "center" ? "left" : textAlign === "left" ? "right" : "center";
        setTextAlign(next);
        updateFrame({ textAlign: next });
    };

    const toggleBadge = () => {
        const next = !textBadge;
        setTextBadge(next);
        if (next) {
            const badgeBg = textColor === "#FFFFFF" ? "#000000" : textColor;
            const matching = INSTA_COLORS.find(c => c.color.toLowerCase() === badgeBg.toLowerCase());
            const tColor = matching ? matching.text : "#FFFFFF";
            setTextColor(tColor);
            setTextBg(badgeBg);
            updateFrame({ textBadge: true, textColor: tColor, textBg: badgeBg });
        } else {
            const newColor = textBg && textBg !== "transparent" ? textBg : "#FFFFFF";
            setTextColor(newColor);
            updateFrame({ textBadge: false, textColor: newColor });
        }
    };

    const handleColorSelect = (item: typeof INSTA_COLORS[number]) => {
        if (textBadge) {
            setTextColor(item.text);
            setTextBg(item.color);
            updateFrame({ textColor: item.text, textBg: item.color });
        } else {
            setTextColor(item.color);
            updateFrame({ textColor: item.color });
        }
    };

    const handleSizeChange = (val: number) => {
        setTextSize(val);
        updateFrame({ fontSize: val });
    };

    const openPromoEditor = () => {
        if (!frame) return;
        if (frame.promo) {
            setPromoTag(frame.promo.tag || "Акция");
            setPromoTitle(frame.promo.title || "");
            setPromoDescription(frame.promo.description || "");
            setPromoBenefit(frame.promo.benefit || "");
            setPromoActionType(frame.promo.actionType || "book");
        } else {
            setPromoTag("Акция");
            setPromoTitle("");
            setPromoDescription("");
            setPromoBenefit("");
            setPromoActionType("book");
        }
        setPromoOpen(true);
    };

    const savePromo = () => {
        if (!promoTitle.trim()) {
            toast.error("Введите название акции");
            return;
        }
        updateFrame({
            promo: {
                tag: promoTag.trim() || undefined,
                title: promoTitle.trim(),
                description: promoDescription.trim() || undefined,
                benefit: promoBenefit.trim() || undefined,
                actionType: promoActionType,
            },
        });
        setPromoOpen(false);
        toast.success("Стикер акции добавлен");
    };

    const removePromo = () => {
        updateFrame({ promo: undefined });
        setPromoOpen(false);
        toast.info("Стикер акции удалён");
    };

    const appendMany = (drafts: Draft[]) => {
        setFrames((current) => [...current, ...drafts]);
        setSelected(frames.length + drafts.length - 1);
        setChooseOpen(false);
        setTextOpen(false);
        setCropOpen(false);
        setPublishError(null);
        setOpen(true);
    };

    const append = (draft: Draft) => appendMany([draft]);

    const addText = () => {
        if (frames.length >= MAX_FRAMES) return;
        append({
            id: `draft-${nextId.current++}`,
            kind: "text",
            text: "",
            background: BACKGROUNDS[0],
            fontSize: 30,
            textColor: "#FFFFFF",
            textBg: "rgba(0,0,0,0.7)",
            textAlign: "center",
            textBadge: true,
        });
        setTextValue("");
        setTextSize(30);
        setTextColor("#FFFFFF");
        setTextBg("rgba(0,0,0,0.7)");
        setTextAlign("center");
        setTextBadge(true);
        setTextOpen(true);
    };
    const addImageFile = async (file?: File) => {
        if (!file || frames.length >= MAX_FRAMES || loadingImage) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            toast.error("Выберите фото в формате JPEG, PNG или WebP");
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            toast.error("Максимальный размер фото — 15 МБ");
            return;
        }
        setLoadingImage(true);
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        try {
            const image = new Image();
            image.src = url;
            await image.decode();
            if (!mounted.current) return;
            if (image.naturalWidth < 256 || image.naturalHeight < 256) {
                URL.revokeObjectURL(url);
                urls.current.delete(url);
                toast.error("Минимальный размер изображения для объявления — 256×256 пикселей");
                return;
            }
            append({ id: `draft-${nextId.current++}`, kind: "image", text: "", background: "#0f172a", fontSize: 28,
                file, imageUrl: url, imageFit: "contain", imageScale: 1, imageX: 0, imageY: 0, textX: 0, textY: 0.32 });
        } catch {
            URL.revokeObjectURL(url);
            urls.current.delete(url);
            if (mounted.current) toast.error("Не удалось открыть фото. Попробуйте JPEG, PNG или WebP.");
        } finally {
            if (mounted.current) setLoadingImage(false);
        }
    };
    const addVideoFile = async (file?: File) => {
        if (!file || loadingImage) return;
        if (!["video/mp4", "video/webm"].includes(file.type)) {
            toast.error("Выберите видео в формате MP4 или WebM");
            return;
        }
        if (file.size > MAX_STORY_BYTES) {
            toast.error("Размер видео не может превышать 400 МБ");
            return;
        }
        const usedSeconds = frames.reduce((sum, item) => sum + (item.kind === "video" ? (item.videoEnd ?? 0) - (item.videoStart ?? 0) : 0), 0);
        const usedBytes = [...new Set(frames.map((item) => item.file).filter(Boolean))].reduce((sum, item) => sum + (item?.size ?? 0), 0);
        if (usedBytes + file.size > MAX_STORY_BYTES) {
            toast.error("Общий размер видео в публикации не может превышать 400 МБ");
            return;
        }
        if (usedSeconds >= MAX_STORY_SECONDS || frames.length >= MAX_FRAMES) {
            toast.error("Публикация уже достигла лимита 4 минуты или 10 слайдов");
            return;
        }
        setLoadingImage(true);
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        try {
            const duration = await new Promise<number>((resolve, reject) => {
                const video = document.createElement("video");
                video.preload = "metadata";
                video.onloadedmetadata = () => resolve(video.duration);
                video.onerror = () => reject(new Error("Не удалось прочитать видео"));
                video.src = url;
            });
            if (!Number.isFinite(duration) || duration <= 0) throw new Error("Не удалось определить длительность видео");
            const remainingSeconds = MAX_STORY_SECONDS - usedSeconds;
            setVideoTrim({ file, url, duration, start: 0, end: Math.min(duration, remainingSeconds) });
        } catch (error) {
            URL.revokeObjectURL(url);
            urls.current.delete(url);
            toast.error(error instanceof Error ? error.message : "Не удалось открыть видео");
        } finally {
            if (mounted.current) setLoadingImage(false);
        }
    };
    const addImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void addImageFile(file);
    };
    const addVideo = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void addVideoFile(file);
    };
    const openCapture = () => {
        setChooseOpen(false);
        setCaptureOpen(true);
    };
    const captureText = () => {
        setCaptureOpen(false);
        addText();
    };
    const capturePhoto = (file: File) => {
        setCaptureOpen(false);
        void addImageFile(file);
    };
    const captureVideo = (file: File) => {
        setCaptureOpen(false);
        void addVideoFile(file);
    };
    const formatTime = (seconds: number) => {
        const total = Math.max(0, Math.round(seconds));
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    };
    const useTrimmedVideo = () => {
        if (!videoTrim) return;
        const usedSeconds = frames.reduce((sum, item) => sum + (item.kind === "video" ? (item.videoEnd ?? 0) - (item.videoStart ?? 0) : 0), 0);
        const selectedDuration = videoTrim.end - videoTrim.start;
        const segmentCount = Math.ceil(selectedDuration / MAX_VIDEO_SECONDS);
        if (selectedDuration <= 0.05) {
            toast.error("Выберите фрагмент видео длиннее одной секунды");
            return;
        }
        if (usedSeconds + selectedDuration > MAX_STORY_SECONDS + 0.05) {
            toast.error("Общая длительность видео в публикации не может превышать 4 минуты");
            return;
        }
        if (frames.length + segmentCount > MAX_FRAMES) {
            toast.error(`Выбранный фрагмент займёт ${segmentCount} слайда(ов), а максимум — ${MAX_FRAMES}`);
            return;
        }
        const videoFrames: Draft[] = [];
        for (let start = videoTrim.start; start < videoTrim.end - 0.01; start += MAX_VIDEO_SECONDS) {
            const end = Math.min(start + MAX_VIDEO_SECONDS, videoTrim.end);
            videoFrames.push({ id: `draft-${nextId.current++}`, kind: "video", text: "", background: "#0f172a", fontSize: 28,
                file: videoTrim.file, videoUrl: videoTrim.url, videoStart: start, videoEnd: end, textX: 0, textY: 0.32,
                videoSourceStart: videoTrim.start, videoSourceEnd: videoTrim.end });
        }
        setVideoTrim(null);
        appendMany(videoFrames);
    };
    const cancelVideoTrim = () => {
        if (videoTrim) {
            URL.revokeObjectURL(videoTrim.url);
            urls.current.delete(videoTrim.url);
        }
        setVideoTrim(null);
    };
    const removeFrame = () => {
        if (frame.imageUrl) {
            URL.revokeObjectURL(frame.imageUrl);
            urls.current.delete(frame.imageUrl);
        }
        setFrames((current) => current.filter((item) => item.id !== frame.id));
        setSelected(Math.max(0, selected - 1));
        if (frames.length === 1) setOpen(false);
    };
    const publish = async () => {
        if (publishLock.current || !frames.length) return;
        const empty = frames.findIndex((item) => item.kind === "text" && !item.text.trim());
        if (empty !== -1) {
            setSelected(empty);
            setPublishError(`Добавьте текст в слайд ${empty + 1}`);
            return;
        }
        publishLock.current = true;
        setPublishing(true);
        setPublishError(null);
        setProgress(0);
        try {
            const payload: CreateStoryFrame[] = [];
            const uploadedAssets = new Map<File, string>();
            for (const [index, item] of frames.entries()) {
                let assetId: string | undefined;
                if (item.file) {
                    assetId = uploadedAssets.get(item.file);
                    if (!assetId) {
                        assetId = await uploadStoryMedia(authorId, item.file, (value) => {
                            if (mounted.current) setProgress((index + value / 100) / frames.length * 90);
                        }, item.videoSourceStart, item.videoSourceEnd);
                        uploadedAssets.set(item.file, assetId);
                    }
                }
                payload.push({
                    kind: item.kind,
                    text: item.text.trim() || undefined,
                    assetId,
                    background: item.background,
                    fontSize: item.fontSize,
                    textColor: item.textColor,
                    textBg: item.textBg,
                    textAlign: item.textAlign,
                    textBadge: item.textBadge,
                    promo: item.promo,
                    imageFit: item.imageFit,
                    imageScale: item.imageScale,
                    imageX: item.imageX,
                    imageY: item.imageY,
                    textX: item.textX,
                    textY: item.textY,
                    videoStart: item.kind === "video" ? (item.videoStart ?? 0) - (item.videoSourceStart ?? 0) : item.videoStart,
                    videoEnd: item.kind === "video" ? (item.videoEnd ?? 0) - (item.videoSourceStart ?? 0) : item.videoEnd,
                });
                if (mounted.current) setProgress((index + 1) / frames.length * 90);
            }
            await createStory(payload);
            void queryClient.invalidateQueries({ queryKey: ["stories"] });
            if (mounted.current) {
                urls.current.forEach((url) => URL.revokeObjectURL(url));
                urls.current.clear();
                setFrames([]);
                setOpen(false);
                setSelected(0);
                toast.success("История опубликована на 24 часа");
            }
        } catch (error) {
            if (mounted.current) {
                const reason = error instanceof Error ? error.message : "Неизвестная ошибка";
                setPublishError(`Не удалось опубликовать историю. ${reason}. Черновик сохранён на этом экране — попробуйте ещё раз.`);
            }
        } finally {
            publishLock.current = false;
            if (mounted.current) setPublishing(false);
        }
    };

    return <>
        <input ref={gallery} hidden type="file" accept="image/*" onChange={(event) => void addImage(event)} />
        <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void addImage(event)} />
        <input id="story-video-gallery" hidden type="file" accept="video/mp4,video/webm" onChange={(event) => void addVideo(event)} />
        <input id="story-video-camera" hidden type="file" accept="video/mp4,video/webm" capture="environment" onChange={(event) => void addVideo(event)} />
        <Box sx={compact
            ? { p: 0, border: 0, bgcolor: "transparent" }
            : { p: 2, border: "1px solid", borderColor: "rgba(226, 232, 240, 0.8)", borderRadius: 3, bgcolor: "background.paper", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            {!compact && <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Истории · 24 часа</Typography>
                    <Box sx={{ px: 1, py: 0.25, borderRadius: 10, bgcolor: "#ecfdf5", color: "#059669", fontSize: 11, fontWeight: 700 }}>Актуально</Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 13, lineHeight: 1.4 }}>
                    Акции, скидки, анонсы и рабочие моменты для клиентов и подписчиков.
                </Typography>
            </>}
            {compact ? (
                <Box
                    component="button"
                    type="button"
                    onClick={openCapture}
                    aria-label="Добавить историю"
                    sx={{
                        width: 66,
                        flex: "0 0 66px",
                        border: 0,
                        background: "transparent",
                        p: 0,
                        cursor: "pointer",
                        textAlign: "center",
                        font: "inherit",
                    }}
                >
                    <Box
                        sx={{
                            width: 60,
                            height: 60,
                            mx: "auto",
                            p: "2px",
                            border: "2px dashed #38bdf8",
                            borderRadius: "20px",
                            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                            display: "grid",
                            placeItems: "center",
                            color: "#0284c7",
                            fontSize: 26,
                            lineHeight: 1,
                            transition: "all 0.15s ease",
                            "&:active": { transform: "scale(0.95)" },
                        }}
                    >
                        +
                    </Box>
                    <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                        Добавить
                    </Typography>
                </Box>
            ) : frames.length ? <>
                <Button fullWidth variant="contained" onClick={() => setOpen(true)}
                    sx={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 2, py: 1.25, fontWeight: 700 }}>
                    Продолжить черновик ({frames.length} слайд{frames.length > 1 ? "а" : ""})
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                    Черновик хранится до закрытия страницы.
                </Typography>
            </> : (
                <Stack direction="row" spacing={1.25}>
                    <Box
                        component="button"
                        type="button"
                        onClick={openCapture}
                        sx={{
                            flex: 1,
                            p: 1.5,
                            border: "1px solid #e2e8f0",
                            borderRadius: 2.5,
                            bgcolor: "#f8fafc",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.75,
                            transition: "all 0.15s ease",
                            "&:hover": { bgcolor: "#f1f5f9", borderColor: "#cbd5e1" },
                            "&:active": { transform: "scale(0.97)" },
                        }}
                    >
                        <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
                            <PhotoCameraRoundedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Камера</Typography>
                    </Box>

                    <Box
                        component="button"
                        type="button"
                        onClick={() => gallery.current?.click()}
                        sx={{
                            flex: 1,
                            p: 1.5,
                            border: "1px solid #e2e8f0",
                            borderRadius: 2.5,
                            bgcolor: "#f8fafc",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.75,
                            transition: "all 0.15s ease",
                            "&:hover": { bgcolor: "#f1f5f9", borderColor: "#cbd5e1" },
                            "&:active": { transform: "scale(0.97)" },
                        }}
                    >
                        <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "#fdf2f8", color: "#db2777", display: "grid", placeItems: "center" }}>
                            <ImageRoundedIcon fontSize="small" />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Галерея</Typography>
                    </Box>

                    <Box
                        component="button"
                        type="button"
                        onClick={addText}
                        sx={{
                            flex: 1,
                            p: 1.5,
                            border: "1px solid #e2e8f0",
                            borderRadius: 2.5,
                            bgcolor: "#f8fafc",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.75,
                            transition: "all 0.15s ease",
                            "&:hover": { bgcolor: "#f1f5f9", borderColor: "#cbd5e1" },
                            "&:active": { transform: "scale(0.97)" },
                        }}
                    >
                        <Box sx={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "white", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16 }}>
                            Aa
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Текст</Typography>
                    </Box>
                </Stack>
            )}
        </Box>

        <Dialog fullScreen open={open && Boolean(frame)} onClose={() => { if (!publishing) setOpen(false); }}
            PaperProps={{ sx: { bgcolor: "#000000", color: "white", height: "100dvh", maxHeight: "100%", overflow: "hidden" } }}>
            {frame && (
                <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", pt: "env(safe-area-inset-top)", pb: "env(safe-area-inset-bottom)" }}>
                    {/* Top Instagram Toolbar */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, flexShrink: 0, zIndex: 10 }}>
                        <IconButton aria-label="Закрыть редактор" disabled={publishing} onClick={() => setOpen(false)} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}>
                            <CloseRoundedIcon />
                        </IconButton>

                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", bgcolor: "rgba(0,0,0,0.4)", px: 1.5, py: 0.5, borderRadius: 10 }}>
                            {selected + 1} / {frames.length}
                        </Typography>

                        <Stack direction="row" spacing={0.75} alignItems="center">
                            {/* Aa Text Button */}
                            <IconButton
                                aria-label="Редактировать текст"
                                onClick={editText}
                                disabled={publishing}
                                sx={{
                                    color: "white",
                                    bgcolor: frame.text ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
                                    width: 40,
                                    height: 40,
                                    fontWeight: 900,
                                    fontSize: 16,
                                }}
                            >
                                Aa
                            </IconButton>

                            {/* Promo Sticker Button */}
                            <IconButton
                                aria-label="Стикер акции"
                                onClick={openPromoEditor}
                                disabled={publishing}
                                sx={{
                                    color: "white",
                                    bgcolor: frame.promo ? "#2563eb" : "rgba(255,255,255,0.12)",
                                    width: 40,
                                    height: 40,
                                    border: frame.promo ? "1.5px solid #60a5fa" : "none",
                                    boxShadow: frame.promo ? "0 0 10px rgba(37, 99, 235, 0.5)" : "none",
                                }}
                                title={frame.promo ? "Редактировать стикер акции" : "Прикрепить стикер акции"}
                            >
                                <LocalOfferRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>

                            {/* Cycle Background (Color Palette) */}
                            <IconButton
                                aria-label="Сменить фон"
                                onClick={cycleBackground}
                                onContextMenu={(e) => { e.preventDefault(); setBackgroundOpen(true); }}
                                disabled={publishing}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    p: 0,
                                    background: frame.background,
                                    border: "2px solid rgba(255,255,255,0.7)",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                                }}
                            >
                                <PaletteRoundedIcon sx={{ fontSize: 18, color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />
                            </IconButton>

                            {/* Crop / Fit toggle if image */}
                            {frame.kind === "image" && (
                                <IconButton
                                    aria-label="Кадрирование"
                                    onClick={() => setCropOpen(!cropOpen)}
                                    disabled={publishing}
                                    sx={{
                                        color: "white",
                                        bgcolor: cropOpen ? "#3b82f6" : "rgba(255,255,255,0.12)",
                                        width: 40,
                                        height: 40,
                                    }}
                                >
                                    <CropRoundedIcon fontSize="small" />
                                </IconButton>
                            )}

                            {/* Delete slide */}
                            <IconButton
                                aria-label="Удалить слайд"
                                disabled={publishing}
                                onClick={removeFrame}
                                sx={{ color: "rgba(255,255,255,0.8)", bgcolor: "rgba(255,255,255,0.12)", width: 40, height: 40 }}
                            >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>

                    {/* Canvas Stage */}
                    <Box sx={{ flex: 1, minHeight: 120, width: "100%", maxWidth: 440, mx: "auto", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", px: 1 }}>
                        <StoryCanvas
                            key={frame.id}
                            frame={{
                                ...frame,
                                text: frame.kind === "text" && !frame.text ? "Нажмите для ввода текста" : frame.text,
                            }}
                            onImageChange={publishing ? undefined : updateFrame}
                            onTextChange={publishing ? undefined : updateFrame}
                            onTextClick={editText}
                            onCanvasClick={() => { if (!frame.text) editText(); }}
                            onPromoClick={openPromoEditor}
                        />
                    </Box>

                    {/* Quick Hint */}
                    {!publishing && (
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", textAlign: "center", py: 0.5, fontSize: 11 }}>
                            ✨ Нажмите на текст для изменения · Перетаскивайте для перемещения
                        </Typography>
                    )}

                    {/* Image Crop Slider (collapsible) */}
                    {frame.kind === "image" && cropOpen && (
                        <Box sx={{ px: 2, py: 1, bgcolor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", maxWidth: 440, mx: "auto", width: "100%", boxSizing: "border-box", borderRadius: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button size="small" disabled={publishing} onClick={() => updateFrame({ imageFit: "contain", imageScale: 1, imageX: 0, imageY: 0 })}
                                    sx={{ color: "white", minWidth: 0, px: 1.5, fontSize: 12, bgcolor: frame.imageFit === "contain" ? "#2563eb" : "rgba(255,255,255,0.1)" }}>Целиком</Button>
                                <Button size="small" disabled={publishing} onClick={() => updateFrame({ imageFit: "cover", imageScale: 1, imageX: 0, imageY: 0 })}
                                    sx={{ color: "white", minWidth: 0, px: 1.5, fontSize: 12, bgcolor: frame.imageFit === "cover" ? "#2563eb" : "rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>Заполнить</Button>
                                <Slider aria-label="Масштаб фото" min={1} max={4} step={0.05} value={frame.imageScale ?? 1} disabled={publishing}
                                    valueLabelDisplay="auto" valueLabelFormat={(value) => `${value.toFixed(1)}×`}
                                    onChange={(_, value) => updateFrame({ imageScale: value as number })} sx={{ flex: 1, mx: 1.5, color: "#38bdf8" }} />
                            </Stack>
                        </Box>
                    )}

                    {/* Bottom Slide Strip and Instagram-Style Publish Bar */}
                    <Box sx={{ p: 1.5, width: "100%", maxWidth: 500, mx: "auto", boxSizing: "border-box", flexShrink: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: "auto", py: 0.5, mb: 1.25, minHeight: 62 }} aria-label="Слайды публикации">
                            {frames.map((item, index) => (
                                <Box
                                    key={item.id}
                                    component="button"
                                    type="button"
                                    disabled={publishing}
                                    aria-label={`Слайд ${index + 1}`}
                                    aria-pressed={index === selected}
                                    onClick={() => { setSelected(index); setTextOpen(false); }}
                                    sx={{
                                        p: 0,
                                        width: 36,
                                        height: 60,
                                        flexShrink: 0,
                                        overflow: "hidden",
                                        bgcolor: "transparent",
                                        cursor: "pointer",
                                        borderRadius: 1.5,
                                        border: index === selected ? "2.5px solid #38bdf8" : "1.5px solid rgba(255,255,255,0.25)",
                                        transform: index === selected ? "scale(1.04)" : "scale(1)",
                                        transition: "all 0.15s ease",
                                        boxShadow: index === selected ? "0 0 10px rgba(56, 189, 248, 0.5)" : "none",
                                    }}
                                >
                                    <StoryCanvas frame={item} />
                                </Box>
                            ))}
                            {frames.length < MAX_FRAMES && (
                                <IconButton
                                    aria-label="Добавить слайд"
                                    disabled={publishing}
                                    onClick={() => setChooseOpen(true)}
                                    sx={{
                                        width: 44,
                                        height: 60,
                                        borderRadius: 1.5,
                                        color: "white",
                                        border: "1.5px dashed rgba(255,255,255,0.4)",
                                        bgcolor: "rgba(255,255,255,0.06)",
                                        "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                                    }}
                                >
                                    <AddRoundedIcon />
                                </IconButton>
                            )}
                        </Stack>

                        {publishing && <LinearProgress variant="determinate" value={progress} aria-label="Загрузка истории" sx={{ mb: 1, borderRadius: 1 }} />}
                        {publishError && <Alert severity="error" onClose={() => setPublishError(null)} sx={{ mb: 1 }}>{publishError}</Alert>}

                        <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            disabled={publishing}
                            onClick={() => void publish()}
                            startIcon={publishing ? <CircularProgress size={20} color="inherit" /> : undefined}
                            sx={{
                                py: 1.5,
                                borderRadius: 3,
                                fontWeight: 800,
                                fontSize: 15,
                                textTransform: "none",
                                letterSpacing: "0.01em",
                                background: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)",
                                boxShadow: "0 4px 18px rgba(139, 92, 246, 0.4)",
                                "&:hover": {
                                    background: "linear-gradient(90deg, #db2777 0%, #7c3aed 50%, #2563eb 100%)",
                                    boxShadow: "0 6px 22px rgba(139, 92, 246, 0.6)",
                                },
                            }}
                        >
                            {publishing ? "Публикуем…" : "Опубликовать историю · 24ч"}
                        </Button>
                    </Box>

                    {/* Fullscreen Instagram Type Mode Overlay */}
                    {textOpen && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 100,
                                bgcolor: "rgba(0, 0, 0, 0.76)",
                                backdropFilter: "blur(14px)",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                p: 2,
                                boxSizing: "border-box",
                                pt: "max(16px, env(safe-area-inset-top, 16px))",
                                pb: "max(20px, env(safe-area-inset-bottom, 20px))",
                            }}
                        >
                            {/* Top Controls: Align, [A=] Badge Toggle, Done */}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%", maxWidth: 440, mx: "auto" }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {/* Text Alignment */}
                                    <IconButton
                                        onClick={toggleAlign}
                                        aria-label="Выравнивание текста"
                                        sx={{
                                            color: "white",
                                            bgcolor: "rgba(255,255,255,0.18)",
                                            width: 44,
                                            height: 44,
                                            "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
                                        }}
                                    >
                                        {textAlign === "left" && <FormatAlignLeftRoundedIcon fontSize="small" />}
                                        {textAlign === "center" && <FormatAlignCenterRoundedIcon fontSize="small" />}
                                        {textAlign === "right" && <FormatAlignRightRoundedIcon fontSize="small" />}
                                    </IconButton>

                                    {/* Instagram Badge Highlight Toggle [A=] */}
                                    <IconButton
                                        onClick={toggleBadge}
                                        aria-label="Подложка текста"
                                        sx={{
                                            color: textBadge ? "#000000" : "#ffffff",
                                            bgcolor: textBadge ? "#ffffff" : "rgba(255,255,255,0.18)",
                                            width: 44,
                                            height: 44,
                                            fontWeight: 900,
                                            fontSize: 16,
                                            fontFamily: "monospace",
                                            border: textBadge ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.3)",
                                            "&:hover": { bgcolor: textBadge ? "#f1f5f9" : "rgba(255,255,255,0.28)" },
                                        }}
                                    >
                                        A=
                                    </IconButton>

                                    {/* Fast Background Cycle on text slide */}
                                    {frame.kind === "text" && (
                                        <IconButton
                                            onClick={cycleBackground}
                                            aria-label="Сменить фон"
                                            sx={{
                                                background: frame.background,
                                                width: 44,
                                                height: 44,
                                                border: "2px solid rgba(255,255,255,0.8)",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                                            }}
                                        >
                                            <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "white" }} />
                                        </IconButton>
                                    )}
                                </Stack>

                                {/* Done Button */}
                                <Button
                                    variant="contained"
                                    onClick={() => setTextOpen(false)}
                                    sx={{
                                        bgcolor: "white",
                                        color: "black",
                                        fontWeight: 800,
                                        borderRadius: 9999,
                                        px: 2.75,
                                        py: 0.85,
                                        fontSize: 14,
                                        textTransform: "none",
                                        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                                        "&:hover": { bgcolor: "#f8fafc" },
                                    }}
                                >
                                    Готово
                                </Button>
                            </Stack>

                            {/* Center Typing Area with Left Vertical Font Size Slider */}
                            <Box sx={{ flex: 1, display: "flex", alignItems: "center", width: "100%", maxWidth: 440, mx: "auto", position: "relative", my: 2 }}>
                                {/* Instagram Vertical Slider */}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        left: 0,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        height: 180,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        zIndex: 10,
                                    }}
                                >
                                    <Typography sx={{ color: "white", fontSize: 16, fontWeight: 800, mb: 1, lineHeight: 1 }}>A</Typography>
                                    <Slider
                                        orientation="vertical"
                                        min={18}
                                        max={48}
                                        step={2}
                                        value={textSize}
                                        onChange={(_, val) => handleSizeChange(val as number)}
                                        aria-label="Размер шрифта"
                                        sx={{
                                            color: "white",
                                            "& .MuiSlider-thumb": {
                                                width: 18,
                                                height: 18,
                                                bgcolor: "white",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                                "&:focus, &:hover, &.Mui-active": { boxShadow: "0 0 0 8px rgba(255,255,255,0.2)" },
                                            },
                                            "& .MuiSlider-track": { bgcolor: "white" },
                                            "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.3)" },
                                        }}
                                    />
                                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, mt: 1, lineHeight: 1 }}>a</Typography>
                                </Box>

                                {/* Center In-place Textarea */}
                                <Box sx={{ width: "100%", pl: 5, pr: 2, display: "flex", justifyContent: textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center" }}>
                                    <Box
                                        component="textarea"
                                        autoFocus
                                        rows={4}
                                        value={textValue}
                                        placeholder="Напишите что-нибудь…"
                                        onChange={(e) => {
                                            const val = (e.target as HTMLTextAreaElement).value;
                                            setTextValue(val);
                                            updateFrame({ text: val });
                                        }}
                                        maxLength={1000}
                                        sx={{
                                            width: "100%",
                                            maxWidth: 320,
                                            border: "none",
                                            outline: "none",
                                            resize: "none",
                                            textAlign,
                                            fontSize: textSize,
                                            lineHeight: 1.25,
                                            fontWeight: 800,
                                            letterSpacing: "-0.01em",
                                            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                                            color: textColor,
                                            bgcolor: textBadge ? textBg : "transparent",
                                            p: textBadge ? "10px 14px" : "4px 8px",
                                            borderRadius: textBadge ? "14px" : "0",
                                            boxShadow: textBadge ? "0 4px 20px rgba(0,0,0,0.35)" : "none",
                                            textShadow: textBadge ? "none" : "0 2px 10px rgba(0,0,0,0.85)",
                                            boxDecorationBreak: "clone",
                                            WebkitBoxDecorationBreak: "clone",
                                            "&::placeholder": {
                                                color: "rgba(255,255,255,0.45)",
                                                fontWeight: 600,
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Bottom Instagram Color Palette Chips */}
                            <Box sx={{ width: "100%", maxWidth: 440, mx: "auto", overflowX: "auto", py: 1, "::-webkit-scrollbar": { display: "none" } }}>
                                <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ minWidth: "max-content", px: 1 }}>
                                    {INSTA_COLORS.map((c) => {
                                        const isSelected = textBadge
                                            ? textBg.toLowerCase() === c.color.toLowerCase()
                                            : textColor.toLowerCase() === c.color.toLowerCase();
                                        return (
                                            <Box
                                                key={c.color}
                                                component="button"
                                                type="button"
                                                onClick={() => handleColorSelect(c)}
                                                aria-label={c.label}
                                                sx={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: "50%",
                                                    bgcolor: c.color,
                                                    border: isSelected ? "3px solid white" : "2px solid rgba(255,255,255,0.3)",
                                                    transform: isSelected ? "scale(1.2)" : "scale(1)",
                                                    transition: "all 0.15s ease",
                                                    cursor: "pointer",
                                                    boxShadow: isSelected ? "0 0 10px rgba(255,255,255,0.6)" : "0 2px 4px rgba(0,0,0,0.3)",
                                                    outline: "none",
                                                }}
                                            />
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Dialog>

        <Dialog open={backgroundOpen} onClose={() => setBackgroundOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Цвет фона</DialogTitle>
            <DialogContent><Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ py: 1 }}>
                {BACKGROUNDS.map((background, index) => <Box key={background} component="button" type="button"
                    aria-label={`Фон: ${COLOR_NAMES[index]}`} aria-pressed={frame?.background === background}
                    onClick={() => { updateFrame({ background }); setBackgroundOpen(false); }}
                    sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: background, cursor: "pointer",
                        border: frame?.background === background ? "3px solid #94a3b8" : "3px solid transparent" }} />)}
            </Stack></DialogContent>
            <DialogActions><Button onClick={() => setBackgroundOpen(false)}>Готово</Button></DialogActions>
        </Dialog>

        {/* Promo / Discount Sticker Dialog */}
        <Dialog open={promoOpen} onClose={() => setPromoOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                <LocalOfferRoundedIcon sx={{ color: "#2563eb" }} />
                Стикер акции и спецпредложения
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.75, display: "block" }}>
                            Категория (бейдж)
                        </Typography>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                            {["Акция", "Скидка", "Подарок", "Диагностика", "ТО", "Сезонное"].map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    clickable
                                    color={promoTag === tag ? "primary" : "default"}
                                    onClick={() => setPromoTag(tag)}
                                    variant={promoTag === tag ? "filled" : "outlined"}
                                />
                            ))}
                        </Stack>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Или свой тег (например: Шиномонтаж)"
                            value={promoTag}
                            onChange={(e) => setPromoTag(e.target.value)}
                            inputProps={{ maxLength: 30 }}
                        />
                    </Box>

                    <TextField
                        autoFocus
                        required
                        fullWidth
                        size="small"
                        label="Название акции *"
                        placeholder="Например: Компьютерная диагностика в подарок"
                        value={promoTitle}
                        onChange={(e) => setPromoTitle(e.target.value)}
                        inputProps={{ maxLength: 80 }}
                        helperText="Главный крупный заголовок на плашке"
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Описание условий"
                        placeholder="Например: Считывание ошибок всех блоков управления сканером при ремонте"
                        value={promoDescription}
                        onChange={(e) => setPromoDescription(e.target.value)}
                        inputProps={{ maxLength: 200 }}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        label="Выгода или размер скидки"
                        placeholder="Например: ✨ Бесплатно вместо 1 500 ₽ или Скидка 15%"
                        value={promoBenefit}
                        onChange={(e) => setPromoBenefit(e.target.value)}
                        inputProps={{ maxLength: 60 }}
                        helperText="Отобразится в полупрозрачной золотистой рамке"
                    />

                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.75, display: "block" }}>
                            Кнопка действия в истории
                        </Typography>
                        <ToggleButtonGroup
                            value={promoActionType}
                            exclusive
                            fullWidth
                            size="small"
                            onChange={(_, val) => { if (val) setPromoActionType(val); }}
                        >
                            <ToggleButton value="book">Записаться онлайн</ToggleButton>
                            <ToggleButton value="call">Позвонить</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: "space-between" }}>
                {frame?.promo ? (
                    <Button color="error" onClick={removePromo} sx={{ fontWeight: 600 }}>
                        Удалить
                    </Button>
                ) : <Box />}
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => setPromoOpen(false)}>Отмена</Button>
                    <Button variant="contained" onClick={savePromo} sx={{ fontWeight: 700, px: 2.5 }}>
                        Готово
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
        <Dialog open={Boolean(videoTrim)} onClose={cancelVideoTrim} fullWidth maxWidth="sm">
            <DialogTitle>Обрезать видео</DialogTitle>
            <DialogContent>
                {videoTrim && <Stack spacing={2} sx={{ pt: 1 }}>
                    <Box component="video" ref={trimVideoRef} src={videoTrim.url} controls autoPlay muted playsInline
                        onLoadedMetadata={() => {
                            if (trimVideoRef.current) trimVideoRef.current.currentTime = videoTrim.start;
                        }}
                        onTimeUpdate={() => {
                            const video = trimVideoRef.current;
                            if (video && video.currentTime >= videoTrim.end) video.currentTime = videoTrim.start;
                        }}
                        sx={{ width: "100%", maxHeight: 360, bgcolor: "#0b1020", borderRadius: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        Выберите фрагмент. Он будет автоматически разделён на слайды по 60 секунд.
                    </Typography>
                    <Slider
                        aria-label="Фрагмент видео"
                        value={[videoTrim.start, videoTrim.end]}
                        min={0}
                        max={videoTrim.duration}
                        step={0.1}
                        disableSwap
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => formatTime(value)}
                        onChange={(_, value) => {
                            if (!Array.isArray(value)) return;
                            const [start, end] = value as number[];
                            setVideoTrim((current) => current ? { ...current, start, end } : current);
                        }}
                    />
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Начало: {formatTime(videoTrim.start)}</Typography>
                        <Typography variant="body2">Конец: {formatTime(videoTrim.end)}</Typography>
                    </Stack>
                    <Alert severity="info">
                        Выбрано {formatTime(videoTrim.end - videoTrim.start)} · максимум для публикации: {formatTime(MAX_STORY_SECONDS)}
                    </Alert>
                </Stack>}
            </DialogContent>
            <DialogActions>
                <Button onClick={cancelVideoTrim}>Отмена</Button>
                <Button variant="contained" onClick={useTrimmedVideo}>Использовать фрагмент</Button>
            </DialogActions>
        </Dialog>
        <StoryCapture open={captureOpen} loading={loadingImage} onClose={() => setCaptureOpen(false)} onText={captureText} onPhoto={capturePhoto} onVideo={captureVideo} />
        <Dialog open={chooseOpen} onClose={() => { if (!loadingImage) setChooseOpen(false); }} fullWidth maxWidth="xs">
            <DialogTitle>{frames.length ? "Добавить слайд" : "Добавить объявление"}</DialogTitle>
            <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
                <Button variant={frames.length ? "outlined" : "contained"} startIcon={<TextFieldsRoundedIcon />} disabled={loadingImage} onClick={addText}>
                    {frames.length ? "Текст на фоне" : "Добавить текст"}
                </Button>
                <Button variant="contained" startIcon={<PhotoCameraRoundedIcon />} disabled={loadingImage} onClick={openCapture}>Открыть камеру</Button>
                <Button variant="outlined" startIcon={<ImageRoundedIcon />} disabled={loadingImage} onClick={() => gallery.current?.click()}>Выбрать фото из галереи</Button>
                <Button variant="outlined" startIcon={<VideocamRoundedIcon />} disabled={loadingImage} onClick={() => document.getElementById("story-video-gallery")?.click()}>Выбрать видео из галереи</Button>
                {loadingImage && <LinearProgress aria-label="Открываем фото" />}
            </Stack></DialogContent>
            <DialogActions><Button disabled={loadingImage} onClick={() => setChooseOpen(false)}>Отмена</Button></DialogActions>
        </Dialog>
    </>;
}
