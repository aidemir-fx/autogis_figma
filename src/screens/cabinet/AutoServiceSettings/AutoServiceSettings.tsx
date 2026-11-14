import React, { useState, useEffect } from "react";
import { Box, ButtonGroup, Checkbox, FormControl, InputLabel, MenuItem, Paper, Select, Switch, Typography } from "@mui/material";
import InputMask from "react-input-mask";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@modules/map";
import { Coordinates } from "@modules/masters";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import dayjs, { Dayjs } from "dayjs";
import {
    fetchAllProfessions,
    fetchAllAutoMarks,
    fetchAllServices,
    mapCoordinatesToPoint,
} from "@modules/masters/domain/api";
import { toast } from "react-toastify";
import { Button, CoverPhotoUpload, TagSelector, SettingsSection, TextField } from "@common/components";
import { MapButton } from "../Settings/styles";
import { useAutoService } from "@common/hooks";
import { http } from "@common/lib/http";
import { DashboardLayout } from "@modules/layout";
import {
    AutoServiceStatus,
    AutoServiceStatusToggle,
} from "@modules/auto-service";
import {
    FieldGrid,
    MapContainer,
    MapTextField,
    SubmitButtonContainer,
    TimePickersContainer,
    WorkingDaysContainer,
    SwitchRow,
    SwitchLabel,
} from "../Settings/shared-styles";
import { autoServiceSchema } from "../Settings/validation";
import { PAYMENT_OPTIONS } from "../Settings/payment-options";
import { CameraIcon, ClockIcon, GearIcon } from "@common/icons";

export type AutoServiceFormValues = {
    fullName: string;
    phone: string;
    workingPhone: string;
    description: string;
    address: string;
    coordinates: Coordinates;
    professions: string[];
    services: string[];
    workingDays: boolean[];
    workFrom: Dayjs;
    workTo: Dayjs;
    hasParking: boolean;
    liftCount: number;
    warranty: boolean;
    onlineBookingEnabled: boolean;
    payments: string[];
    liveQueueEnabled: boolean;
    hotline: string;
    brandSupport: string[];
    coverImageUrl: string;
    coverImageAssetId: string;
};

function parseTimeValue(value?: string | null): Dayjs {
    const [hours, minutes] = (value ?? "08:00").split(":").map(Number);
    return dayjs()
        .hour(Number.isFinite(hours) ? hours : 8)
        .minute(Number.isFinite(minutes) ? minutes : 0)
        .second(0)
        .millisecond(0);
}

function normalizeCoordinates(
    raw:
        | Coordinates
        | { type?: string; coordinates?: [number, number] }
        | null
        | undefined
): Coordinates {
    if (
        raw &&
        typeof (raw as Coordinates).x === "number" &&
        typeof (raw as Coordinates).y === "number"
    ) {
        return raw as Coordinates;
    }

    const geo = raw as { coordinates?: [number, number] } | null | undefined;
    if (
        geo?.coordinates &&
        typeof geo.coordinates[0] === "number" &&
        typeof geo.coordinates[1] === "number"
    ) {
        return {
            x: geo.coordinates[1],
            y: geo.coordinates[0],
        };
    }

    return { x: 0, y: 0 };
}

export function AutoServiceSettings() {
    const queryClient = useQueryClient();
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const [coverUploadActive, setCoverUploadActive] = useState(false);
    const { autoServiceProfile, isLoading, error, refetch } = useAutoService();
    const profile = autoServiceProfile;

    const form = useForm<AutoServiceFormValues>({
        resolver: yupResolver(autoServiceSchema) as any,
        defaultValues: {
            professions: [],
            services: [],
            workingDays: [true, true, true, true, true, false, false],
            fullName: "",
            phone: "",
            workingPhone: "",
            description: "",
            address: "",
            coordinates: { x: 0, y: 0 },
            workFrom: parseTimeValue("08:00"),
            workTo: parseTimeValue("18:00"),
            hasParking: false,
            liftCount: 0,
            warranty: false,
            onlineBookingEnabled: false,
            payments: [],
            liveQueueEnabled: false,
            hotline: "",
            brandSupport: [],
            coverImageUrl: "",
            coverImageAssetId: "",
        },
    });

    const professionsQuery = useQuery({
        queryKey: ["professions"],
        queryFn: fetchAllProfessions,
    });

    const autoMarksQuery = useQuery({
        queryKey: ["auto-marks"],
        queryFn: fetchAllAutoMarks,
    });

    const servicesQuery = useQuery({
        queryKey: ["services"],
        queryFn: fetchAllServices,
    });
    const selectedCoordinates = form.watch("coordinates");
    const coverImageUrl = form.watch("coverImageUrl");
    const coverImageAssetId = form.watch("coverImageAssetId");

    useEffect(() => {
        const profileData = profile?.profile;

        if (profileData && !isLoading) {
            form.reset({
                fullName: profileData.fullName ?? "",
                phone: profile?.phone ?? "",
                workingPhone: profileData.workingPhone ?? "",
                description: profileData.description ?? "",
                address: profileData.address ?? "",
                coordinates: normalizeCoordinates(profileData.coordinates as any),
                professions: profileData.professions ?? [],
                services: profileData.services ?? [],
                workingDays: profileData.workingDays ?? [
                    true, true, true, true, true, false, false,
                ],
                workFrom: parseTimeValue(profileData.workFrom),
                workTo: parseTimeValue(profileData.workTo ?? "18:00"),
                hasParking: (profileData as any).hasParking ?? false,
                liftCount: (profileData as any).liftCount ?? 0,
                warranty: (profileData as any).warranty ?? false,
                onlineBookingEnabled: profileData.onlineBookingEnabled ?? false,
                payments: profileData.payments ?? [],
                liveQueueEnabled: profileData.liveQueueEnabled ?? false,
                hotline: (profileData as any).hotline ?? "",
                brandSupport: (profileData as any).brandSupport ?? [],
                coverImageUrl: profileData.coverImageUrl ?? "",
                coverImageAssetId: profileData.coverImageAssetId ?? "",
            });
        }
    }, [profile, form]);

    const mutation = useMutation({
        mutationFn: async (values: AutoServiceFormValues) => {
            return http.put("/auto_services/profile/me", {
                fullName: values.fullName,
                address: values.address,
                description: values.description,
                coordinates: mapCoordinatesToPoint(values.coordinates),
                professions: values.professions,
                services: values.services,
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
                hasParking: values.hasParking,
                liftCount: values.liftCount,
                warranty: values.warranty,
                onlineBookingEnabled: values.onlineBookingEnabled,
                payments: values.payments,
                liveQueueEnabled: values.liveQueueEnabled,
                hotline: values.hotline || undefined,
                brandSupport: values.brandSupport,
                coverImageUrl: values.coverImageUrl ?? "",
                coverImageAssetId: values.coverImageAssetId || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["autoServiceProfile"],
            });
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
        form.setValue("coordinates", coordinates, {
            shouldDirty: true,
            shouldValidate: true,
        });
        form.setValue("address", address, {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const onSubmit = (values: AutoServiceFormValues) => {
        if (coverUploadActive) {
            toast.error("Дождитесь завершения загрузки главного фото");
            return;
        }
        if (
            !values.coordinates ||
            (values.coordinates.x === 0 && values.coordinates.y === 0)
        ) {
            toast.error("Укажите автосервис на карте перед сохранением");
            return;
        }
        mutation.mutate(values);
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Настройки - Автосервис">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Загружаем профиль автосервиса...</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Настройки - Автосервис">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography sx={{ mb: 2 }}>
                        Не удалось загрузить профиль автосервиса.
                    </Typography>
                    <Button type="button" onClick={() => refetch()}>
                        Повторить
                    </Button>
                </Paper>
            </DashboardLayout>
        );
    }

    if (!profile?.profile) {
        return (
            <DashboardLayout title="Настройки - Автосервис">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>
                        Профиль автосервиса пока не найден.
                    </Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Настройки - Автосервис">
            {/* 1. Статус */}
            <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Статус">
                <AutoServiceStatusToggle
                    currentStatus={
                        profile?.profile?.status ?? AutoServiceStatus.SCHEDULE
                    }
                />
            </SettingsSection>

            <form onSubmit={form.handleSubmit(onSubmit, () => {
                toast.error("Проверьте правильность заполнения формы");
            })}>
                {/* 2. Основная информация */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Информация об автосервисе">
                    <FieldGrid>
                        <Controller
                            name="fullName"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    label="Название автосервиса"
                                    placeholder="Введите название автосервиса"
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
                                            placeholder="Введите ваш рабочий телефон"
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
                                        label="Укажите автосервис на карте"
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                        placeholder="Укажите автосервис на карте"
                                    />
                                )}
                            />
                        </MapTextField>
                        <MapButton
                            variant="contained"
                            type="button"
                            onClick={() => setLocationPickerOpen(true)}
                        >
                            Карта
                        </MapButton>
                    </MapContainer>
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                color:
                                    selectedCoordinates?.x === 0 &&
                                    selectedCoordinates?.y === 0
                                        ? "error.main"
                                        : "text.secondary",
                                display: "block",
                                mb: 2,
                            }}
                        >
                            {selectedCoordinates?.x === 0 &&
                            selectedCoordinates?.y === 0
                                ? "Координаты не выбраны. Автосервис не появится в поиске, пока вы не отметите его на карте."
                                : `Координаты: ${selectedCoordinates?.x?.toFixed(6)}, ${selectedCoordinates?.y?.toFixed(6)}`}
                        </Typography>
                    </Box>
                    <Controller
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                            <TextField
                                label="Описание услуг"
                                placeholder="Опишите услуги вашего автосервиса"
                                fullWidth
                                multiline
                                rows={3}
                                {...field}
                            />
                        )}
                    />

                    <Box sx={{ mt: 2 }}>
                        <TagSelector
                            name="professions"
                            control={form.control}
                            options={professionsQuery.data || []}
                            label="Добавить профессию"
                            placeholder="Выберите профессии"
                            helperText="Выберите специальности по которым можно вас найти"
                            emptyMessage="Выберите профессии"
                        />
                    </Box>
                </SettingsSection>

                {/* 3. Услуги */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Услуги">
                    <TagSelector
                        name="services"
                        control={form.control}
                        options={servicesQuery.data || []}
                        label="Добавить услугу"
                        placeholder="Выберите услуги"
                        helperText="Выберите услуги, по которым автосервис будут находить в поиске"
                        emptyMessage="Услуги не указаны"
                    />
                </SettingsSection>

                {/* 4. Профильные параметры автосервиса */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Параметры автосервиса">
                    <SwitchRow>
                        <SwitchLabel>Есть парковка</SwitchLabel>
                        <Controller
                            name="hasParking"
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
                        <SwitchLabel>Гарантия на работы</SwitchLabel>
                        <Controller
                            name="warranty"
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
                                    disabled={form.watch("liveQueueEnabled")}
                                    color="primary"
                                />
                            )}
                        />
                    </SwitchRow>

                    <SwitchRow>
                        <SwitchLabel>Только живая очередь</SwitchLabel>
                        <Controller
                            name="liveQueueEnabled"
                            control={form.control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onChange={(_, checked) => {
                                        field.onChange(checked);
                                        if (checked) {
                                            form.setValue("onlineBookingEnabled", false);
                                        }
                                    }}
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

                    <FieldGrid>
                        <Controller
                            name="liftCount"
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
                                    label="Количество подъемников"
                                    type="number"
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                        <Controller
                            name="hotline"
                            control={form.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Горячая линия"
                                    placeholder="Номер горячей линии (необязательно)"
                                    fullWidth
                                />
                            )}
                        />
                    </FieldGrid>

                    <Box sx={{ mt: 2 }}>
                        <TagSelector
                            name="brandSupport"
                            control={form.control}
                            options={autoMarksQuery.data?.map((brand) => brand.name) ?? []}
                            label="Добавить марку"
                            placeholder="Введите марку автомобиля"
                            helperText="Укажите марки автомобилей, которые обслуживаете"
                            emptyMessage="Марки не указаны"
                        />
                    </Box>
                </SettingsSection>

                {/* 5. Главное фото точки */}
                <SettingsSection icon={<CameraIcon color="#1d4ed8" />} title="Главное фото точки">
                    <CoverPhotoUpload
                        entityId={profile.profile.id}
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
