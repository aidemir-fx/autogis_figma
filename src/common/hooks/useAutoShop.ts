import { useQuery } from "@tanstack/react-query";
import { fetchMyAutoShopProfile } from "@modules/providers";
import { AutoShop } from "@modules/auto-shops";

export interface AutoShopProfile {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoShop | null;
}

export const useAutoShop = () => {
    // Check if user is authenticated
    const isAuthenticated =
        typeof window !== "undefined" &&
        !!localStorage.getItem("accessToken");

    const {
        data: autoShopProfile,
        isLoading,
        error,
        refetch,
    } = useQuery<AutoShopProfile, Error>({
        queryKey: ["autoShopProfile"],
        queryFn: fetchMyAutoShopProfile,
        staleTime: 5 * 60 * 1000, // 5 минут
        gcTime: 10 * 60 * 1000, // 10 минут (раньше cacheTime)
        retry: 0, // Don't retry to avoid infinite loops
        enabled: isAuthenticated, // Only run query if authenticated
    });

    return {
        autoShopProfile,
        isLoading,
        error,
        refetch,
        hasAutoShop: !!autoShopProfile?.profile,
        autoShop: autoShopProfile?.profile || null,
    };
};
