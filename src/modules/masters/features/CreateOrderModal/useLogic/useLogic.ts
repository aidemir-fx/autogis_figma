import { useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
    description: string;
    timePreference: OrderTimePreference | "";
}

export type UseLogicParams = CreateOrderModalProps;

export interface UseLogicReturn {
    form: UseFormReturn<OrderFormData>;
    isLoading: boolean;
    activityTypeId: string;
    isSubmitDisabled: boolean;
    photoUpload: UsePhotoUploadReturn;
    handleSubmit: () => void;
    handleClose: () => void;
}

export function useLogic(props: UseLogicParams): UseLogicReturn {
    const { onClose, onSuccess, providers } = props;
    const primaryProvider = providers?.[0];
    const { isAuthenticated } = useAuth();
    const { profile, phone } = useUserProfile();
    const navigate = useNavigate();
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
            description: "",
            timePreference: "",
        },
    });

    const { handleSubmit: formHandleSubmit, reset } = form;

    useEffect(() => {
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
    }, [primaryProvider?.activityType]);

    useEffect(() => {
        if (profile) {
            reset({
                name: profile.name || "",
                phone: phone || "",
                carBrand: "",
                description: "",
                timePreference: "",
            });
        }
    }, [profile, phone, reset]);

    const watchedValues = form.watch();

    const isSubmitDisabled =
        isLoading ||
        !activityTypeId ||
        !watchedValues.name?.trim() ||
        !watchedValues.phone?.trim() ||
        !watchedValues.carBrand?.trim() ||
        !watchedValues.description?.trim() ||
        !watchedValues.timePreference ||
        isSelfBooking ||
        photoUpload.isUploading;

    const handleClose = () => {
        reset({
            name: profile?.name || "",
            phone: phone || "",
            carBrand: "",
            description: "",
            timePreference: "",
        });
        onClose();
    };

    const onSubmit = async (data: OrderFormData) => {
        if (!isAuthenticated) {
            navigate("/login");
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

        if (!data.timePreference) {
            toast.error("Выберите удобный вариант по времени");
            return;
        }

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
                timePreference: data.timePreference,
                photoAssetIds: photoUpload.uploadedAssetIds,
            });

            toast.success("Заявка успешно отправлена!");
            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error("Ошибка при создании заявки:", error);
            toast.error("Ошибка при отправке заявки");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        form,
        isLoading,
        activityTypeId,
        isSubmitDisabled,
        photoUpload,
        handleSubmit: () => formHandleSubmit(onSubmit)(),
        handleClose,
    };
}
