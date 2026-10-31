import { AppBar } from "@mui/material";
import { ArrowLeftIcon } from "@common/icons";
import { BackButton, HeaderTitle, StyledToolbar } from "./styles";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@common/hooks/useAuth";
import { hasCapability } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";
import { Button } from "@common/components";
import { goBackOrNavigate } from "@common/lib/navigation";

type HeaderProps = {
    title?: string;
};

export const Header = (props: HeaderProps) => {
    const { title = "Вход в аккаунт" } = props;
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { isAuthenticated } = useAuth();
    const { profile } = useUserProfile();
    const hasProfessionalChatAccess = hasCapability(
        profile,
        "professionalChat",
    );
    const isProviderPage = pathname === "/provider";

    const handleBackClick = () => {
        goBackOrNavigate(navigate, "/");
    };

    return (
        <>
            <AppBar position="static" color="transparent" elevation={0}>
                <StyledToolbar>
                    <BackButton
                        type="button"
                        onClick={handleBackClick}
                        aria-label="Назад"
                        title="Назад"
                    >
                        <ArrowLeftIcon />
                    </BackButton>
                    <HeaderTitle>{title}</HeaderTitle>
                    {isAuthenticated && !isProviderPage && (
                        <div
                            style={{
                                marginLeft: "auto",
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <Button
                                variant="outlined"
                                onClick={() => navigate("/cabinet/chats?tab=ordinary")}
                            >
                                Личный чат
                            </Button>
                            {hasProfessionalChatAccess && (
                                <Button
                                    variant="outlined"
                                    onClick={() =>
                                        navigate("/cabinet/chats?tab=professional")
                                    }
                                >
                                    Проф чат
                                </Button>
                            )}
                        </div>
                    )}
                </StyledToolbar>
            </AppBar>
        </>
    );
};
