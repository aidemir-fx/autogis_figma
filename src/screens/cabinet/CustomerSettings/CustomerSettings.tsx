import React from "react";
import { Box, Paper, Stack, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Button } from "@common/components";
import { useUserProfile } from "@common/hooks";
import { http } from "@common/lib/http";
import { getUserFirstName, normalizeUserProfile } from "@common/lib/userAccess";

export type CustomerFormValues = {
    name: string;
    contactNumber: string;
};

export function CustomerSettings() {
    const queryClient = useQueryClient();
    const { profile } = useUserProfile();

    const form = useForm<CustomerFormValues>({
        defaultValues: {
            name: "",
            contactNumber: "",
        },
    });

    // Инициализация формы
    React.useEffect(() => {
        if (profile) {
            form.reset({
                name: getUserFirstName(profile.name),
                contactNumber: profile.contactNumber || "",
            });
        }
    }, [profile?.name, profile?.contactNumber, profile?.id, form]);

    // Мутация для обновления профиля
    const mutation = useMutation({
        mutationFn: async (values: CustomerFormValues) => {
            const response = await http.put("/users/profile", {
                name: getUserFirstName(values.name),
                phone: values.contactNumber,
            });
            return response.data;
        },
        onSuccess: (data) => {
            const normalizedUser = normalizeUserProfile(data);
            // Update localStorage with new user data
            localStorage.setItem("user", JSON.stringify(normalizedUser));
            queryClient.setQueryData(["userProfile"], normalizedUser);
            toast.success("Данные успешно обновлены");
        },
        onError: (error: any) => {
            console.error("Profile update error:", error);
            toast.error(error?.response?.data?.message || "Ошибка при обновлении данных");
        },
    });

    const onSubmit = (values: CustomerFormValues) => {
        mutation.mutate(values);
    };

    if (!profile) return null;

    return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <Paper sx={{ p: 3, width: "100%", maxWidth: 720 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Настройки
                    </Typography>

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Stack spacing={3}>
                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field }) => (
                                    <TextField
                                        label="Имя"
                                        fullWidth
                                        {...field}
                                    />
                                )}
                            />

                            <Controller
                                name="contactNumber"
                                control={form.control}
                                render={({ field }) => (
                                    <TextField
                                        label="Номер для связи"
                                        fullWidth
                                        {...field}
                                    />
                                )}
                            />

                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 2,
                                }}
                            >
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={mutation.isPending}
                                    isLoading={mutation.isPending}
                                >
                                    Сохранить
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Paper>
            </Box>
    );
}
