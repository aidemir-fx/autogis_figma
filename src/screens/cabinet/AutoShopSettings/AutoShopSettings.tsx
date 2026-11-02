import React, { useState, useEffect } from "react";
import { ButtonGroup, FormControl, InputLabel, MenuItem, Paper, Select, Switch, Typography } from "@mui/material";
import InputMask from "react-input-mask";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@modules/map";
import { Coordinates } from "@modules/masters";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { mapCoordinatesToPoint } from "@modules/masters/domain/api";
import { fetchAllAutoMarks, fetchAllProductCategories } from "@modules/masters/domain/api";
import { toast } from "react-toastify";
import { Button, Checkbox, CoverPhotoUpload, SettingsSection, TagSelector, TextField } from "@common/components";
import { MapButton } from "../Settings/styles";
import { useAutoShop } from "@common/hooks";
import { http } from "@common/lib/http";
import { fetchAutoShopAdditionalServices } from "@modules/users/api";
import { DashboardLayout } from "@modules/layout";
import {
    FieldGrid,
    MapContainer,
    MapTextField,
    SubmitButtonContainer,
    TimePickersContainer,
    WorkingDaysContainer,
    AdditionalServiceWrapper,
    SwitchRow,
    SwitchLabel,
} from "../Settings/shared-styles";
import { autoShopSchema } from "../Settings/validation";
import { PAYMENT_OPTIONS } from "../Settings/payment-options";
import { CameraIcon, ClockIcon, ShoppingBag, GearIcon, PlusIcon } from "@common/icons";
import {
    AutoShopStatus,
    AutoShopStatusToggle,
    AdditionalService,
} from "@modules/auto-shops";

type ShopType = "parts_store" | "mixed" | "specialized";

function parseTimeValue(value?: string | null): Dayjs {
    const [hours, minutes] = (value ?? "08:00").split(":").map(Number);
    return dayjs()
        .hour(Number.isFinite(hours) ? hours : 8)
        .minute(Number.isFinite(minutes) ? minutes : 0)
        .second(0)
        .millisecond(0);
}

const SHOP_TYPE_LABELS: Record<ShopType, string> = {
    parts_store: "Магазин запчастей",
    mixed: "Смешанный ассортимент",
    specialized: "Специализированный",
};

export type AutoShopFormValues = {
    fullName: string;
    phone: string;
    workingPhone: string;
    description: string;
    address: string;
    coordinates: Coordinates;
    workingDays: boolean[];
    workFrom: Dayjs;
    workTo: Dayjs;
    additionalServices: string[];
    shopType: ShopType;
    hasPickup: boolean;
    deliveryAvailable: boolean;
    onlineBookingEnabled: boolean;
    payments: string[];
    deliveryRadiusKm: number;
    brands: string[];
    productCategories: string[];
    coverImageUrl: string;
    coverImageAssetId: string;
};

export function AutoShopSettings() {
    const queryClient = useQueryClient();
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const [coverUploadActive, setCoverUploadActive] = useState(false);
    const { autoShopProfile, isLoading, error, refetch } = useAutoShop();
    const autoShop = autoShopProfile?.profile;

    const form = useForm<AutoShopFormValues>({
        resolver: yupResolver(autoShopSchema) as any,
        defaultValues: {
            workingDays: [true, true, true, true, true, false, false],
            fullName: "",
            phone: "",
            workingPhone: "",
            description: "",
            address: "",
            coordinates: { x: 0, y: 0 },
            workFrom: parseTimeValue("08:00"),
            workTo: parseTimeValue("18:00"),
            additionalServices: [],
            shopType: "parts_store",
            hasPickup: false,
            deliveryAvailable: false,
            onlineBookingEnabled: false,
            payments: [],
            deliveryRadiusKm: 0,
            brands: [],
            productCategories: [],
            coverImageUrl: "",
            coverImageAssetId: "",
        },
    });

    const deliveryAvailable = form.watch("deliveryAvailable");
    const coverImageUrl = form.watch("coverImageUrl");
    const coverImageAssetId = form.watch("coverImageAssetId");

    const { data: availableServices } = useQuery({
        queryKey: ["autoShopAdditionalServices"],
        queryFn: fetchAutoShopAdditionalServices,
    });

    const autoShopBrandsQuery = useQuery({
        queryKey: ["auto-shop-brands"],
        queryFn: fetchAllAutoMarks,
    });

    const productCategoriesQuery = useQuery({
        queryKey: ["product-categories"],
        queryFn: fetchAllProductCategories,
    });

    useEffect(() => {
        const profileData = autoShop;
        if (profileData && !isLoading) {
            form.reset({
                fullName: profileData.fullName ?? "",
                phone: autoShopProfile?.phone ?? "",
                workingPhone: profileData.workingPhone ?? "",
                description: profileData.description ?? "",
                address: profileData.address ?? "",
                coordinates: profileData.coordinates ?? { x: 0, y: 0 },
                workingDays: profileData.workingDays ?? [
                    true, true, true, true, true, false, false,
                ],
                workFrom: parseTimeValue(profileData.workFrom),
                workTo: parseTimeValue(profileData.workTo ?? "18:00"),
                additionalServices:
                    profileData.additionalServices?.map(
                        (service) => service.name
                    ) ?? [],
                shopType: (profileData as any).shopType ?? "parts_store",
                hasPickup: (profileData as any).hasPickup ?? false,
                deliveryAvailable: (profileData as any).deliveryAvailable ?? false,
                onlineBookingEnabled: profileData.onlineBookingEnabled ?? false,
                payments: profileData.payments ?? [],
                deliveryRadiusKm: (profileData as any).deliveryRadiusKm ?? 0,
                brands: (profileData as any).brands ?? [],
                productCategories: (profileData as any).productCategories ?? [],
                coverImageUrl: profileData.coverImageUrl ?? "",
                coverImageAssetId: profileData.coverImageAssetId ?? "",
            });
        }
    }, [autoShop, isLoading, form, autoShopProfile]);

    const mutation = useMutation({
        mutationFn: async (values: AutoShopFormValues) => {
            return http.put("/auto_shops/profile/me", {
                fullName: values.fullName,
                address: values.address,
                description: values.description,
                coordinates: mapCoordinatesToPoint(values.coordinates),
                workingDays: values.workingDays,
                workFrom: values.workFrom
                    ? typeof values.workFrom === "string"
                        ? values.workFrom
                        : dayjs(values.workFrom).format("HH:mm")
                    : undefined,
                workTo: values.workTo
                    ? typeof values.workTo === "string"
                        ? values.workTo
                        : dayjs(values.workTo).format("HH:mm")
                    : undefined,
                phone: values.phone,
                workingPhone: values.workingPhone,
                additionalServices: values.additionalServices,
                shopType: values.shopType,
                hasPickup: values.hasPickup,
                deliveryAvailable: values.deliveryAvailable,
                onlineBookingEnabled: values.onlineBookingEnabled,
                payments: values.payments,
                deliveryRadiusKm: values.deliveryAvailable ? values.deliveryRadiusKm : 0,
                brands: values.brands,
                productCategories: values.productCategories,
                coverImageUrl: values.coverImageUrl ?? "",
                coverImageAssetId: values.coverImageAssetId || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["autoShopProfile"] });
            queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "userProfile" });
            toast.success("Изменения успешно сохранены");
        },
        onError: () => {
            toast.error("Не удалось сохранить изменения. Попробуйте ещё раз.");
        },
    });

    const handleLocationSelect = (
        coordinates: Coordinates,
        address: string
    ) => {
        form.setValue("coordinates", coordinates);
        form.setValue("address", address);
    };

    const onSubmit = (values: AutoShopFormValues) => {
        if (coverUploadActive) {
            toast.error("Дождитесь завершения загрузки главного фото");
            return;
        }
        if (
            !values.coordinates ||
            (values.coordinates.x === 0 && values.coordinates.y === 0)
        ) {
            toast.error("Укажите автомагазин на карте перед сохранением");
            return;
        }
        mutation.mutate(values);
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Настройки - Автомагазин">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Загружаем профиль автомагазина...</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Настройки - Автомагазин">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography sx={{ mb: 2 }}>
                        Не удалось загрузить профиль автомагазина.
                    </Typography>
                    <Button type="button" onClick={() => refetch()}>
                        Повторить
                    </Button>
                </Paper>
            </DashboardLayout>
        );
    }

    if (!autoShop) {
        return (
            <DashboardLayout title="Настройки - Автомагазин">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Профиль автомагазина пока не найден.</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Настройки - Автомагазин">
            {/* 1. Статус */}
            <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Статус">
                <AutoShopStatusToggle
                    currentStatus={autoShop?.status || AutoShopStatus.SCHEDULE}
                />
            </SettingsSection>

            <form onSubmit={form.handleSubmit(onSubmit, () => {
                toast.error("Проверьте правильность заполнения формы");
            })}>
                {/* 2. Основная информация */}
                <SettingsSection icon={<ShoppingBag color="#1d4ed8" />} title="Информация об автомагазине">
                    <FieldGrid>
                        <Controller
                            name="fullName"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    label="Название автомагазина"
                                    placeholder="Введите название автомагазина"
                                    fullWidth
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    {...field}
                                />
                            )}
                        />
                        <Controller
                            name="workingPhone"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <InputMask mask="+7 (999) 999-99-99" {...field}>
                                    {(inputProps: any) => (
                                        <TextField
                                            {...inputProps}
                                            label="Рабочий телефон"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message || "Номер для связи"}
                                        />
                                    )}
                                </InputMask>
                            )}
                        />
                    </FieldGrid>

                    <MapContainer>
                        <MapTextField>
                            <Controller
                                name="address"
                                control={form.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Укажите автомагазин на карте"
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                        placeholder="Укажите автомагазин на карте"
                                    />
                                )}
                            />
                        </MapTextField>
                        <MapButton
                            variant="contained"
                            onClick={() => setLocationPickerOpen(true)}
                        >
                            Карта
                        </MapButton>
                    </MapContainer>

                    <Controller
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                            <TextField
                                label="Описание товаров и услуг"
                                placeholder="Опишите товары и услуги автомагазина"
                                fullWidth
                                multiline
                                rows={3}
                                {...field}
                            />
                        )}
                    />
                </SettingsSection>

                {/* 3. Профильные параметры автомагазина */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Параметры автомагазина">
                    <Controller
                        name="shopType"
                        control={form.control}
                        render={({ field }) => (
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Тип магазина</InputLabel>
                                <Select
                                    {...field}
                                    label="Тип магазина"
                                >
                                    {Object.entries(SHOP_TYPE_LABELS).map(
                                        ([value, label]) => (
                                            <MenuItem key={value} value={value}>
                                                {label}
                                            </MenuItem>
                                        )
                                    )}
                                </Select>
                            </FormControl>
                        )}
                    />

                    <SwitchRow>
                        <SwitchLabel>Самовывоз</SwitchLabel>
                        <Controller
                            name="hasPickup"
                            control={form.control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onChange={field.onChange}
                                    color="primary"
                                />
                            )}
                        />
                    </SwitchRow>

                    <SwitchRow>
                        <SwitchLabel>Доставка</SwitchLabel>
                        <Controller
                            name="deliveryAvailable"
                            control={form.control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onChange={field.onChange}
                                    color="primary"
                                />
                            )}
                        />
                    </SwitchRow>

                    <SwitchRow>
                        <SwitchLabel>Онлайн-запись</SwitchLabel>
                        <Controller
                            name="onlineBookingEnabled"
                            control={form.control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onChange={field.onChange}
                                    color="primary"
                                />
                            )}
                        />
                    </SwitchRow>

                    <Controller
                        name="payments"
                        control={form.control}
                        render={({ field }) => (
                            <FormControl fullWidth sx={{ mt: 1 }}>
                                <InputLabel>Способы оплаты</InputLabel>
                                <Select
                                    {...field}
                                    multiple
                                    label="Способы оплаты"
                                    renderValue={(selected) =>
                                        (selected as string[])
                                            .map(
                                                (value) =>
                                                    PAYMENT_OPTIONS.find((option) => option.value === value)?.label ?? value,
                                            )
                                            .join(", ")
                                    }
                                >
                                    {PAYMENT_OPTIONS.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            <Checkbox checked={field.value.includes(option.value)} />
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    />

                    {deliveryAvailable && (
                        <Controller
                            name="deliveryRadiusKm"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === "") {
                                            field.onChange("");
                                            return;
                                        }
                                        const num = parseInt(raw, 10);
                                        if (!isNaN(num)) {
                                            field.onChange(Math.max(0, num));
                                        }
                                    }}
                                    onBlur={() => {
                                        field.onBlur();
                                        const num = parseInt(String(field.value), 10);
                                        if (isNaN(num) || num < 0) {
                                            field.onChange(0);
                                        }
                                    }}
                                    label="Радиус доставки (км)"
                                    type="number"
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                    sx={{ mt: 1, mb: 2 }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    )}

                    <TagSelector
                        name="brands"
                        control={form.control}
                        options={autoShopBrandsQuery.data?.map((brand) => brand.name) ?? []}
                        label="Добавить бренд"
                        placeholder="Введите бренд"
                        helperText="Укажите бренды товаров в наличии"
                        emptyMessage="Бренды не указаны"
                    />

                    <TagSelector
                        name="productCategories"
                        control={form.control}
                        options={productCategoriesQuery.data ?? []}
                        label="Добавить категорию"
                        placeholder="Введите категорию товаров"
                        helperText="Укажите категории товаров"
                        emptyMessage="Категории не указаны"
                    />
                </SettingsSection>

                {/* 4. Дополнительные услуги */}
                <SettingsSection icon={<PlusIcon color="#1d4ed8" />} title="Дополнительные услуги">
                    <Controller
                        name="additionalServices"
                        control={form.control}
                        render={({ field }) => (
                            <>
                                {availableServices?.map(
                                    (service: AdditionalService) => (
                                        <AdditionalServiceWrapper key={service.id}>
                                            <Checkbox
                                                checked={
                                                    field.value?.includes(service.name) || false
                                                }
                                                onChange={(event) => {
                                                    const isChecked = event.target.checked;
                                                    const currentServices = field.value || [];
                                                    if (isChecked) {
                                                        field.onChange([
                                                            ...currentServices,
                                                            service.name,
                                                        ]);
                                                    } else {
                                                        field.onChange(
                                                            currentServices.filter(
                                                                (s) => s !== service.name
                                                            )
                                                        );
                                                    }
                                                }}
                                            />
                                            {service.name}
                                        </AdditionalServiceWrapper>
                                    )
                                )}
                            </>
                        )}
                    />
                </SettingsSection>

                {/* 5. Главное фото точки */}
                <SettingsSection icon={<CameraIcon color="#1d4ed8" />} title="Главное фото точки">
                    <CoverPhotoUpload
                        entityId={autoShop.id}
                        value={
                            coverImageUrl
                                ? {
                                      url: coverImageUrl,
                                      assetId: coverImageAssetId || undefined,
                                  }
                                : null
                        }
                        onChange={(value) => {
                            form.setValue("coverImageUrl", value?.url ?? "", {
                                shouldDirty: true,
                            });
                            form.setValue(
                                "coverImageAssetId",
                                value?.assetId ?? "",
                                { shouldDirty: true }
                            );
                        }}
                        onUploadStateChange={setCoverUploadActive}
                    />
                </SettingsSection>

                {/* 6. График работы */}
                <SettingsSection icon={<ClockIcon color="#1d4ed8" />} title="График работы">
                    <TimePickersContainer>
                        <Controller
                            name="workFrom"
                            control={form.control}
                            render={({ field }) => (
                                <DesktopTimePicker
                                    sx={{ width: "100%" }}
                                    ampm={false}
                                    label="Работаю с (HH:mm)"
                                    slotProps={{ textField: { error: false } }}
                                    {...field}
                                    value={dayjs(field.value, "HH:mm")}
                                />
                            )}
                        />
                        <Controller
                            name="workTo"
                            control={form.control}
                            render={({ field }) => (
                                <DesktopTimePicker
                                    sx={{ width: "100%" }}
                                    ampm={false}
                                    label="Работаю до (HH:mm)"
                                    slotProps={{ textField: { error: false } }}
                                    {...field}
                                    value={dayjs(field.value, "HH:mm")}
                                />
                            )}
                        />
                    </TimePickersContainer>

                    <Controller
                        name="workingDays"
                        control={form.control}
                        render={({ field }) => (
                            <WorkingDaysContainer>
                                <Typography variant="body1" sx={{ mb: 1 }}>
                                    Рабочие дни:
                                </Typography>
                                <ButtonGroup variant="outlined" fullWidth sx={{ gap: 1 }}>
                                    {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(
                                        (day, index) => (
                                            <Button
                                                key={day}
                                                variant={
                                                    field.value?.[index]
                                                        ? "contained"
                                                        : "outlined"
                                                }
                                                isFullWidth
                                                onClick={() => {
                                                    const newValue = [
                                                        ...(field.value || [
                                                            true, true, true, true, true, false, false,
                                                        ]),
                                                    ];
                                                    newValue[index] = !newValue[index];
                                                    field.onChange(newValue);
                                                }}
                                            >
                                                {day}
                                            </Button>
                                        )
                                    )}
                                </ButtonGroup>
                            </WorkingDaysContainer>
                        )}
                    />
                </SettingsSection>

                {/* 7. Кнопка сохранения */}
                <SubmitButtonContainer>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={mutation.isPending || coverUploadActive}
                        isLoading={mutation.isPending || coverUploadActive}
                        isFullWidth
                    >
                        Сохранить
                    </Button>
                </SubmitButtonContainer>
            </form>

            <LocationPicker
                open={locationPickerOpen}
                onClose={() => setLocationPickerOpen(false)}
                onLocationSelect={handleLocationSelect}
                initialCoordinates={form.watch("coordinates")}
            />
        </DashboardLayout>
    );
}
