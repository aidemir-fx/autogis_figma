import { useQuery } from "@tanstack/react-query";
import { AutoWash } from "@modules/auto-washes";
import { fetchMyAutoWashProfile } from "@modules/providers";

export interface AutoWashProfile {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoWash | null;
}

export const useAutoWash = () => {
    // Check if user is authenticated
    const isAuthenticated =
        typeof window !== "undefined" &&
        !!localStorage.getItem("accessToken");

    const {
        data: autoWashProfile,
        isLoading,
        error,
        refetch,
    } = useQuery<AutoWashProfile, Error>({
        queryKey: ["autoWashProfile"],
        queryFn: async () => {
            return await fetchMyAutoWashProfile();
        },
        staleTime: 5 * 60 * 1000, // 5 минут
        retry: 0, // Don't retry to avoid infinite loops
        enabled: isAuthenticated, // Only run query if authenticated
    });

    return {
        autoWashProfile,
        isLoading,
        error,
        refetch,
        hasAutoWash: !!autoWashProfile?.profile,
        autoWash: autoWashProfile?.profile || null,
    };
};
