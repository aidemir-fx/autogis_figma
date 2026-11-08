import { useState, useEffect } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { http } from "@common/lib/http";
import { useNavigate } from "react-router-dom";
import InputMask from "react-input-mask";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "@modules/layout/features/AuthLayout";
import { normalizeUserProfile } from "@common/lib/userAccess";
import {
    LockIcon,
    LoginIcon,
    LogoIcon,
    UserAddIcon,
    UserIcon,
} from "@common/icons";
import {
    AboutTitle,
    AboutWrapper,
    ButtonWrapper,
    HintTitle,
    HintWrapper,
    LoginIconWrapper,
    LoginWrapper,
    LogoWrapper,
    RegisterTitle,
    RegisterTitleWrapper,
    Title,
} from "./styles";
import { TextField } from "@common/components/TextField";
import { Button, SlideUp } from "@common/components";

// Validation schema
const schema = yup.object({
    phone: yup
        .string()
        .required("Телефон обязателен для заполнения")
        .matches(
            /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
            "Введите корректный номер телефона в формате +7 (XXX) XXX-XX-XX"
        ),
    password: yup
        .string()
        .required("Пароль обязателен для заполнения")
        .min(6, "Пароль должен содержать минимум 6 символов"),
});

type FormData = {
    phone: string;
    password: string;
};

export const LoginScreen = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        control,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            phone: "",
            password: "",
        },
    });

    // Check if user is already authenticated
    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            navigate("/cabinet");
        }
    }, [navigate]);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            // Очищаем старые данные пользователя ПЕРЕД логином
            localStorage.removeItem("user");
            queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "userProfile" });

            const payload = { phone: data.phone, password: data.password };
            const { data: responseData } = await http.post(
                "/auth/login",
                payload
            );
            const accessToken = responseData.accessToken;
            const refreshToken = responseData.refreshToken;
            if (!accessToken || !refreshToken) {
                throw new Error("Auth tokens missing in response");
            }
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            // Store user data for profile hook
            if (responseData.user) {
                const normalizedUser = normalizeUserProfile(responseData.user);
                localStorage.setItem("user", JSON.stringify(normalizedUser));
                // Обновляем React Query кэш с новыми данными
                queryClient.setQueryData(["userProfile"], normalizedUser);
            }
            navigate("/cabinet");
        } catch (err: any) {
            if (
                err?.response?.status === 400 ||
                err?.response?.status === 401
            ) {
                setError("root", {
                    message: "Неверный телефон или пароль",
                });
            } else {
                setError("root", {
                    message: "Повторите попытку позже",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Вход в аккаунт">
            <SlideUp>
            <LogoWrapper>
                <img src={LogoIcon} alt="Logo" width={150} />
            </LogoWrapper>
            <center>
                <Title>Добро пожаловать!</Title>
            </center>
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <Paper sx={{ p: 3, maxWidth: 448, width: "100%" }}>
                    <LoginIconWrapper>
                        <LoginIcon />
                    </LoginIconWrapper>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <LoginWrapper>
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <InputMask
                                        mask="+7 (999) 999-99-99"
                                        maskChar={null}
                                        {...field}
                                    >
                                        {(inputProps: any) => (
                                            <TextField
                                                {...inputProps}
                                                label="Телефон"
                                                placeholder="+7 (XXX) XXX-XX-XX"
                                                icon={<UserIcon />}
                                                error={!!errors.phone}
                                                helperText={
                                                    errors.phone?.message
                                                }
                                            />
                                        )}
                                    </InputMask>
                                )}
                            />
                        </LoginWrapper>

                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Пароль"
                                    type="password"
                                    placeholder="Введите пароль"
                                    icon={<LockIcon />}
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                />
                            )}
                        />

                        {errors.root && (
                            <div
                                style={{
                                    color: "#d32f2f",
                                    fontSize: "0.75rem",
                                    marginTop: "8px",
                                    textAlign: "center",
                                }}
                            >
                                {errors.root.message}
                            </div>
                        )}

                        <ButtonWrapper>
                            <Button
                                icon={<LoginIcon />}
                                type="submit"
                                isFullWidth
                                disabled={loading}
                            >
                                {loading ? "Вход..." : "Войти"}
                            </Button>
                        </ButtonWrapper>
                        <HintWrapper>
                            <HintTitle>Еще нет аккаунта?</HintTitle>
                        </HintWrapper>

                        <RegisterTitleWrapper>
                            <Button variant="text" type="button">
                                <RegisterTitle to="/register">
                                    Зарегистрироваться
                                </RegisterTitle>
                            </Button>
                        </RegisterTitleWrapper>
                    </form>
                </Paper>
            </Box>

            <AboutWrapper>
                <AboutTitle>
                    АвтоГис — надежный сервис поиска автомастеров
                </AboutTitle>
            </AboutWrapper>
            </SlideUp>
        </AuthLayout>
    );
};

export default LoginScreen;
