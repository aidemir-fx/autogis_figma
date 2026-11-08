import { useEffect, useMemo, useState } from "react";
import { Box, Paper, FormControlLabel, Checkbox, Link, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { http } from "@common/lib/http";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import InputMask from "react-input-mask";
import { normalizeUserProfile } from "@common/lib/userAccess";
import {
    LogoIcon,
    LoginIcon,
    UserIcon,
    LockIcon,
    UserAddIcon,
} from "@common/icons";
import { AuthLayout } from "@modules/layout/features/AuthLayout";
import {
    LogoWrapper,
    Title,
    LoginIconWrapper,
    LoginWrapper,
    ButtonWrapper,
    HintWrapper,
    HintTitle,
    RegisterTitleWrapper,
    RegisterTitle,
    AboutWrapper,
    AboutTitle,
} from "../login/styles";
import { Button, TextField } from "@common/components";

const phoneValidationMessage =
    "Введите корректный номер телефона в формате +7 (XXX) XXX-XX-XX";

const schema = yup.object({
    phone: yup
        .string()
        .required()
        .matches(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, phoneValidationMessage),
    password: yup
        .string()
        .required("Пароль обязателен для заполнения")
        .min(6, "Пароль должен содержать минимум 6 символов"),
    agreedToPrivacy: yup
        .boolean()
        .oneOf([true], "Необходимо согласие на обработку персональных данных")
        .required("Необходимо согласие на обработку персональных данных"),
});

type FormData = yup.InferType<typeof schema>;

export const RegisterScreen = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { control, handleSubmit, formState, setError } =
        useForm<FormData>({
            resolver: yupResolver(schema) as any,
            defaultValues: {
                phone: "",
                password: "",
                agreedToPrivacy: false,
            },
        });

    const errors = formState.errors;
    const submitLabel = useMemo(() => "Зарегистрироваться", []);

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            navigate("/cabinet");
        }
    }, [navigate]);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            localStorage.removeItem("user");
            queryClient.removeQueries({
                predicate: (query) => query.queryKey[0] === "userProfile",
            });

            const payload = {
                phone: data.phone,
                password: data.password,
                agreedToPrivacy: data.agreedToPrivacy,
            };

            const { data: responseData } = await http.post(
                "/auth/register",
                payload
            );

            const accessToken =
                responseData.accessToken || responseData.access_token;
            const refreshToken =
                responseData.refreshToken || responseData.refresh_token;

            if (accessToken && refreshToken) {
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
            }

            if (responseData.user) {
                const normalizedUser = normalizeUserProfile(responseData.user);
                localStorage.setItem("user", JSON.stringify(normalizedUser));
                queryClient.setQueryData(
                    ["userProfile", normalizedUser.id],
                    normalizedUser
                );
            }

            navigate("/cabinet");
        } catch (err: any) {
            const errorMessage =
                err?.response?.data?.message || "Не удалось зарегистрироваться";

            setError("root", {
                message: Array.isArray(errorMessage)
                    ? errorMessage.join(", ")
                    : errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Регистрация">
            <LogoWrapper>
                <img src={LogoIcon} alt="Logo" width={150} />
            </LogoWrapper>
            <center>
                <Title>Создать аккаунт</Title>
            </center>
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <Paper sx={{ p: 3, maxWidth: 560, width: "100%" }}>
                    <LoginIconWrapper>
                        <UserAddIcon />
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

                        <Controller
                            name="agreedToPrivacy"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ mt: 2, mb: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                {...field}
                                                checked={field.value || false}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label={
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: "0.875rem",
                                                }}
                                            >
                                                Я согласен с{" "}
                                                <Link
                                                    href="/privacy"
                                                    target="_blank"
                                                    rel="noopener"
                                                    sx={{
                                                        cursor: "pointer",
                                                        color: "primary.main",
                                                    }}
                                                >
                                                    Политикой конфиденциальности
                                                </Link>
                                                {" "}и{" "}
                                                <Link
                                                    href="/terms"
                                                    target="_blank"
                                                    rel="noopener"
                                                    sx={{
                                                        cursor: "pointer",
                                                        color: "primary.main",
                                                    }}
                                                >
                                                    Условиями использования
                                                </Link>
                                            </Typography>
                                        }
                                    />
                                    {errors.agreedToPrivacy && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "error.main",
                                                display: "block",
                                                mt: 1,
                                            }}
                                        >
                                            {errors.agreedToPrivacy.message}
                                        </Typography>
                                    )}
                                </Box>
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
                                {loading ? "Регистрация..." : submitLabel}
                            </Button>
                        </ButtonWrapper>
                        <HintWrapper>
                            <HintTitle>Уже есть аккаунт?</HintTitle>
                        </HintWrapper>

                        <RegisterTitleWrapper>
                            <Button variant="text" type="button">
                                <RegisterTitle to="/login">Войти</RegisterTitle>
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
        </AuthLayout>
    );
};

export default RegisterScreen;
