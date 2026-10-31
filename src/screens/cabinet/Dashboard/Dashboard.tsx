import React from "react";
import {
    Box,
    Avatar as MuiAvatar,
    Button as MuiButton,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    Stack,
    Link as MuiLink,
    Typography,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getUserFirstName, hasCapability } from "@common/lib/userAccess";
import { useAuth, useUserProfile } from "@common/hooks";
import {
    LogoutIcon,
    ChatIcon,
    UserIcon,
} from "@common/icons";
import { useForm, Controller } from "react-hook-form";
import {
    ActivityTypeIconWrapper,
    AvatarWrapper,
    BlockSubtitle,
    BlockTitle,
    Header,
    SubmitButtonWrapper,
    StyledPaper,
    TitleWrapper,
    UserDataWrapper,
    UserIconWrapper,
} from "./styles";
import { AvatarUpload, Button, TextField } from "@common/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@common/lib/http";
import { BusinessApplication } from "../ForBusiness/types";
import {
    fetchMySubscriptionStats,
    unfollowAuthor,
    type SubscriptionProfile,
} from "@modules/stories/api";

type ProfileFormData = {
    name: string;
    contactNumber: string;
};

function getSubscriptionRoleLabel(item: SubscriptionProfile) {
    if (!item.isProfessional) return "Обычный пользователь";
    if (item.role === "auto_service") return "Автосервис";
    if (item.role === "auto_wash") return "Автомойка";
    if (item.role === "auto_shop") return "Автомагазин";
    if (item.role === "master") return "Частный мастер";
    return "Профессиональный аккаунт";
}

export function Dashboard() {
    const navigate = useNavigate();
    const { profile, updateProfile, isUpdatingProfile } = useUserProfile();
    const { logout } = useAuth();
    const queryClient = useQueryClient();
    const [subscriptionDialog, setSubscriptionDialog] = React.useState<
        "following" | "followers" | null
    >(null);

    const { data: subscriptionStats } = useQuery({
        queryKey: ["subscription-stats", profile?.id],
        queryFn: fetchMySubscriptionStats,
        enabled: !!profile?.id,
        staleTime: 60_000,
    });

    const unfollowMutation = useMutation({
        mutationFn: (authorId: string) => unfollowAuthor(authorId),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["subscription-stats"],
            });
            void queryClient.invalidateQueries({
                queryKey: ["stories", "home"],
            });
        },
    });

    const activeSubscriptionItems =
        subscriptionDialog === "following"
            ? subscriptionStats?.following ?? []
            : subscriptionStats?.followers ?? [];

    const { data: businessApplication } = useQuery({
        queryKey: ["businessApplication", "me"],
        queryFn: async () => {
            const response = await http.get<{
                application: BusinessApplication | null;
            }>("/business-applications/me");
            return response.data?.application ?? null;
        },
        enabled: !!profile?.id,
        staleTime: 60_000,
    });

    const form = useForm<ProfileFormData>({
        defaultValues: {
            name: getUserFirstName(profile?.name),
            contactNumber: profile?.contactNumber || "",
        },
    });

    // Обновляем форму при изменении профиля
    React.useEffect(() => {
        if (profile) {
            form.reset({
                name: getUserFirstName(profile.name),
                contactNumber: profile.contactNumber || "",
            });
        }
    }, [profile?.name, profile?.contactNumber, profile?.id, form]);

    if (!profile) return null;

    const hasProfessionalCabinetAccess = hasCapability(
        profile,
        "professionalCabinet",
    );
    const hasPendingProfessionalApplication =
        businessApplication?.status === "pending" ||
        businessApplication?.status === "needs_revision";
    const canOpenProfessionalSection =
        hasProfessionalCabinetAccess || hasPendingProfessionalApplication;

    const handleForBusinessClick = () => {
        navigate("/cabinet/for-business");
    };

    const onSubmit = (data: ProfileFormData) => {
        updateProfile({ ...data, name: getUserFirstName(data.name) });
    };

    return (
        <div>
            <Paper
                sx={{
                    p: 3,
                    width: "100%",
                    borderRadius: "14px",
                    marginBottom: "24px",
                }}
            >
                <Stack spacing={3}>
                    <Box>
                        <Header>
                            <UserIconWrapper>
                                <UserIcon />
                            </UserIconWrapper>
                            Основная информация
                        </Header>
                        <Box
                            sx={{
                                alignItems: "center",
                                gap: 2,
                                mb: 2,
                            }}
                        >
                            <AvatarWrapper>
                                <AvatarUpload
                                    entityId={profile.id}
                                    fallbackText={profile.name ?? undefined}
                                />
                                <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{ alignItems: "stretch", minWidth: 0 }}
                                >
                                    <MuiButton
                                        type="button"
                                        variant="text"
                                        onClick={() => setSubscriptionDialog("following")}
                                        sx={{
                                            minWidth: 78,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 2,
                                            color: "text.primary",
                                            textTransform: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        <Typography component="span" sx={{ fontWeight: 800, fontSize: 17 }}>
                                            {subscriptionStats?.followingCount ?? 0}
                                        </Typography>
                                        <Typography component="span" sx={{ fontSize: 11, color: "text.secondary" }}>
                                            Подписки
                                        </Typography>
                                    </MuiButton>
                                    <MuiButton
                                        type="button"
                                        variant="text"
                                        onClick={() => setSubscriptionDialog("followers")}
                                        sx={{
                                            minWidth: 88,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 2,
                                            color: "text.primary",
                                            textTransform: "none",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        <Typography component="span" sx={{ fontWeight: 800, fontSize: 17 }}>
                                            {subscriptionStats?.followersCount ?? 0}
                                        </Typography>
                                        <Typography component="span" sx={{ fontSize: 11, color: "text.secondary" }}>
                                            Подписчики
                                        </Typography>
                                    </MuiButton>
                                </Stack>
                            </AvatarWrapper>

                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <UserDataWrapper>
                                    <Controller
                                        name="name"
                                        control={form.control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Имя"
                                                fullWidth
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="contactNumber"
                                        control={form.control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Номер для связи"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </UserDataWrapper>
                                <SubmitButtonWrapper>
                                    <Button
                                        type="submit"
                                        disabled={
                                            !form.formState.isDirty ||
                                            isUpdatingProfile
                                        }
                                        isLoading={isUpdatingProfile}
                                        isFullWidth
                                    >
                                        {isUpdatingProfile
                                            ? "Сохранение..."
                                            : "Сохранить"}
                                    </Button>
                                </SubmitButtonWrapper>
                            </form>
                        </Box>
                    </Box>
                </Stack>
            </Paper>

            <Dialog
                open={subscriptionDialog !== null}
                onClose={() => setSubscriptionDialog(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>
                    {subscriptionDialog === "following" ? "Подписки" : "Подписчики"}
                </DialogTitle>
                <DialogContent>
                    {activeSubscriptionItems.length > 0 ? (
                        <List disablePadding>
                            {activeSubscriptionItems.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <ListItem
                                        disableGutters
                                        secondaryAction={
                                            subscriptionDialog === "following" ? (
                                                <MuiButton
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => unfollowMutation.mutate(item.id)}
                                                    disabled={unfollowMutation.isPending}
                                                    sx={{
                                                        minWidth: 0,
                                                        px: 1,
                                                        textTransform: "none",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {unfollowMutation.isPending &&
                                                    unfollowMutation.variables === item.id
                                                        ? "..."
                                                        : "Отписаться"}
                                                </MuiButton>
                                            ) : undefined
                                        }
                                    >
                                        <ListItemAvatar>
                                            <MuiAvatar sx={{ bgcolor: "#dbeafe", color: "#1d4ed8" }}>
                                                {(item.displayName || "П").charAt(0).toUpperCase()}
                                            </MuiAvatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={item.displayName || "Пользователь"}
                                            secondary={getSubscriptionRoleLabel(item)}
                                        />
                                    </ListItem>
                                    {index < activeSubscriptionItems.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary">
                            {subscriptionDialog === "following"
                                ? "Вы пока ни на кого не подписаны."
                                : "У вас пока нет подписчиков."}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <MuiButton onClick={() => setSubscriptionDialog(null)}>Закрыть</MuiButton>
                </DialogActions>
            </Dialog>

            {/* Неброский текстовый пункт "Для бизнеса" */}
            {!canOpenProfessionalSection && (
                <Box sx={{ mt: 1, mb: 2, textAlign: "center" }}>
                    <MuiLink
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={handleForBusinessClick}
                        sx={{
                            color: "text.secondary",
                            fontSize: 14,
                            cursor: "pointer",
                        }}
                    >
                        Для бизнеса
                    </MuiLink>
                </Box>
            )}

            <StyledPaper
                sx={{
                    p: 2,
                    width: "100%",
                    borderRadius: "14px",
                    marginBottom: "24px",
                    cursor: "pointer",
                    boxShadow: "none",
                    border: "1px solid #0000001a",
                }}
                onClick={() => navigate("/cabinet/chats?tab=support")}
            >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ActivityTypeIconWrapper>
                            <ChatIcon />
                        </ActivityTypeIconWrapper>
                        <TitleWrapper>
                            <BlockTitle>Написать в поддержку</BlockTitle>
                            <BlockSubtitle>Связаться с командой АвтоГис</BlockSubtitle>
                        </TitleWrapper>
                    </Box>
                    <NavigateNextIcon />
                </Box>
            </StyledPaper>

            <Box sx={{ mt: 2 }}>
                <Button
                    variant="outlined"
                    onClick={logout}
                    isFullWidth
                    icon={<LogoutIcon />}
                >
                    Выйти из аккаунта
                </Button>
            </Box>
        </div>
    );
}
