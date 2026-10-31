import { Button } from "@common/components";
import {
    GearFillIcon,
    LoginIcon,
    LogoutIcon,
    UserAddIcon,
} from "@common/icons";
import {
    Drawer,
    ListItem,
    Divider,
    Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@common/hooks/useAuth";
import { ButtonList, RegisterButton } from "./styles";
import { User } from "./User";
import { hasCapability } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";

type SidebarProps = {
    open: boolean;
    onClose: () => void;
};

export const Sidebar = ({ open, onClose }: SidebarProps) => {
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();
    const { profile } = useUserProfile();
    const hasProfessionalChatAccess = hasCapability(
        profile,
        "professionalChat",
    );

    const handleLogin = () => {
        navigate("/login");
        onClose();
    };

    const handleRegister = () => {
        navigate("/register");
        onClose();
    };

    const handleSettings = () => {
        navigate("/cabinet");
        onClose();
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const handleOpenPersonalChat = () => {
        navigate("/cabinet/chats?tab=ordinary");
        onClose();
    };

    const handleOpenProfessionalChat = () => {
        navigate("/cabinet/chats?tab=professional");
        onClose();
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: 250, pt: 2 }}>
                {isAuthenticated ? (
                    <>
                        <Box
                            sx={{
                                px: 2,
                                pb: 2,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 2,
                            }}
                        >
                            <User user={profile!} />
                        </Box>
                        <Divider />
                        <ButtonList>
                            <ListItem disablePadding>
                                <Button
                                    variant="outlined"
                                    onClick={handleSettings}
                                    isFullWidth
                                    icon={<GearFillIcon />}
                                >
                                    Настройки
                                </Button>
                            </ListItem>
                            <ListItem disablePadding>
                                <Button
                                    variant="outlined"
                                    onClick={handleOpenPersonalChat}
                                    isFullWidth
                                >
                                    Личный чат
                                </Button>
                            </ListItem>
                            {hasProfessionalChatAccess && (
                                <ListItem disablePadding>
                                    <Button
                                        variant="outlined"
                                        onClick={handleOpenProfessionalChat}
                                        isFullWidth
                                    >
                                        Профессиональный чат
                                    </Button>
                                </ListItem>
                            )}
                            <ListItem disablePadding>
                                <Button
                                    variant="outlined"
                                    onClick={handleLogout}
                                    isFullWidth
                                    icon={<LogoutIcon />}
                                >
                                    Выйти
                                </Button>
                            </ListItem>
                        </ButtonList>
                    </>
                ) : (
                    // Для неавторизованных пользователей
                    <>
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Button
                                variant="contained"
                                icon={<LoginIcon />}
                                isFullWidth
                                onClick={handleLogin}
                            >
                                Войти в аккаунт
                            </Button>
                            <RegisterButton>
                                <Button
                                    variant="outlined"
                                    onClick={handleRegister}
                                    icon={<UserAddIcon />}
                                    isFullWidth
                                >
                                    Регистрация
                                </Button>
                            </RegisterButton>
                        </Box>
                        <Divider />
                    </>
                )}
            </Box>
        </Drawer>
    );
};
