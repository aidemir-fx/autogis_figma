import { ReactNode } from "react";
import {
    Box,
    useMediaQuery,
    Toolbar,
    IconButton,
} from "@mui/material";
import { Sidebar } from "./Sidebar";
import {
    Root,
    Main,
    SidebarContainer,
    MobileHeader,
    Logo,
    Header,
    Container,
} from "./styles";
import { ArrowLeftIcon, LogoIcon } from "@common/icons";
import { goBackOrNavigate } from "@common/lib/navigation";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import { useUserProfile } from "@common/hooks";
import { UserRole } from "@common/types/user";
import { useLocation, useNavigate } from "react-router-dom";
import { COMPACT_LAYOUT_MEDIA_QUERY } from "../layoutViewport";

type DashboardLayoutProps = {
    children: ReactNode;
    title?: string;
    hideMobileHeaderActions?: boolean;
};

export const DashboardLayout = (props: DashboardLayoutProps) => {
    const { children, title = "", hideMobileHeaderActions = false } = props;
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { profile } = useUserProfile();
    const isMobile = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const hasAdminAccess =
        profile?.role === UserRole.ADMIN || profile?.role === UserRole.MODERATOR;
    const fallbackRoute = pathname === "/cabinet" ? "/" : "/cabinet";

    const handleLogoClick = () => {
        navigate("/");
    };
    const handleBackClick = () => {
        goBackOrNavigate(navigate, fallbackRoute);
    };

    return (
        <Root>
            {isMobile ? (
                <>
                    <MobileHeader>
                        <Toolbar>
                            {hideMobileHeaderActions ? null : (
                                <>
                                    <IconButton
                                        onClick={handleBackClick}
                                        aria-label="Назад"
                                        title="Назад"
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            flexShrink: 0,
                                            color: "#4b5563",
                                            "& svg": { width: 22, height: 22 },
                                        }}
                                    >
                                        <ArrowLeftIcon />
                                    </IconButton>
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label="На главную"
                                        onClick={handleLogoClick}
                                        sx={{
                                            flexGrow: 1,
                                            display: "flex",
                                            justifyContent: "center",
                                            background: "none",
                                            border: 0,
                                            p: 0,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <Logo><img src={LogoIcon} alt="Логотип" /></Logo>
                                    </Box>
                                    {hasAdminAccess ? (
                                        <IconButton
                                            onClick={() => navigate("/admin")}
                                            aria-label="Админ-панель"
                                            title="Админ-панель"
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                flexShrink: 0,
                                                color: "#4b5563",
                                            }}
                                        >
                                            <AdminPanelSettingsRoundedIcon />
                                        </IconButton>
                                    ) : (
                                        <Box sx={{ width: 40, flexShrink: 0 }} />
                                    )}
                                </>
                            )}
                        </Toolbar>
                    </MobileHeader>
                    <Main style={{ paddingTop: "64px" }}>{children}</Main>
                </>
            ) : (
                <>
                    <Main>
                        <Header>
                            <IconButton
                                onClick={handleBackClick}
                                aria-label="Назад"
                                title="Назад"
                            >
                                <ArrowLeftIcon />
                            </IconButton>
                            {title}
                        </Header>
                        <Container>{children}</Container>
                    </Main>
                    <SidebarContainer>
                        <Sidebar />
                    </SidebarContainer>
                </>
            )}
        </Root>
    );
};
