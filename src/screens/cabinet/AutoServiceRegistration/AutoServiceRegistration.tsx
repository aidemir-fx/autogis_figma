import React from "react";
import { Box, ButtonGroup, Paper, Typography } from "@mui/material";
import InputMask from "react-input-mask";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { DesktopTimePicker } from "@mui/x-date-pickers/DesktopTimePicker";
import { toast } from "react-toastify";
import { DashboardLayout } from "@modules/layout";
import { Button, TagSelector, TextField } from "@common/components";
import { normalizeUserProfile } from "@common/lib/userAccess";
import { LocationPicker } from "@modules/map";
import {
    fetchAllProfessions,
    mapCoordinatesToPoint,
} from "@modules/masters/domain/api";
import { Coordinates } from "@modules/masters";
import { MapButton } from "../Settings/styles";
import {
    MapContainer,
    MapTextField,
    SubmitButtonContainer,
    TimePickersContainer,
    Title,
    WorkingDaysContainer,
} from "../AutoServiceSettings/styles";
import { ClockIcon, GearIcon } from "@common/icons";
import { http } from "@common/lib/http";

type AutoServiceRegistrationFormValues = {
    fullName: string;
    workingPhone: string;
    address: string;
    description: string;
    professions: string[];
    coordinates: Coordinates;
    workingDays: boolean[];
    workFrom: Dayjs | null;
    workTo: Dayjs | null;
};

const USER_ACTIVITY_TYPES_QUERY_KEY = ["userActivityTypes"];

function formatTimeValue(value: Dayjs | null): string | undefined {
    if (!value || !value.isValid()) {
        return undefined;
    }

    return value.format("HH:mm");
}

export function AutoServiceRegistration() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);

    React.useEffect(() => {
        toast.dismiss();
    }, []);

    const form = useForm<AutoServiceRegistrationFormValues>({
        defaultValues: {
            fullName: "",
            workingPhone: "",
            address: "",
            description: "",
            professions: [],
            coordinates: { x: 0, y: 0 },
            workingDays: [true, true, true, true, true, false, false],
            workFrom: dayjs().hour(9).minute(0).second(0).millisecond(0),
            workTo: dayjs().hour(18).minute(0).second(0).millisecond(0),
        },
    });

    const professionsQuery = useQuery({
        queryKey: ["professions"],
        queryFn: fetchAllProfessions,
    });

    const selectedCoordinates = form.watch("coordinates");

    const registrationMutation = useMutation({
        mutationFn: async (values: AutoServiceRegistrationFormValues) => {
            await http.post("/masters/register", {
                activityType: "auto_service",
                fullName: values.fullName,
                workingPhone: values.workingPhone,
                address: values.address,
                description: values.description,
                professions: values.professions,
                coordinates: mapCoordinatesToPoint(values.coordinates),
                workingDays: values.workingDays,
                workFrom: formatTimeValue(values.workFrom),
                workTo: formatTimeValue(values.workTo),
            });

            // Ensure auto service profile is fully persisted (including coordinates)
            // even if activity registration endpoint only creates an empty profile.
            return http.put("/auto_services/profile/me", {
                fullName: values.fullName,
                address: values.address,
                description: values.description,
                coordinates: mapCoordinatesToPoint(values.coordinates),
                professions: values.professions,
                workingDays: values.workingDays,
                workFrom: formatTimeValue(values.workFrom),
                workTo: formatTimeValue(values.workTo),
                workingPhone: values.workingPhone,
            });
        },
        onSuccess: async () => {
            const currentUser = localStorage.getItem("user");
            if (currentUser) {
                try {
                    const parsedUser = JSON.parse(currentUser);
                    const updatedUser = normalizeUserProfile({
                        ...parsedUser,
                        role: "auto_service",
                    });
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    queryClient.setQueryData(
                        ["userProfile", updatedUser.id],
                        updatedUser
                    );
                } catch (error) {
                    console.error("Ошибка обновления localStorage:", error);
                }
            }

            await Promise.all([
                queryClient.invalidateQueries({
                    predicate: (query) => query.queryKey[0] === "userProfile",
                }),
                queryClient.invalidateQueries({
                    queryKey: USER_ACTIVITY_TYPES_QUERY_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: ["autoServiceProfile"],
                }),
            ]);

            toast.success("Автосервис успешно добавлен");
            navigate("/cabinet/auto-service-settings");
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message ||
                "Не удалось зарегистрировать автосервис";
            toast.error(Array.isArray(message) ? message.join(", ") : message);
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

    const onSubmit = (values: AutoServiceRegistrationFormValues) => {
        if (!values.professions.length) {
            toast.error("Выберите хотя бы одну профессию");
            return;
        }

        if (
            !values.coordinates ||
            (values.coordinates.x === 0 && values.coordinates.y === 0)
        ) {
            toast.error("Укажите автосервис на карте");
            return;
        }

        registrationMutation.mutate(values);
    };

    return (
        <DashboardLayout title="Регистрация - Автосервис">
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        width: "100%",
                        borderRadius: "14px",
                        marginBottom: "24px",
                        boxShadow: "none",
                        border: "1px solid #0000001a",
                    }}
                >
                    <Title>
                        <GearIcon color="#1d4ed8" />
                        Информация о сервисе
                    </Title>
                    <Box
                        sx={{
                            display: "grid",
                            width: "100%",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <Controller
                            name="fullName"
                            control={form.control}
                            rules={{
                                required: "Введите название автосервиса",
                            }}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Название автосервиса"
                                    placeholder="Например, АвтоМастер 24"
                                    fullWidth
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />

                        <Controller
                            name="workingPhone"
                            control={form.control}
                            rules={{
                                required: "Введите рабочий телефон",
                            }}
                            render={({ field, fieldState }) => (
                                <InputMask
                                    mask="+7 (999) 999-99-99"
                                    maskChar={null}
                                    {...field}
                                >
                                    {(inputProps: any) => (
                                        <TextField
                                            {...inputProps}
                                            label="Рабочий телефон"
                                            placeholder="+7 (XXX) XXX-XX-XX"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                </InputMask>
                            )}
                        />
                    </Box>

                    <MapContainer>
                        <MapTextField>
                            <Controller
                                name="address"
                                control={form.control}
                                rules={{
                                    required: "Укажите адрес автосервиса",
                                }}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Адрес"
                                        fullWidth
                                        placeholder="Укажите автосервис на карте"
                                        InputProps={{ readOnly: true }}
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
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

                    <Controller
                        name="description"
                        control={form.control}
                        rules={{
                            required: "Добавьте описание услуг",
                        }}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                label="Описание услуг"
                                placeholder="Опишите услуги вашего СТО"
                                fullWidth
                                multiline
                                rows={3}
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                            />
                        )}
                    />
                </Paper>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        width: "100%",
                        borderRadius: "14px",
                        marginBottom: "24px",
                        boxShadow: "none",
                        border: "1px solid #0000001a",
                    }}
                >
                    <Title>
                        <GearIcon color="#1d4ed8" />
                        Профессии
                    </Title>
                    <TagSelector
                        name="professions"
                        control={form.control}
                        options={professionsQuery.data || []}
                        label="Добавить профессию"
                        placeholder="Выберите профессии"
                        helperText="Выберите специальности, по которым смогут найти ваш автосервис"
                        emptyMessage="Выберите профессии"
                    />
                </Paper>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        width: "100%",
                        borderRadius: "14px",
                        marginBottom: "24px",
                        boxShadow: "none",
                        border: "1px solid #0000001a",
                    }}
                >
                    <Title>
                        <ClockIcon color="#1d4ed8" />
                        График работы
                    </Title>
                    <TimePickersContainer>
                        <Controller
                            name="workFrom"
                            control={form.control}
                            render={({ field }) => (
                                <DesktopTimePicker
                                    sx={{ width: "100%" }}
                                    ampm={false}
                                    label="Работаем с (HH:mm)"
                                    slotProps={{ textField: { error: false } }}
                                    {...field}
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
                                    label="Работаем до (HH:mm)"
                                    slotProps={{ textField: { error: false } }}
                                    {...field}
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
                                                            true,
                                                            true,
                                                            true,
                                                            true,
                                                            true,
                                                            false,
                                                            false,
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
                </Paper>

                <SubmitButtonContainer>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={registrationMutation.isPending}
                        isLoading={registrationMutation.isPending}
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
                initialCoordinates={selectedCoordinates}
            />
        </DashboardLayout>
    );
}
