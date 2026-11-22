import { useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@common/hooks/useAuth";
import { useUserProfile } from "@common/hooks/useUserProfile";
import {
    createOrder,
    getActivityTypeByName,
    OrderTimePreference,
} from "@modules/orders/api";
import { CreateOrderModalProps } from "../types";
import { usePhotoUpload, UsePhotoUploadReturn } from "../usePhotoUpload";

export interface OrderFormData {
    name: string;
    phone: string;
    carBrand: string;
    vehicleYear: string;
    desiredDate: string;
    desiredTime: string;
    description: string;
    timePreference: OrderTimePreference | "";
}

export type UseLogicParams = CreateOrderModalProps & { compact: boolean };

export interface UseLogicReturn {
    form: UseFormReturn<OrderFormData>;
    isLoading: boolean;
    activityTypeId: string;
    submitState: "idle" | "success" | "error";
    isSubmitDisabled: boolean;
    photoUpload: UsePhotoUploadReturn;
    handleSubmit: () => void;
    handleClose: () => void;
    finish: () => void;
}

export function useLogic(props: UseLogicParams): UseLogicReturn {
    const { onClose, onSuccess, providers, open, compact } = props;
    const primaryProvider = providers?.[0];
    const { isAuthenticated } = useAuth();
    const { profile, phone } = useUserProfile();
    const navigate = useNavigate();
    const location = useLocation();
    const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
    const [isLoading, setIsLoading] = useState(false);
    const [activityTypeId, setActivityTypeId] = useState<string>("");
    const photoUpload = usePhotoUpload();
    const isSelfBooking = Boolean(
        profile?.id &&
            providers.some((provider) => (provider.userId || provider.id) === profile.id),
    );

    const form = useForm<OrderFormData>({
        defaultValues: {
            name: "",
            phone: "",
            carBrand: "",
            vehicleYear: "",
            desiredDate: "",
            desiredTime: "",
            description: "",
            timePreference: "",
        },
    });

    const { handleSubmit: formHandleSubmit, reset } = form;

    useEffect(() => {
        if (!open) return;
        const fetchActivityType = async () => {
            try {
                const providerActivityType = primaryProvider?.activityType || "master";
                const activityType = await getActivityTypeByName(
                    providerActivityType
                );
                setActivityTypeId(activityType.id);
            } catch (error) {
                console.error("Ошибка при получении типа деятельности:", error);
                toast.error("Ошибка при получении данных");
            }
        };

        fetchActivityType();
    }, [open, primaryProvider?.activityType]);

    useEffect(() => {
        if (open && profile) {
            reset({
                name: profile.name || "",
                phone: phone || "",
                carBrand: "",
            vehicleYear: "",
            desiredDate: "",
            desiredTime: "",
                description: "",
                timePreference: "",
            });
        }
    }, [open, profile?.id, phone, reset]);

    const isSubmitDisabled = isLoading || !activityTypeId || isSelfBooking || photoUpload.isUploading;

    const handleClose = () => {
        if (isLoading) return;
        photoUpload.clearPhotos();
        setSubmitState("idle");
        reset({
            name: profile?.name || "",
            phone: phone || "",
            carBrand: "",
            vehicleYear: "",
            desiredDate: "",
            desiredTime: "",
            description: "",
            timePreference: "",
        });
        onClose();
    };

    const onSubmit = async (data: OrderFormData) => {
        if (!isAuthenticated) {
            navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }

        if (isSelfBooking) {
            toast.info("Нельзя оставить заявку самому себе");
            return;
        }

        if (!activityTypeId) {
            toast.error("Ошибка при получении типа услуги");
            return;
        }

        const desiredDateTime = compact ? `${data.desiredDate}T${data.desiredTime}:00+03:00` : undefined;
        if (desiredDateTime && (!Number.isFinite(Date.parse(desiredDateTime)) || Date.parse(desiredDateTime) <= Date.now())) {
            form.setError("desiredDate", { message: "Укажите будущее время визита по Москве" });
            return;
        }
        if (photoUpload.photos.some((photo) => photo.error)) {
            toast.error("Уберите фото, которые не загрузились.");
            return;
        }
        setSubmitState("idle");
        setIsLoading(true);

        try {
            const providerUserIds = (providers || [])
                .map((p) => p.userId || p.id)
                .filter(Boolean);

            await createOrder({
                providerIds: providerUserIds,
                activityTypeId,
                name: data.name,
                phone: data.phone,
                carBrand: data.carBrand,
                description: data.description,
                timePreference: data.timePreference || "not_urgent",
                vehicleYear: compact ? Number(data.vehicleYear) : undefined,
                desiredDateTime,
                photoAssetIds: photoUpload.uploadedAssetIds,
            });

            photoUpload.clearPhotos();
            if (compact) {
                setSubmitState("success");
            } else {
                toast.success("Заявка успешно отправлена!");
                onClose();
                onSuccess?.();
            }
        } catch (error) {
            setSubmitState("error");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        form,
        isLoading,
        activityTypeId,
        submitState,
        isSubmitDisabled,
        photoUpload,
        handleSubmit: () => formHandleSubmit(onSubmit)(),
        handleClose,
        finish: () => { handleClose(); onSuccess?.(); },
    };
}
