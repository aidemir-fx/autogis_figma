import {
    Dialog,
    DialogTitle,
    DialogActions,
    Alert,
    MenuItem,
    useMediaQuery,
    Stack,
    Typography,
    CircularProgress,
} from "@mui/material";

import { COMPACT_LAYOUT_MEDIA_QUERY } from "@modules/layout/features/layoutViewport";
import { ORDER_TIME_PREFERENCE_LABELS } from "@modules/orders/api";
import { CalendarIcon } from "@common/icons";
import {
    DialogHeaderWrapper,
    StyledDialogContent,
    Title,
    TimeHint,
    PhotoSection,
    PhotoSectionLabel,
    PhotoGrid,
    PhotoThumb,
    PhotoThumbImage,
    PhotoRemoveButton,
    PhotoUploadingOverlay,
    PhotoErrorOverlay,
    AddPhotoButton,
} from "./styles";
import { Button, TextField } from "@common/components";
import { useLogic } from "./useLogic";
import { Controller } from "react-hook-form";
import { CreateOrderModalProps } from "./types";


// ─── Inline SVG icons (no extra deps) ─────────────────────────────────────────

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </svg>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CreateOrderModal(props: CreateOrderModalProps) {
    const { providers, open } = props;
    const compact = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const {
        form,
        isLoading,
        isSubmitDisabled,
        photoUpload,
        handleSubmit,
        handleClose,
        finish,
        submitState,
    } = useLogic({ ...props, compact });

    const {
        control,
        formState: { errors },
    } = form;

    const { photos, addPhotos, removePhoto } = photoUpload;
    const canAddMore = photos.length < 10;

    return (
        <Dialog
            open={open}
            onClose={submitState === "success" ? finish : handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: compact ? "12px" : "14px",
                    ...(compact && {
                        width: "calc(100% - 32px)",
                        m: 2,
                        "& .MuiDialogTitle-root, & .MuiDialogContent-root, & .MuiDialogActions-root": { px: 2 },
                        "& .MuiDialogActions-root button": { minHeight: 38, borderRadius: "8px" },
                        "& .MuiDialogActions-root button:last-of-type": { bgcolor: "var(--ds-color-blue-600)", color: "white" },
                        "& .MuiInputBase-root": { bgcolor: "var(--ds-color-gray-100)", minHeight: 44 },
                        "& .MuiDialogTitle-root svg": { color: "var(--ds-color-blue-500)" },
                    }),
                    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                },
            }}
        >
            {submitState === "success" ? <>
                <DialogTitle>Заявка отправлена</DialogTitle>
                <StyledDialogContent>Исполнитель увидит заявку и подтвердит время или предложит другое.</StyledDialogContent>
                <DialogActions><Button variant="contained" onClick={finish}>Готово</Button></DialogActions>
            </> : <>
            <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                <DialogHeaderWrapper>
                    <CalendarIcon />
                    <Title>Оставить заявку</Title>
                </DialogHeaderWrapper>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Заполните информацию для записи к&nbsp;
                    <strong>{providers?.length > 1 ? `Выбрано мастеров: ${providers.length}` : (providers?.[0]?.fullName || providers?.[0]?.name || "мастеру")}</strong>
                </Typography>
            </DialogTitle>

            <StyledDialogContent>
                {/* Имя */}
                <Controller
                    name="name"
                    control={control}
                    rules={{
                        required: "Укажите имя",
                        minLength: { value: 2, message: "Укажите имя" },
                        maxLength: { value: 100, message: "Слишком длинное имя" },
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label="Имя"
                            placeholder="Ваше имя"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                        />
                    )}
                />

                {/* Телефон */}
                <Controller
                    name="phone"
                    control={control}
                    rules={{
                        required: "Введите корректный номер телефона",
                        validate: (v) => {
                            const digits = v.replace(/\D/g, "");
                            return digits.length >= 11 || "Введите корректный номер телефона";
                        },
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label="Номер телефона"
                            placeholder="+7 999 123-45-67"
                            type="tel"
                            error={!!errors.phone}
                            helperText={errors.phone?.message}
                        />
                    )}
                />

                {/* Марка автомобиля */}
                <Controller
                    name="carBrand"
                    control={control}
                    rules={{
                        required: "Укажите марку автомобиля",
                        minLength: { value: 2, message: "Укажите марку автомобиля" },
                        maxLength: { value: 50, message: "Слишком длинное название" },
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label="Марка автомобиля"
                            placeholder="Например: Toyota, BMW, LADA"
                            error={!!errors.carBrand}
                            helperText={errors.carBrand?.message}
                        />
                    )}
                />

                {compact ? <>
                <Controller name="vehicleYear" control={control} rules={{
                    required: "Укажите год автомобиля",
                    validate: (value) => /^\d{4}$/.test(value) && Number(value) >= 1886 && Number(value) <= new Date().getFullYear() + 1
                        || "Укажите корректный год",
                }} render={({ field }) => <TextField {...field} fullWidth label="Год автомобиля"
                    placeholder="Например: 2018" inputProps={{ inputMode: "numeric", maxLength: 4 }}
                    error={!!errors.vehicleYear} helperText={errors.vehicleYear?.message} />} />

                <Stack spacing={1}>
                    <Controller name="desiredDate" control={control} rules={{ required: "Выберите дату" }}
                        render={({ field }) => <TextField {...field} fullWidth type="date" label="Желаемая дата"
                            InputLabelProps={{ shrink: true }} error={!!errors.desiredDate} helperText={errors.desiredDate?.message} />} />
                    <Controller name="desiredTime" control={control} rules={{ required: "Введите время" }}
                        render={({ field }) => <TextField {...field} fullWidth type="time" label="Желаемое время (МСК)"
                            InputLabelProps={{ shrink: true }} error={!!errors.desiredTime} helperText={errors.desiredTime?.message} />} />
                    <TimeHint><ClockIcon />Исполнитель подтвердит время или предложит свободное.</TimeHint>
                </Stack>
                </> : <Controller name="timePreference" control={control}
                    rules={{ required: "Выберите удобный вариант по времени" }}
                    render={({ field }) => <TextField {...field} fullWidth select label="Когда вам удобно?"
                        error={!!errors.timePreference} helperText={errors.timePreference?.message}>
                        <MenuItem value="" disabled>Выберите вариант</MenuItem>
                        {Object.entries(ORDER_TIME_PREFERENCE_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
                    </TextField>} />}

                {/* Описание проблемы */}
                <Controller
                    name="description"
                    control={control}
                    rules={{
                        required: "Опишите проблему (минимум 10 символов)",
                        minLength: {
                            value: 10,
                            message: "Опишите проблему (минимум 10 символов)",
                        },
                        maxLength: {
                            value: 2000,
                            message: "Описание не должно превышать 2000 символов",
                        },
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label="Описание проблемы"
                            placeholder="Опишите вашу проблему или требуемые услуги..."
                            error={!!errors.description}
                            helperText={errors.description?.message}
                            multiline
                            rows={4}
                        />
                    )}
                />

                {/* Фотографии */}
                <PhotoSection>
                    <PhotoSectionLabel>
                        Фотографии{" "}
                        <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                            (необязательно, до 10 фото)
                        </span>
                    </PhotoSectionLabel>
                    <PhotoGrid>
                        {photos.map((photo) => (
                            <PhotoThumb key={photo.id}>
                                <PhotoThumbImage
                                    src={photo.previewUrl}
                                    alt="Фото"
                                />
                                {photo.uploading && (
                                    <PhotoUploadingOverlay>
                                        <CircularProgress
                                            size={20}
                                            sx={{ color: "#64b441" }}
                                        />
                                    </PhotoUploadingOverlay>
                                )}
                                {photo.error && !photo.uploading && (
                                    <PhotoErrorOverlay>Ошибка</PhotoErrorOverlay>
                                )}
                                {!photo.uploading && (
                                    <PhotoRemoveButton
                                        type="button"
                                        onClick={() => removePhoto(photo.id)}
                                        aria-label="Удалить фото"
                                    >
                                        <XIcon />
                                    </PhotoRemoveButton>
                                )}
                            </PhotoThumb>
                        ))}

                        {canAddMore && (
                            <AddPhotoButton>
                                <PlusIcon />
                                <span>Фото</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            addPhotos(e.target.files);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                            </AddPhotoButton>
                        )}
                    </PhotoGrid>
                </PhotoSection>
                {submitState === "error" && <Alert severity="error">Не удалось отправить заявку. Попробуйте ещё раз.</Alert>}
            </StyledDialogContent>

            <DialogActions
                sx={{
                    p: 3,
                    pt: 1,
                    gap: 1.5,
                    "& > :not(:first-of-type)": { ml: 0 },
                    display: "flex",
                }}
            >
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    disabled={isLoading}
                    style={{ flex: 1 }}
                >
                    Отмена
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    isLoading={isLoading}
                    style={{ flex: compact ? 1 : 2 }}
                >
                    {isLoading ? "Отправка..." : "Отправить заявку"}
                </Button>
            </DialogActions>
            </>}
        </Dialog>
    );
}
