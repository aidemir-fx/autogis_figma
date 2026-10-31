import React, { useState, useEffect } from "react";
import { ButtonGroup, FormControl, InputLabel, MenuItem, Paper, Select, Switch, Typography } from "@mui/material";
import InputMask from "react-input-mask";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@modules/map";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { toast } from "react-toastify";
import { MapButton } from "../Settings/styles";
import { useAutoWash } from "@common/hooks";
import { http } from "@common/lib/http";
import { Coordinates } from "@modules/masters";
import { fetchAdditionalServices } from "@modules/users/api";
import { DashboardLayout } from "@modules/layout";
import { mapCoordinatesToPoint } from "@modules/masters/domain/api";
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
import { autoWashSchema } from "../Settings/validation";
import { PAYMENT_OPTIONS } from "../Settings/payment-options";
import { CameraIcon, ClockIcon, DropsIcon, GearIcon, PlusIcon } from "@common/icons";
import { Button, Checkbox, CoverPhotoUpload, SettingsSection, TextField } from "@common/components";
import {
    AutoWashStatusToggle,
    AdditionalService,
    AutoWashStatus,
} from "@modules/auto-washes";

type WashType = "self_service" | "classic";

function parseTimeValue(value?: string | null): Dayjs {
    const [hours, minutes] = (value ?? "08:00").split(":").map(Number);
    return dayjs()
        .hour(Number.isFinite(hours) ? hours : 8)
        .minute(Number.isFinite(minutes) ? minutes : 0)
        .second(0)
        .millisecond(0);
}

const WASH_TYPE_LABELS: Record<WashType, string> = {
    self_service: "Самомойка",
    classic: "Классическая автомойка",
};

export type AutoWashFormValues = {
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
    washType: WashType;
    boxCount: number;
    washerCount: number;
    hasWaitingArea: boolean;
    onlineBookingEnabled: boolean;
    liveQueueEnabled: boolean;
    payments: string[];
    coverImageUrl: string;
    coverImageAssetId: string;
};

export function AutoWashSettings() {
    const queryClient = useQueryClient();
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const [coverUploadActive, setCoverUploadActive] = useState(false);
    const { autoWashProfile, isLoading, error, refetch } = useAutoWash();
    const autoWash = autoWashProfile?.profile;

    const form = useForm<AutoWashFormValues>({
        resolver: yupResolver(autoWashSchema) as any,
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
            washType: "classic",
            boxCount: 1,
            washerCount: 0,
            hasWaitingArea: false,
            onlineBookingEnabled: false,
            liveQueueEnabled: false,
            payments: [],
            coverImageUrl: "",
            coverImageAssetId: "",
        },
    });
    const coverImageUrl = form.watch("coverImageUrl");
    const coverImageAssetId = form.watch("coverImageAssetId");
    useEffect(() => {
        if (autoWash && !isLoading) {
            form.reset({
                fullName: autoWash.fullName ?? "",
                phone: autoWashProfile?.phone ?? "",
                workingPhone: autoWash.workingPhone ?? "",
                description: autoWash.description ?? "",
                address: autoWash.address ?? "",
                coordinates: autoWash.coordinates,
                workingDays: autoWash.workingDays ?? [
                    true, true, true, true, true, false, false,
                ],
                workFrom: parseTimeValue(autoWash.workFrom),
                workTo: parseTimeValue(autoWash.workTo ?? "18:00"),
                additionalServices:
                    autoWash.additionalServices?.map(
                        (service) => service.name
                    ) ?? [],
                washType:
                    autoWash.activitySubtype?.code === "self_service"
                        ? "self_service"
                        : "classic",
                boxCount: (autoWash as any).boxCount ?? 1,
                washerCount: (autoWash as any).washerCount ?? 0,
                hasWaitingArea: (autoWash as any).hasWaitingArea ?? false,
                onlineBookingEnabled: autoWash.onlineBookingEnabled ?? false,
                liveQueueEnabled: autoWash.liveQueueEnabled ?? false,
                payments: (autoWash as any).payments ?? [],
                coverImageUrl: autoWash.coverImageUrl ?? "",
                coverImageAssetId: autoWash.coverImageAssetId ?? "",
            });
        }
    }, [autoWash, isLoading, form, autoWashProfile]);

    const { data: availableServices } = useQuery({
        queryKey: ["additionalServices"],
        queryFn: fetchAdditionalServices,
    });

    const mutation = useMutation({
        mutationFn: async (values: AutoWashFormValues) => {
            return http.put("/auto_washes/profile/me", {
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
                washType: values.washType,
                boxCount: values.boxCount,
                washerCount: values.washerCount,
                hasWaitingArea: values.hasWaitingArea,
				onlineBookingEnabled: false,
                liveQueueEnabled: values.liveQueueEnabled,
                payments: values.payments,
                coverImageUrl: values.coverImageUrl ?? "",
                coverImageAssetId: values.coverImageAssetId || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["autoWashProfile"] });
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

    const onSubmit = (values: AutoWashFormValues) => {
        if (coverUploadActive) {
            toast.error("Дождитесь завершения загрузки главного фото");
            return;
        }
        if (
            !values.coordinates ||
            (values.coordinates.x === 0 && values.coordinates.y === 0)
        ) {
            toast.error("Укажите автомойку на карте перед сохранением");
            return;
        }
        mutation.mutate(values);
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Настройки - Автомойка">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Загружаем профиль автомойки...</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Настройки - Автомойка">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography sx={{ mb: 2 }}>
                        Не удалось загрузить профиль автомойки.
                    </Typography>
                    <Button type="button" onClick={() => refetch()}>
                        Повторить
                    </Button>
                </Paper>
            </DashboardLayout>
        );
    }

    if (!autoWash) {
        return (
            <DashboardLayout title="Настройки - Автомойка">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Профиль автомойки пока не найден.</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Настройки - Автомойка">
            {/* 1. Статус */}
            <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Статус">
                <AutoWashStatusToggle
                    currentStatus={autoWash?.status || AutoWashStatus.SCHEDULE}
                />
            </SettingsSection>

            <form onSubmit={form.handleSubmit(onSubmit, () => {
                toast.error("Проверьте правильность заполнения формы");
            })}>
                {/* 2. Основная информация */}
                <SettingsSection icon={<DropsIcon color="#1d4ed8" />} title="Информация об автомойке">
                    <FieldGrid>
                        <Controller
                            name="fullName"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    label="Название автомойки"
                                    placeholder="Введите название автомойки"
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
                                        label="Укажите автомойку на карте"
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                        placeholder="Укажите автомойку на карте"
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
                                label="Описание услуг"
                                placeholder="Опишите услуги вашей автомойки"
                                fullWidth
                                multiline
                                rows={3}
                                {...field}
                            />
                        )}
                    />
                </SettingsSection>

                {/* 3. Профильные параметры автомойки */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Параметры автомойки">
                    <FieldGrid>
                        <Controller
                            name="washType"
                            control={form.control}
                            render={({ field }) => (
                                <FormControl fullWidth>
                                    <InputLabel>Тип мойки</InputLabel>
                                    <Select
                                        {...field}
                                        label="Тип мойки"
                                    >
                                        {Object.entries(WASH_TYPE_LABELS).map(
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
                        <Controller
                            name="boxCount"
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
                                    onBlur={(e) => {
                                        field.onBlur();
                                        const num = parseInt(String(field.value), 10);
                                        if (isNaN(num) || num < 1) {
                                            field.onChange(1);
                                        }
                                    }}
                                    label="Количество боксов"
                                    type="number"
                                    fullWidth
                                    inputProps={{ min: 1 }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                        <Controller
                            name="washerCount"
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
                                    onBlur={(e) => {
                                        field.onBlur();
                                        const num = parseInt(String(field.value), 10);
                                        if (isNaN(num) || num < 0) {
                                            field.onChange(0);
                                        }
                                    }}
                                    label="Количество мойщиков"
                                    type="number"
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    </FieldGrid>

                    <SwitchRow>
                        <SwitchLabel>Зона ожидания</SwitchLabel>
                        <Controller
                            name="hasWaitingArea"
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
                                                (v) =>
                                                    PAYMENT_OPTIONS.find((o) => o.value === v)
                                                        ?.label ?? v
                                            )
                                            .join(", ")
                                    }
                                >
                                    {PAYMENT_OPTIONS.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            <Checkbox
                                                checked={field.value.includes(option.value)}
                                            />
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
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
                        entityId={autoWash.id}
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
