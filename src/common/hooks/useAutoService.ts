import { useQuery } from "@tanstack/react-query";
import { fetchMyAutoServiceProfile } from "@modules/providers";
import { AutoService } from "@modules/auto-service";

export interface AutoServiceProfile {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoService | null;
}

export const useAutoService = () => {
    // Check if user is authenticated
    const isAuthenticated =
        typeof window !== "undefined" &&
        !!localStorage.getItem("accessToken");

    const {
        data: autoServiceProfile,
        isLoading,
        error,
        refetch,
    } = useQuery<AutoServiceProfile, Error>({
        queryKey: ["autoServiceProfile"],
        queryFn: fetchMyAutoServiceProfile,
        staleTime: 5 * 60 * 1000, // 5 минут
        gcTime: 10 * 60 * 1000, // 10 минут (раньше cacheTime)
        retry: 0, // Don't retry on failure to avoid infinite loops
        enabled: isAuthenticated, // Only run query if authenticated
    });

    return {
        autoServiceProfile,
        isLoading,
        error,
        refetch,
        hasAutoService: !!autoServiceProfile?.profile,
        autoService: autoServiceProfile?.profile || null,
    };
};
