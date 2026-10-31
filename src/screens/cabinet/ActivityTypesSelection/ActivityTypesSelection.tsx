import React from "react";
import { Box, Paper, Typography, Stack } from "@mui/material";
import {
    NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@common/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { normalizeUserProfile } from "@common/lib/userAccess";
import { UserAccountType } from "@common/types/user";
import { http } from "@common/lib/http";
import { toast } from "react-toastify";
import {
    AutoServiceCategoryIcon,
    AutoWashCategoryIcon,
    PrivateMasterCategoryIcon,
    ServiceCenterCategoryIcon,
} from "@common/icons";
import {
    BlockSubtitle,
    BlockTitle,
    OrdersIconWrapper,
    StyledPaper,
    TitleWrapper,
} from "../Dashboard";
import { Title } from "./styles";
import { DashboardLayout } from "@modules/layout";

const MASTER_PROFILE_QUERY_KEY = ["masterProfile", "me"] as const;

interface ActivityType {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    isActive: boolean;
}

interface UserActivityType {
    activityType: ActivityType;
}

interface AvailableActivityType {
    id: string;
    name: string;
    displayName: string;
    description: string;
    icon: React.ReactNode;
    available: boolean;
    settingsRoute: string;
}

const ACTIVITY_TYPE_NAMES: AvailableActivityType[] = [
    {
        id: "master",
        name: "master",
        displayName: "Частный автомастер",
        description: "Индивидуальная работа с клиентами",
        icon: <img src={PrivateMasterCategoryIcon} alt="Частный автомастер" />,
        available: true,
        settingsRoute: "/cabinet/master-settings",
    },
    {
        id: "auto_wash",
        name: "auto_wash",
        displayName: "Автомойка",
        description: "Услуги мойки и детейлинга",
        icon: <img src={AutoWashCategoryIcon} alt="Автомойка" />,
        available: true,
        settingsRoute: "/cabinet/auto-wash-settings",
    },
    {
        id: "auto_service",
        name: "auto_service",
        displayName: "Автосервис",
        description: "Техническое обслуживание и ремонт",
        icon: <img src={AutoServiceCategoryIcon} alt="Автосервис" />,
        available: true,
        settingsRoute: "/cabinet/auto-service-settings",
    },
    {
        id: "auto_shop",
        name: "auto_shop",
        displayName: "Автомагазин",
        description: "Продажа запчастей и аксессуаров",
        icon: <img src={ServiceCenterCategoryIcon} alt="Автомагазин" />,
        available: true,
        settingsRoute: "/cabinet/auto-shop-settings",
    },
];

export function ActivityTypesSelection() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const queryClient = useQueryClient();

    // Получаем все типы деятельности с сервера
    const { data: allActivityTypes } = useQuery<ActivityType[]>({
        queryKey: ["allActivityTypes"],
        queryFn: async () => {
            const response = await http.get("/activity-types");
            return response.data;
        },
    });

    // Получаем типы деятельности пользователя
    const { data: userActivityTypes } = useQuery<UserActivityType[]>({
        queryKey: ["userActivityTypes", profile?.id],
        queryFn: async () => {
            const response = await http.get("/user-activity-types/my");
            return response.data;
        },
        enabled: !!profile?.id,
    });

    // Мутация для добавления типа деятельности
    const addActivityMutation = useMutation({
        mutationFn: async ({
            activityType,
            payload,
        }: {
            activityType: AvailableActivityType;
            payload?: Record<string, unknown>;
        }) => {
            return http.post("/masters/register", {
                activityType: activityType.name,
                ...payload,
            });
        },
        onSuccess: (_data, variables) => {
            const activity = variables.activityType;
            const currentUser = localStorage.getItem("user");
            if (currentUser) {
                try {
                    const parsedUser = JSON.parse(currentUser);
                    const updatedUser = normalizeUserProfile({
                        ...parsedUser,
                        role: activity.name,
                        accountType:
                            activity.name === "master"
                                ? UserAccountType.PRIVATE_EXECUTOR
                                : (activity.name as UserAccountType),
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

            queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "userProfile" });
            queryClient.invalidateQueries({ queryKey: ["userActivityTypes", profile?.id] });
            queryClient.invalidateQueries({ queryKey: ["allActivityTypes"] });
            queryClient.invalidateQueries({ queryKey: MASTER_PROFILE_QUERY_KEY });
            queryClient.refetchQueries({ queryKey: ["userActivityTypes", profile?.id] });
            queryClient.refetchQueries({ queryKey: ["userProfile"] });

            toast.success(`${activity.displayName} успешно добавлен!`);
            navigate(activity.settingsRoute || "/cabinet");
        },
        onError: (error) => {
            console.error("Ошибка при добавлении типа деятельности:", error);
            toast.error("Не удалось добавить тип деятельности");
        },
    });

    const handleActivitySelect = (activityType: AvailableActivityType) => {
        if (activityType.available && allActivityTypes) {
            // Находим реальный UUID типа деятельности по имени
            const realActivityType = allActivityTypes.find(
                (type) => type.name === activityType.name
            );

            if (realActivityType) {
                if (activityType.name === "auto_service") {
                    navigate("/cabinet/activity-types-selection/auto-service");
                    return;
                }

                addActivityMutation.mutate({ activityType });
            } else {
                toast.error("Тип деятельности не найден");
            }
        }
    };

    // Фильтруем доступные типы деятельности (исключаем уже имеющиеся)
    const availableActivityTypes = ACTIVITY_TYPE_NAMES.filter(
        (availableType) =>
            !userActivityTypes?.some(
                (userType) =>
                    userType?.activityType?.name === availableType.name
            )
    );

    if (!profile) return null;

    return (
        <DashboardLayout title="Выберите тип деятельности">
            <Title>
                Выберите тип вашей деятельности для настройки подходящих функций
            </Title>

            <Stack spacing={2}>
                {availableActivityTypes.map((activity, index) => (
                    <StyledPaper
                        variant="outlined"
                        key={activity.id}
                        sx={{
                            p: 2,
                            width: "100%",
                            borderRadius: "14px",
                            marginBottom: "24px",
                            boxShadow: "none",
                            cursor: "pointer",
                            border: "1px solid #0000001a",
                        }}
                        onClick={() => handleActivitySelect(activity)}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <OrdersIconWrapper>
                                    {activity.icon}
                                </OrdersIconWrapper>
                                <TitleWrapper>
                                    <BlockTitle>
                                        {" "}
                                        {activity.displayName}
                                    </BlockTitle>
                                    <BlockSubtitle>
                                        {activity.description}
                                    </BlockSubtitle>
                                </TitleWrapper>
                            </Box>
                            <NavigateNextIcon />
                        </Box>
                    </StyledPaper>
                ))}

                {availableActivityTypes.length === 0 && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 3,
                            textAlign: "center",
                            bgcolor: "grey.50",
                        }}
                    >
                        <Typography variant="h6" color="text.secondary">
                            Все доступные типы деятельности уже добавлены
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Вы можете управлять своими типами деятельности на
                            предыдущей странице
                        </Typography>
                    </Paper>
                )}
            </Stack>

        </DashboardLayout>
    );
}
