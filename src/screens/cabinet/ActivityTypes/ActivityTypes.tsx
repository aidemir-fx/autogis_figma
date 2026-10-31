import React from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    IconButton,
    Avatar,
} from "@mui/material";
import {
    Settings as SettingsIcon,
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@common/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@common/lib/http";
import {
    AutoServiceCategoryIcon,
    AutoWashCategoryIcon,
    GearFillIcon,
    GearIcon,
    PaperIcon,
    PrivateMasterCategoryIcon,
    ServiceCenterCategoryIcon,
} from "@common/icons";
import {
    OrdersIconWrapper,
    TitleWrapper,
    BlockTitle,
    BlockSubtitle,
} from "../Dashboard";
import { Button } from "@common/components";
import { SettingsButton, StyledPaper } from "./styles";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";

interface ActivityType {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    isActive: boolean;
}

interface UserActivityTypes {
    activityType: ActivityType;
}

const activityIcons: Record<string, React.ReactNode> = {
        master: <img src={PrivateMasterCategoryIcon} alt="Частный автомастер" />,
    auto_wash: <img src={AutoWashCategoryIcon} alt="Автомойка" />,
    auto_service: <img src={AutoServiceCategoryIcon} alt="Автосервис" />,
    auto_shop: <img src={ServiceCenterCategoryIcon} alt="Автомагазин" />,
};

const activitySettingsRoutes: Record<string, string> = {
    master: "/cabinet/master-settings",
    auto_wash: "/cabinet/auto-wash-settings",
    auto_service: "/cabinet/auto-service-settings",
    auto_shop: "/cabinet/auto-shop-settings",
};

export function ActivityTypes() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const queryClient = useQueryClient();

    // Получаем виды деятельности пользователя
    const { data, refetch } = useQuery<UserActivityTypes[]>({
        queryKey: ["userActivityTypes", profile?.id],
        queryFn: async () => {
            const response = await http.get("/user-activity-types/my");
            return response.data;
        },
        staleTime: 0, // Данные всегда считаются устаревшими
        gcTime: 0, // Не кэшировать данные
        enabled: !!profile?.id,
    });

    // Принудительное обновление данных при монтировании компонента
    React.useEffect(() => {
        refetch();
    }, [refetch]);

    const handleBack = () => {
        navigate("/cabinet");
    };

    const handleAddActivity = () => {
        navigate("/cabinet/activity-types-selection");
    };

    const handleSettingsClick = (activityName: string) => {
        const route = activitySettingsRoutes[activityName];
        if (route) {
            navigate(route);
        }
    };

    if (!profile) return null;

    return (
        <DashboardLayout title="Тип деятельности">
            <Stack spacing={3}>
                {/* Список текущих видов деятельности */}
                {data?.map(({ activityType: activity }) => (
                    <StyledPaper
                        variant="outlined"
                        key={activity.id}
                        sx={{
                            p: 2,
                            width: "100%",
                            borderRadius: "14px",
                            marginBottom: "24px",
                            boxShadow: "none",
                            border: "1px solid #0000001a",
                        }}
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
                                    {activityIcons[activity.name] || (
                                        <img
                                            src={PrivateMasterCategoryIcon}
                                            alt="Частный автомастер"
                                        />
                                    )}
                                </OrdersIconWrapper>
                                <TitleWrapper>
                                    <BlockTitle>
                                        {activity.displayName}
                                    </BlockTitle>
                                    <BlockSubtitle>
                                        {activity.description ||
                                            "Описание отсутствует"}
                                    </BlockSubtitle>
                                </TitleWrapper>
                            </Box>
                            <SettingsButton
                                variant="text"
                                onClick={() =>
                                    handleSettingsClick(activity.name)
                                }
                                icon={<GearIcon />}
                            >
                                Настройки
                            </SettingsButton>
                        </Box>
                    </StyledPaper>
                ))}

                {/* Кнопка добавления нового вида деятельности */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 200,
                        borderStyle: "dashed",
                        borderColor: "primary.main",
                        bgcolor: "primary.50",
                        cursor: "pointer",
                        "&:hover": {
                            bgcolor: "primary.100",
                        },
                    }}
                    onClick={handleAddActivity}
                >
                    <Button variant="contained" icon={<AddIcon />}>
                        Добавить еще тип деятельности
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                        Расширьте свои возможности
                    </Typography>
                </Paper>
            </Stack>
        </DashboardLayout>
    );
}
