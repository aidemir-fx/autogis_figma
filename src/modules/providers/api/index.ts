import { http } from "@common/lib/http";
import { DEFAULT_SEARCH_RADIUS } from "../domain";
import { AppActivityTypes } from "../features";
import { AutoWash } from "@modules/auto-washes";
import { AutoService } from "@modules/auto-service";
import { AutoShop } from "@modules/auto-shops";
import { Provider, ActivityType } from "../types";

type BackendPoint = {
    type?: string;
    coordinates?: [number, number];
    x?: number;
    y?: number;
};

type BackendProvider = Omit<Provider, "coordinates" | "workingDays"> & {
    name?: string | null;
    coordinates?: BackendPoint;
    workingDays?: boolean[] | string[];
};

type BackendProfile<T> = Omit<T, "coordinates" | "workingDays"> & {
    coordinates?: BackendPoint;
    workingDays?: boolean[] | string[];
};

function mapPointToCoordinates(point?: BackendPoint) {
    if (typeof point?.x === "number" && typeof point?.y === "number") {
        return { x: point.x, y: point.y };
    }

    if (!point?.coordinates || point.coordinates.length < 2) {
        return { x: 0, y: 0 };
    }

    return {
        x: point.coordinates[1],
        y: point.coordinates[0],
    };
}

function mapProviderProfile<
    T extends { coordinates?: BackendPoint; workingDays?: boolean[] | string[] }
>(profile: T | null): T | null {
    if (!profile) {
        return null;
    }

    return {
        ...profile,
        coordinates: mapPointToCoordinates(profile.coordinates) as any,
        workingDays: mapWorkingDays(profile.workingDays),
    };
}

function mapWorkingDays(workingDays?: boolean[] | string[]) {
    if (!workingDays) {
        return [];
    }

    return workingDays.map((day) =>
        typeof day === "boolean" ? day : day === "true"
    );
}

function resolveActivityType(p: any): ActivityType {
    const raw = String(p.activityType || p.providerType || p.activityTypeId || "");
    if (raw === "auto_service" || raw === "1") return ActivityType.auto_service;
    if (raw === "auto_wash" || raw === "3") return ActivityType.auto_wash;
    if (raw === "auto_shop" || raw === "4") return ActivityType.auto_shop;
    return ActivityType.master;
}

function mapProvider(provider: BackendProvider): Provider {
    return {
        ...provider,
        activityType: resolveActivityType(provider),
        fullName: provider.fullName ?? provider.name ?? undefined,
        coordinates: mapPointToCoordinates(provider.coordinates),
        workingDays: mapWorkingDays(provider.workingDays),
        professions: provider.professions ?? [],
        autoMarks: provider.autoMarks ?? [],
        services: provider.services ?? [],
        description: provider.description ?? "",
        address: provider.address ?? "",
        payments: provider.payments && provider.payments.length > 0 ? provider.payments : ["cash", "card", "sbp"],
    };
}

export async function fetchCombinedProviders(
    lat: number,
    lng: number,
    radius: number = DEFAULT_SEARCH_RADIUS,
    activityTypes?: string[]
): Promise<{ allProviders: Provider[]; nearbyProviders: Provider[] }> {
    const searchParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
    });
    
    // Backend accepts only known activity type IDs.
    const allowedTypes = new Set(AppActivityTypes);
    const normalizedActivityTypes =
        activityTypes?.filter((type): type is string => allowedTypes.has(type)) ?? [];
    // Use provided activity types or all types as default
    const typesToSearch =
        normalizedActivityTypes.length > 0
            ? normalizedActivityTypes
            : AppActivityTypes;
    
    for (const activityType of typesToSearch) {
        searchParams.append("activityTypes", activityType);
    }

    const { data } = await http.get<{
        allProviders: BackendProvider[];
        nearbyProviders: BackendProvider[];
    }>(`/search/combined?${searchParams.toString()}`);
    const allProviders = data.allProviders.map(mapProvider);
    const nearbyProviders = data.nearbyProviders.map(mapProvider);

    return {
        allProviders,
        nearbyProviders,
    };
}

export async function fetchProviderByTypeAndId(
    activityType: string,
    id: string,
    userLat?: number,
    userLng?: number
): Promise<Provider> {
    const searchParams = new URLSearchParams();
    if (userLat !== undefined && userLng !== undefined) {
        searchParams.append("lat", userLat.toString());
        searchParams.append("lng", userLng.toString());
    }

    const queryString = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";

    try {
        const { data } = await http.get<BackendProvider>(
            `/search/provider/${activityType}/${id}${queryString}`
        );
        const mapped = mapProvider(data);
        return mapped;
    } catch (error: any) {
        // Fallback for older backends where /search/provider/:type/:id
        // is not available yet.
        if (error?.response?.status !== 404) {
            throw error;
        }

        const fallbackLat = userLat ?? 0;
        const fallbackLng = userLng ?? 0;
        const fallbackParams = new URLSearchParams({
            lat: fallbackLat.toString(),
            lng: fallbackLng.toString(),
            radius: "200",
        });
        fallbackParams.append("activityTypes", activityType);

        const { data } = await http.get<{
            allProviders: BackendProvider[];
            nearbyProviders: BackendProvider[];
        }>(`/search/combined?${fallbackParams.toString()}`);

        const found = data.allProviders.find((provider) => provider.id === id);
        if (!found) {
            throw error;
        }

        const mapped = mapProvider(found);
        return mapped;
    }
}

export async function fetchMyAutoWashProfile(): Promise<{
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoWash | null;
}> {
    const { data } = await http.get<{
        id: string;
        phone: string;
        name: string | null;
        role: string;
        profile: BackendProfile<AutoWash> | null;
    }>("/auto_washes/profile/me");
    return {
        ...data,
        profile: mapProviderProfile(data.profile) as AutoWash | null,
    };
}

export async function fetchMyAutoServiceProfile(): Promise<{
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoService | null;
}> {
    const { data } = await http.get<{
        id: string;
        phone: string;
        name: string | null;
        role: string;
        profile: BackendProfile<AutoService> | null;
    }>("/auto_services/profile/me");
    return {
        ...data,
        profile: mapProviderProfile(data.profile) as AutoService | null,
    };
}

export async function fetchMyAutoShopProfile(): Promise<{
    id: string;
    phone: string;
    name: string | null;
    role: string;
    profile: AutoShop | null;
}> {
    const { data } = await http.get<{
        id: string;
        phone: string;
        name: string | null;
        role: string;
        profile: BackendProfile<AutoShop> | null;
    }>("/auto_shops/profile/me");
    return {
        ...data,
        profile: mapProviderProfile(data.profile) as AutoShop | null,
    };
}
