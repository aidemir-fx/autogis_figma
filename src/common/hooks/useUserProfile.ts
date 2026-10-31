import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@common/lib/http";
import { normalizeUserProfile } from "@common/lib/userAccess";
import { UserRole, User } from "@common/types/user";
import { toast } from "react-toastify";

export type UserProfile = User;

type UseUserProfileOptions = {
    enabled?: boolean;
};

function readStoredUserProfile(): UserProfile | null {
    const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!userStr) {
        return null;
    }

    try {
        return normalizeUserProfile(JSON.parse(userStr));
    } catch {
        return null;
    }
}

export function useUserProfile(options: UseUserProfileOptions = {}) {
    const { enabled = true } = options;
    const queryClient = useQueryClient();
    const accessToken =
        typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
    const storedProfile = accessToken ? readStoredUserProfile() : null;
    const userId = storedProfile?.id ?? null;

    const {
        data: profile,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["userProfile", userId ?? "session"],
        queryFn: async (): Promise<UserProfile> => {
            try {
                const response = await http.get("/users/profile/me");
                const normalizedProfile = normalizeUserProfile(response.data);
                localStorage.setItem("user", JSON.stringify(normalizedProfile));
                return normalizedProfile;
            } catch (queryError) {
                const fallbackProfile = readStoredUserProfile();
                if (fallbackProfile) {
                    return fallbackProfile;
                }

                throw queryError;
            }
        },
        initialData: storedProfile ?? undefined,
        initialDataUpdatedAt: storedProfile ? Date.now() : undefined,
        staleTime: 5 * 60 * 1000, // 5 минут
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Права кабинета меняются после модерации/refresh токена, а stale
        // localStorage сразу ломает видимость "Заявок" и профчата.
        refetchOnMount: "always",
        enabled: enabled && !!accessToken,
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (updates: { name?: string; contactNumber?: string }) => {
            const response = await http.put("/users/profile", {
                name: updates.name,
                phone: updates.contactNumber,
            });
            return response.data;
        },
        onSuccess: (data) => {
            const normalizedProfile = normalizeUserProfile(data);
            // Обновляем localStorage сразу
            localStorage.setItem("user", JSON.stringify(normalizedProfile));
            // Обновляем React Query кэш с user-specific ключом
            if (userId) {
                queryClient.setQueryData(["userProfile", userId], normalizedProfile);
            }
            queryClient.setQueryData(["userProfile"], normalizedProfile);
            toast.success("Данные успешно обновлены");
        },
        onError: (error: any) => {
            console.error("Profile update error:", error);
            const message = error?.response?.data?.message || "Ошибка при обновлении данных";
            toast.error(message);
        },
    });

    const isProvider = profile ? profile.role !== UserRole.CUSTOMER : false;

    return {
        profile: profile ?? storedProfile ?? null,
        isLoading,
        error: error?.message || null,
        refetch,
        isProvider,
        name: (profile ?? storedProfile)?.name,
        phone: (profile ?? storedProfile)?.phone,
        updateProfile: updateProfileMutation.mutate,
        isUpdatingProfile: updateProfileMutation.isPending,
    };
}
