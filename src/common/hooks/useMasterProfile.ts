import { useState, useEffect } from "react";
import { fetchMyProfile } from "@modules/masters/domain/api";
import { Master } from "@common/types";

export function useMasterProfile() {
    const [profile, setProfile] = useState<Master | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchMyProfile();
            setProfile(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load profile"
            );
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    return {
        profile,
        isLoading: loading,
        error,
        refetch: loadProfile,
    };
}
