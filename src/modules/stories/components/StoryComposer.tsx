import { useEffect, useRef, useState, type ChangeEvent, type TouchEvent } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createStory, uploadStoryMedia, type CreateStoryFrame } from "../api";
import { StoryCanvas, type StoryCanvasFrame } from "./StoryCanvas";

const BACKGROUNDS = ["#1d4ed8", "#0f766e", "#be123c", "#7c3aed", "#0f172a", "#f59e0b"];
const COLOR_NAMES = ["Синий", "Зелёный", "Красный", "Фиолетовый", "Тёмный", "Оранжевый"];
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
    const [textSize, setTextSize] = useState(28);
    const [backgroundOpen, setBackgroundOpen] = useState(false);
    const [cropOpen, setCropOpen] = useState(false);
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
        setTextValue(frame.text);
        setTextSize(frame.fontSize);
        setTextOpen(true);
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
        append({ id: `draft-${nextId.current++}`, kind: "text", text: "", background: BACKGROUNDS[0], fontSize: 28 });
        setTextValue("");
        setTextSize(28);
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
                payload.push({ kind: item.kind, text: item.text.trim() || undefined, assetId,
                    background: item.background, fontSize: item.fontSize, imageFit: item.imageFit,
                    imageScale: item.imageScale, imageX: item.imageX, imageY: item.imageY,
                    textX: item.textX, textY: item.textY,
                    videoStart: item.kind === "video" ? (item.videoStart ?? 0) - (item.videoSourceStart ?? 0) : item.videoStart,
                    videoEnd: item.kind === "video" ? (item.videoEnd ?? 0) - (item.videoSourceStart ?? 0) : item.videoEnd });
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
                toast.success("Объявление опубликовано на 24 часа");
            }
        } catch (error) {
            if (mounted.current) {
                const reason = error instanceof Error ? error.message : "Неизвестная ошибка";
                setPublishError(`Не удалось опубликовать объявление. ${reason}. Черновик сохранён на этом экране — попробуйте ещё раз.`);
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
            : { p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            {!compact && <>
                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Поделитесь новостями</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Анонс, акция или новые работы — достаточно фото или текста.</Typography>
            </>}
            {compact ? (
                <Box
                    component="button"
                    type="button"
                    onClick={openCapture}
                    aria-label="Добавить объявление"
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
                            border: "1.5px dashed #cbd5e1",
                            borderRadius: "20px",
                            background: "#ffffff",
                            display: "grid",
                            placeItems: "center",
                            color: "#0284c7",
                            fontSize: 28,
                            lineHeight: 1,
                        }}
                    >
                        +
                    </Box>
                    <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                        Добавить
                    </Typography>
                </Box>
            ) : frames.length ? <>
                <Button fullWidth variant="contained" onClick={() => setOpen(true)}>Продолжить · {frames.length} слайд(а)</Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Черновик хранится только до ухода с этой страницы.</Typography>
            </> : <Stack direction="row" spacing={1}>
                <Button fullWidth variant="outlined" startIcon={<TextFieldsRoundedIcon />} onClick={addText}>Текст</Button>
                <Button fullWidth variant="contained" startIcon={<PhotoCameraRoundedIcon />} onClick={openCapture}>Камера</Button>
            </Stack>}
        </Box>

        <Dialog fullScreen open={open && Boolean(frame)} onClose={() => { if (!publishing) setOpen(false); }}
            PaperProps={{ sx: { bgcolor: "#0b1020", color: "white", height: "100dvh", maxHeight: "100%" } }}>
            {frame && <Stack sx={{ height: "100%", boxSizing: "border-box", pt: "env(safe-area-inset-top)", pb: "env(safe-area-inset-bottom)" }}>
                <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, flexShrink: 0 }}>
                    <IconButton aria-label="Закрыть редактор, сохранив черновик" disabled={publishing} onClick={() => setOpen(false)} sx={{ color: "inherit" }}><CloseRoundedIcon /></IconButton>
                    <Typography sx={{ flex: 1, textAlign: "center", fontWeight: 700 }}>Новое объявление · {selected + 1}/{frames.length}</Typography>
                    <IconButton aria-label="Удалить текущий слайд" disabled={publishing} onClick={removeFrame} sx={{ color: "inherit" }}><DeleteOutlineRoundedIcon /></IconButton>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 100, width: "100%", maxWidth: 440, mx: "auto" }}>
                    <StoryCanvas key={frame.id} frame={{ ...frame, text: frame.kind === "text" && !frame.text ? "Ваш текст" : frame.text }}
                        onImageChange={publishing ? undefined : updateFrame}
                        onTextChange={publishing ? undefined : updateFrame} />
                </Box>
                {!publishing && frame.text && <Typography variant="caption" sx={{ color: "#cbd5e1", textAlign: "center", px: 2 }}>
                    Перемещайте текст пальцем или мышью прямо на экране
                </Typography>}
                <Stack spacing={1} sx={{ p: 1.5, width: "100%", maxWidth: 520, mx: "auto", boxSizing: "border-box", flexShrink: 0,
                    maxHeight: "48dvh", overflowY: "auto" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-evenly" spacing={1}>
                        <Button startIcon={<TextFieldsRoundedIcon />} aria-label={frame.text ? "Редактировать текст" : "Добавить текст"}
                            onClick={editText} disabled={publishing} sx={{ color: "white", whiteSpace: "nowrap" }}>
                            Текст
                        </Button>
                        <Button disabled={publishing} onClick={() => setBackgroundOpen(true)} sx={{ color: "white" }}
                            startIcon={<Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: frame.background, border: "1px solid #94a3b8" }} />}>Фон</Button>
                        {frame.kind === "image" && <Button disabled={publishing} aria-pressed={cropOpen} onClick={() => setCropOpen(!cropOpen)}
                            sx={{ color: "white", bgcolor: cropOpen ? "#334155" : "transparent" }}>Кадр</Button>}
                    </Stack>
                    {textOpen && <Stack spacing={1} sx={{ p: 1.25, borderRadius: 2, bgcolor: "#111827", border: "1px solid #334155" }}>
                        <TextField autoFocus fullWidth multiline minRows={2} maxRows={5} label={frame.kind === "image" ? "Текст на фото" : "Текст объявления"}
                            value={textValue} onChange={(event) => {
                                const value = event.target.value;
                                setTextValue(value);
                                updateFrame({ text: value });
                            }} inputProps={{ maxLength: 1000 }}
                            helperText={`${textValue.length}/1000 · предпросмотр обновляется сразу`}
                            sx={{ "& .MuiInputBase-root": { color: "white" }, "& .MuiInputLabel-root": { color: "#cbd5e1" },
                                "& .MuiFormHelperText-root": { color: "#94a3b8" }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#64748b" } }} />
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>Размер</Typography>
                            <ToggleButtonGroup value={textSize} exclusive fullWidth aria-label="Размер текста"
                                onChange={(_, value) => {
                                    if (value !== null) {
                                        setTextSize(value);
                                        updateFrame({ fontSize: value });
                                    }
                                }}>
                                <ToggleButton value={20} sx={{ color: "white", borderColor: "#64748b" }}>Мелкий</ToggleButton>
                                <ToggleButton value={28} sx={{ color: "white", borderColor: "#64748b" }}>Средний</ToggleButton>
                                <ToggleButton value={36} sx={{ color: "white", borderColor: "#64748b" }}>Крупный</ToggleButton>
                            </ToggleButtonGroup>
                            <Button size="small" onClick={() => setTextOpen(false)} sx={{ color: "#93c5fd", whiteSpace: "nowrap" }}>Готово</Button>
                        </Stack>
                    </Stack>}
                    {frame.kind === "image" && cropOpen && <>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" disabled={publishing} onClick={() => updateFrame({ imageFit: "contain", imageScale: 1, imageX: 0, imageY: 0 })}
                                sx={{ color: "white", minWidth: 0, flexShrink: 0, px: 1, fontSize: 12, bgcolor: frame.imageFit === "contain" ? "#334155" : "transparent" }}>Целиком</Button>
                            <Button size="small" disabled={publishing} onClick={() => updateFrame({ imageFit: "cover", imageScale: 1, imageX: 0, imageY: 0 })}
                                sx={{ color: "white", minWidth: 0, flexShrink: 0, px: 1, fontSize: 12, bgcolor: frame.imageFit === "cover" ? "#334155" : "transparent", whiteSpace: "nowrap" }}>Заполнить</Button>
                            <Slider aria-label="Масштаб фото" min={1} max={4} step={0.05} value={frame.imageScale ?? 1} disabled={publishing}
                                valueLabelDisplay="auto" valueLabelFormat={(value) => `${value.toFixed(1)}×`}
                                onChange={(_, value) => updateFrame({ imageScale: value as number })} sx={{ flex: 1, width: "auto", minWidth: 50, mx: "10px !important" }} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#cbd5e1", textAlign: "center" }}>Перемещайте фото пальцем, увеличивайте двумя</Typography>
                    </>}
                    <Stack direction="row" spacing={1} sx={{ overflowX: "auto", py: 0.5, minHeight: 60 }} aria-label="Слайды публикации">
                        {frames.map((item, index) => <Box key={item.id} component="button" type="button" disabled={publishing}
                            aria-label={`Слайд ${index + 1}`} aria-pressed={index === selected} onClick={() => { setSelected(index); setTextOpen(false); }}
                            sx={{ p: 0, width: 34, height: 58, flexShrink: 0, overflow: "hidden", bgcolor: "transparent", cursor: "pointer",
                                borderRadius: 1, border: index === selected ? "2px solid #60a5fa" : "2px solid #475569" }}>
                            <StoryCanvas frame={item} />
                        </Box>)}
                        {frames.length < MAX_FRAMES && <IconButton aria-label="Добавить слайд" disabled={publishing} onClick={() => setChooseOpen(true)}
                            sx={{ width: 44, height: 58, borderRadius: 1.5, color: "white", border: "1px dashed #64748b" }}><AddRoundedIcon /></IconButton>}
                    </Stack>
                    {publishing && <LinearProgress variant="determinate" value={progress} aria-label="Загрузка объявления" />}
                    {publishError && <Alert severity="error" onClose={() => setPublishError(null)}>{publishError}</Alert>}
                    <Button fullWidth size="large" variant="contained" disabled={publishing} onClick={() => void publish()}
                        startIcon={publishing ? <CircularProgress size={18} color="inherit" /> : undefined}>
                        {publishing ? "Публикуем…" : "Опубликовать · 24 часа"}
                    </Button>
                </Stack>
            </Stack>}
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
