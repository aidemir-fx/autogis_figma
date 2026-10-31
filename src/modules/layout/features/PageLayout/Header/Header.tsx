import {
    AppBar,
    Box,
    Typography,
    useMediaQuery,
    IconButton,
    CircularProgress,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@common/hooks/useAuth";
import { LoginIcon, LogoIcon, LogoutIcon } from "@common/icons";
import { StyledLogo, StyledToolbar, UserPartWrpapper } from "./styles";
import { Button } from "@common/components";
import { hasCapability } from "@common/lib/userAccess";
import { User } from "./User";
import { NotificationBell } from "../../../../../components/NotificationBell";
import { useUserProfile } from "@common/hooks";
import { COMPACT_LAYOUT_MEDIA_QUERY } from "../../layoutViewport";
import { UserRole } from "@common/types";

export const Header = () => {
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();
    const { pathname } = useLocation();
    const isMobile = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const { profile, isLoading } = useUserProfile();
    const isProviderPage = pathname === "/provider";
    const hasProfessionalChatAccess = hasCapability(
        profile,
        "professionalChat",
    );

    const handleUserMenuClick = () => {
        navigate("/cabinet");
    };

    return (
        <>
            <AppBar position="static" color="transparent" elevation={0}>
                <StyledToolbar>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{
                            textDecoration: "none",
                            color: "inherit",
                            height: "41px",
                        }}
                    >
                        <StyledLogo src={LogoIcon} />
                    </Typography>
                    {isMobile ? null : pathname === "/cabinet" ? (
                        <IconButton
                            onClick={logout}
                            color="error"
                            title="Выйти"
                            sx={{
                                "&:hover": {
                                    backgroundColor: "rgba(244, 67, 54, 0.04)",
                                },
                            }}
                        >
                            <LogoutIcon />
                        </IconButton>
                    ) : isAuthenticated ? (
                        isLoading ? (
                            <CircularProgress />
                        ) : profile ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginTop: 8,
                                    gap: "8px",
                                    cursor: "pointer",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    {!isProviderPage && <Button
                                        variant="outlined"
                                        onClick={() => navigate("/cabinet/chats?tab=ordinary")}
                                    >
                                        Личный чат
                                    </Button>}
                                    {!isProviderPage && hasProfessionalChatAccess && (
                                        <Button
                                            variant="outlined"
                                            onClick={() =>
                                                navigate("/cabinet/chats?tab=professional")
                                            }
                                        >
                                            Проф чат
                                        </Button>
                                    )}
                                    <NotificationBell isAdmin={profile?.role === UserRole.ADMIN} />
                                    <UserPartWrpapper onClick={handleUserMenuClick}>
                                        <User user={profile} />
                                    </UserPartWrpapper>
                                </Box>
                            </div>
                        ) : null
                    ) : (
                        <Button
                            variant="outlined"
                            onClick={() => navigate("/login")}
                            icon={<LoginIcon />}
                        >
                            Войти
                        </Button>
                    )}
                </StyledToolbar>
            </AppBar>
        </>
    );
};
