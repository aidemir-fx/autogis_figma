import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import { http } from "@common/lib/http";
import { AdminGuard } from "@modules/admin/components/AdminGuard";
import { AdminShell } from "@modules/admin/components/AdminShell";

type UserRow = {
    id: string;
    name?: string;
    phone: string;
    role: string;
    accountType: string;
    isProfessional: boolean;
};

export function ProfessionalUsersPage() {
    const queryClient = useQueryClient();
    const usersQuery = useQuery({
        queryKey: ["admin", "professional-users"],
        queryFn: async () => (await http.get<UserRow[]>("/users")).data,
    });
    const revokeMutation = useMutation({
        mutationFn: async (id: string) => {
            await http.patch(`/admin/users/${id}/professional-status`, { enabled: false });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "professional-users"] }),
    });

    const users = (usersQuery.data ?? []).filter((user) => user.isProfessional);

    return (
        <AdminGuard>
            <AdminShell title="Профессиональные аккаунты">
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Здесь можно отключить профессиональный статус. Профиль и история сохранятся.
                    </Typography>
                    {usersQuery.isError && <Alert severity="error">Не удалось загрузить пользователей.</Alert>}
                    <Paper variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Пользователь</TableCell>
                                    <TableCell>Телефон</TableCell>
                                    <TableCell>Тип</TableCell>
                                    <TableCell align="right">Действие</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.name || "Без имени"}</TableCell>
                                        <TableCell>{user.phone}</TableCell>
                                        <TableCell>{user.accountType || user.role}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                color="error"
                                                size="small"
                                                startIcon={<BlockIcon />}
                                                disabled={revokeMutation.isPending}
                                                onClick={() => {
                                                    if (window.confirm("Отозвать профессиональный статус?")) {
                                                        revokeMutation.mutate(user.id);
                                                    }
                                                }}
                                            >
                                                Отозвать статус
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Stack>
            </AdminShell>
        </AdminGuard>
    );
}
