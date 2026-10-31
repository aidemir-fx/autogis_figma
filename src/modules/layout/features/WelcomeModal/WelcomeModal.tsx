import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton as MuiIconButton,
    Stack,
} from "@mui/material";
import { Button } from "@common/components";
import {
    LogoIcon,
    MapPinIcon,
    WrenchIcon,
    CarWashIcon,
    ShopIcon,
    CrossIcon,
} from "@common/icons";
import {
    FeatureItem,
    FeatureIconWrapper,
    HeroWrapper,
    LogoImg,
    Actions,
} from "./styles";
import { BOTTOM_NAV_RESERVED_SPACE } from "../layoutViewport";

const EXCLUDED_PATHS = ["/login", "/register"];

export const WelcomeModal = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");
        const isExcluded = EXCLUDED_PATHS.some((p) =>
            location.pathname.startsWith(p)
        );
        if (!accessToken && !isExcluded) {
            setOpen(true);
        }
    }, []);

    const handleClose = () => setOpen(false);

    const handleRegister = () => {
        setOpen(false);
        navigate("/register");
    };

    const handleLogin = () => {
        setOpen(false);
        navigate("/login");
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: "hidden",
                    m: { xs: 1.5, sm: 3 },
                    mb: { xs: BOTTOM_NAV_RESERVED_SPACE, sm: 3 },
                },
            }}
        >
            <MuiIconButton
                onClick={handleClose}
                sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    color: "#fff",
                }}
                aria-label="Закрыть"
            >
                <CrossIcon />
            </MuiIconButton>

            <HeroWrapper>
                <LogoImg src={LogoIcon} alt="AutoGis" />
                <Typography
                    variant="h2"
                    sx={{ color: "#fff", textAlign: "center", mt: 1 }}
                >
                    Добро пожаловать в AutoGis!
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: "rgba(255,255,255,0.9)",
                        textAlign: "center",
                        mt: 1,
                        px: 2,
                    }}
                >
                    Сервис, который объединяет автовладельцев и специалистов
                    автоиндустрии в одном месте
                </Typography>
            </HeroWrapper>

            <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={2}>
                    <FeatureItem>
                        <FeatureIconWrapper>
                            <MapPinIcon />
                        </FeatureIconWrapper>
                        <Box>
                            <Typography variant="h4">
                                Поиск рядом с вами
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Находите ближайших мастеров и автосервисы на
                                карте в несколько кликов
                            </Typography>
                        </Box>
                    </FeatureItem>

                    <FeatureItem>
                        <FeatureIconWrapper>
                            <WrenchIcon />
                        </FeatureIconWrapper>
                        <Box>
                            <Typography variant="h4">
                                Частные автомастера
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Выездной ремонт, шиномонтаж и помощь на дороге
                                от проверенных специалистов
                            </Typography>
                        </Box>
                    </FeatureItem>

                    <FeatureItem>
                        <FeatureIconWrapper>
                            <CarWashIcon />
                        </FeatureIconWrapper>
                        <Box>
                            <Typography variant="h4">
                                Автосервисы и автомойки
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Записывайтесь онлайн в удобное время без
                                звонков и ожиданий
                            </Typography>
                        </Box>
                    </FeatureItem>

                    <FeatureItem>
                        <FeatureIconWrapper>
                            <ShopIcon />
                        </FeatureIconWrapper>
                        <Box>
                            <Typography variant="h4">
                                Автомагазины
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Находите запчасти и аксессуары в магазинах
                                вашего города
                            </Typography>
                        </Box>
                    </FeatureItem>
                </Stack>

                <Actions>
                    <Button
                        variant="contained"
                        isFullWidth
                        onClick={handleRegister}
                    >
                        Создать аккаунт
                    </Button>
                    <Button
                        variant="outlined"
                        isFullWidth
                        onClick={handleLogin}
                    >
                        Войти
                    </Button>
                    <Button
                        variant="text"
                        isFullWidth
                        onClick={handleClose}
                    >
                        Продолжить как гость
                    </Button>
                </Actions>
            </DialogContent>
        </Dialog>
    );
};
