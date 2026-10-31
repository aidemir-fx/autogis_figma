import React, { useState, useEffect, useRef } from "react";
import { ButtonGroup, Checkbox, FormControl, InputLabel, MenuItem, Paper, Select, Switch, Typography } from "@mui/material";
import InputMask from "react-input-mask";
import { fetchMyProfile, updateMyProfile } from "@modules/masters/domain/api";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocationPicker } from "@modules/map";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import dayjs, { Dayjs } from "dayjs";
import {
    fetchAllProfessions,
    fetchAllAutoMarks,
    fetchAllServices,
} from "@modules/masters/domain/api";
import { StatusToggle } from "@modules/masters/features/StatusToggle";
import { toast } from "react-toastify";
import { Button, TagSelector, SettingsSection, TextField } from "@common/components";
import { MapButton } from "../Settings/styles";
import { Coordinates, MasterStatus } from "@modules/masters";
import { DashboardLayout } from "@modules/layout";
import {
    FieldGrid,
    MapContainer,
    MapTextField,
    SubmitButtonContainer,
    SwitchLabel,
    SwitchRow,
    TimePickersContainer,
    WorkingDaysContainer,
} from "../Settings/shared-styles";
import { ClockIcon, GearIcon } from "@common/icons";
import { PAYMENT_OPTIONS } from "../Settings/payment-options";

export type MasterFormValues = {
    fullName: string;
    phone: string;
    workingPhone: string;
    description: string;
    address: string;
    coordinates: Coordinates;
    professions: string[];
    services: string[];
    autoMarks: { name: string; internationalName?: string }[];
    workingDays: boolean[];
    workFrom: Dayjs | null;
    workTo: Dayjs | null;
    onlineBookingEnabled: boolean;
    liveQueueEnabled: boolean;
    payments: string[];
};

const MASTER_PROFILE_QUERY_KEY = ["masterProfile", "me"] as const;

function parseTimeValue(value?: string): Dayjs | null {
    if (!value) {
        return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}

function formatTimeValue(value: Dayjs | null): string | undefined {
    if (!value || !value.isValid()) {
        return undefined;
    }

    return value.format("HH:mm");
}

function mapProfileToFormValues(profileData: ReturnType<typeof fetchMyProfile> extends Promise<infer T> ? T : never): MasterFormValues {
    return {
        fullName: profileData.fullName ?? "",
        phone: profileData.user?.phone ?? "",
        workingPhone: profileData.workingPhone ?? "",
        description: profileData.description ?? "",
        address: profileData.address ?? "",
        coordinates: profileData.coordinates ?? { x: 0, y: 0 },
        professions: profileData.professions ?? [],
        services: profileData.services ?? [],
        autoMarks:
            profileData.autoMarks?.map((am: string) => ({
                name: am,
                internationalName: "",
            })) ?? [],
        workingDays:
            profileData.workingDays && profileData.workingDays.length > 0
                ? profileData.workingDays
                : [true, true, true, true, true, false, false],
        workFrom: parseTimeValue(profileData.workFrom),
        workTo: parseTimeValue(profileData.workTo),
        onlineBookingEnabled: profileData.onlineBookingEnabled ?? false,
        liveQueueEnabled: profileData.liveQueueEnabled ?? false,
        payments: profileData.payments ?? [],
    };
}

export function MasterSettings() {
    const queryClient = useQueryClient();
    const [locationPickerOpen, setLocationPickerOpen] = useState(false);
    const didInitializeFormRef = useRef(false);

    const form = useForm<MasterFormValues>({
        defaultValues: {
            professions: [],
            services: [],
            autoMarks: [],
            workingDays: [true, true, true, true, true, false, false],
            fullName: "",
            phone: "",
            workingPhone: "",
            description: "",
            address: "",
            coordinates: { x: 0, y: 0 },
            workFrom: null,
            workTo: null,
            onlineBookingEnabled: false,
            liveQueueEnabled: false,
            payments: [],
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

    const profileQuery = useQuery({
        queryKey: MASTER_PROFILE_QUERY_KEY,
        queryFn: fetchMyProfile,
    });

    useEffect(() => {
        const profileData = profileQuery.data;
        if (profileData && !profileQuery.isLoading && !didInitializeFormRef.current) {
            form.reset(mapProfileToFormValues(profileData));
            didInitializeFormRef.current = true;
        }
    }, [profileQuery.data, profileQuery.isLoading, form]);

    const mutation = useMutation({
        mutationFn: updateMyProfile,
        onSuccess: (data) => {
            queryClient.setQueryData(MASTER_PROFILE_QUERY_KEY, data);
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

    const onSubmit = (values: MasterFormValues) => {
        mutation.mutate({
            fullName: values.fullName,
            address: values.address,
            description: values.description,
            coordinates: {
                x: values.coordinates.x,
                y: values.coordinates.y,
            },
            professions: values.professions,
            services: values.services,
            autoMarks: values.autoMarks,
            workingDays: values.workingDays,
            workFrom: formatTimeValue(values.workFrom),
            workTo: formatTimeValue(values.workTo),
            onlineBookingEnabled: values.onlineBookingEnabled,
            liveQueueEnabled: values.liveQueueEnabled,
            payments: values.payments,
            phone: values.phone,
            workingPhone: values.workingPhone,
        });
    };

    if (profileQuery.isLoading) {
        return (
            <DashboardLayout title="Настройки - Мастер">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Загружаем профиль мастера...</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    if (profileQuery.error) {
        return (
            <DashboardLayout title="Настройки - Мастер">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography sx={{ mb: 2 }}>
                        Не удалось загрузить профиль мастера.
                    </Typography>
                    <Button type="button" onClick={() => profileQuery.refetch()}>
                        Повторить
                    </Button>
                </Paper>
            </DashboardLayout>
        );
    }

    if (!profileQuery.data) {
        return (
            <DashboardLayout title="Настройки - Мастер">
                <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: "14px", border: "1px solid #0000001a" }}
                >
                    <Typography>Профиль мастера пока не найден.</Typography>
                </Paper>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Настройки - Мастер">
            {/* 1. Статус */}
            <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Статус">
                <StatusToggle
                    currentStatus={
                        profileQuery.data?.status ?? MasterStatus.SCHEDULE
                    }
                />
            </SettingsSection>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* 2. Основная информация */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Основная информация">
                    <FieldGrid>
                        <Controller
                            name="fullName"
                            control={form.control}
                            render={({ field }) => (
                                <TextField
                                    label="Имя и фамилия"
                                    placeholder="Введите ваше имя и фамилию"
                                    fullWidth
                                    {...field}
                                />
                            )}
                        />
                        <Controller
                            name="workingPhone"
                            control={form.control}
                            render={({ field }) => (
                                <InputMask
                                    mask="+7 (999) 999-99-99"
                                    {...field}
                                >
                                    {(inputProps: any) => (
                                        <TextField
                                            {...inputProps}
                                            label="Рабочий телефон"
                                            placeholder="Введите ваш рабочий телефон"
                                            fullWidth
                                            helperText="Номер для связи"
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
                                        label="Укажите себя на карте"
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                        placeholder="Укажите себя на карте"
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
                                label="Информация о себе и о своих услугах"
                                placeholder="Укажите информацию о себе и о своих услугах"
                                fullWidth
                                multiline
                                rows={3}
                                {...field}
                            />
                        )}
                    />
                </SettingsSection>

                {/* 3. Профессии и марки */}
                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Профессии">
                    <TagSelector
                        name="professions"
                        control={form.control}
                        options={professionsQuery.data || []}
                        label="Добавить профессию"
                        placeholder="Выберите профессии"
                        helperText="Выберите специальности по которым можно вас найти"
                        emptyMessage="Выберите профессии"
                    />
                </SettingsSection>

                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Услуги">
                    <TagSelector
                        name="services"
                        control={form.control}
                        options={servicesQuery.data || []}
                        label="Добавить услугу"
                        placeholder="Выберите услуги"
                        helperText="Выберите услуги, по которым вас будут находить"
                        emptyMessage="Выберите услуги"
                    />
                </SettingsSection>

                <SettingsSection icon={<GearIcon color="#1d4ed8" />} title="Марки машин">
                    <TagSelector
                        name="autoMarks"
                        control={form.control}
                        options={autoMarksQuery.data || []}
                        label="Добавить марку автомобиля"
                        placeholder="Выберите марки автомобилей"
                        helperText="Выберите марки автомобилей с которыми вы работаете"
                        emptyMessage="Выберите марки автомобилей"
                        getOptionLabel={(option: any) => option.name}
                    />
                </SettingsSection>

                {/* 4. График работы */}
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
                                    value={field.value}
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
                                    value={field.value}
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

                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Способы оплаты</InputLabel>
                        <Controller
                            name="payments"
                            control={form.control}
                            render={({ field }) => (
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
                            )}
                        />
                    </FormControl>
                </SettingsSection>

                {/* 6. Кнопка сохранения */}
                <SubmitButtonContainer>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={mutation.isPending}
                        isLoading={mutation.isPending}
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
