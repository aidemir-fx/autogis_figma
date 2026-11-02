import { http } from "@common/lib/http";
import { Master, MasterStatus } from "@common/types";
import { MastersSearchParams } from "../types";
import { getAccountAvatars } from "@modules/media/api";

type BackendPoint = {
    type?: string;
    coordinates?: [number, number];
};

type ProviderType = "master" | "auto_service" | "auto_wash" | "auto_shop";

type BackendMaster = Omit<Master, "coordinates" | "workingDays" | "autoMarks"> & {
    coordinates?: BackendPoint;
    workingDays?: boolean[] | string[];
    autoMarks?: string[];
};

type BackendProvider = BackendMaster & {
    providerType?: ProviderType;
    businessName?: string;
    brandSupport?: string[];
    hasParking?: boolean;
    liftCount?: number;
    warranty?: boolean;
    hotline?: string;
};

function mapPointToCoordinates(point?: BackendPoint) {
    if (!point?.coordinates || point.coordinates.length < 2) {
        return { x: 0, y: 0 };
    }

    return {
        x: point.coordinates[1],
        y: point.coordinates[0],
    };
}

export function mapCoordinatesToPoint(coordinates?: { x: number; y: number }) {
    if (!coordinates) {
        return undefined;
    }

    return {
        type: "Point",
        coordinates: [coordinates.y, coordinates.x] as [number, number],
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

function mapBackendMaster(master: BackendMaster): Master {
    return {
        ...master,
        coordinates: mapPointToCoordinates(master.coordinates),
        workingDays: mapWorkingDays(master.workingDays),
        autoMarks: master.autoMarks ?? [],
        professions: master.professions ?? [],
        services: master.services ?? [],
        description: master.description ?? "",
        address: master.address ?? "",
    };
}

function mapBackendProvider(provider: BackendProvider): Master {
    const base = mapBackendMaster(provider as BackendMaster);
    return {
        ...base,
        // если в Master есть поля для сервисов, заполнить их,
        // иначе сохраняем в тех же полях, которые присутствуют
        ...(provider.providerType && { providerType: provider.providerType }),
        ...(provider.businessName && { businessName: provider.businessName }),
        ...(provider.brandSupport && { brandSupport: provider.brandSupport }),
        ...(provider.hasParking !== undefined && { hasParking: provider.hasParking }),
        ...(provider.liftCount !== undefined && { liftCount: provider.liftCount }),
        ...(provider.warranty !== undefined && { warranty: provider.warranty }),
        ...(provider.hotline && { hotline: provider.hotline }),
    } as Master;
}

function resolveAccountId(master: Master): string {
    return master.userId || master.id;
}

function applyAvatarMap(
    masters: Master[],
    avatarMap: Record<string, string | null>
): Master[] {
    return masters.map((master) => {
        const accountId = resolveAccountId(master);
        const mediaAvatar = avatarMap[accountId] ?? null;
        return {
            ...master,
            avatar: master.avatar ?? mediaAvatar ?? undefined,
        };
    });
}

export async function fetchMasters(
    params: MastersSearchParams
): Promise<Master[]> {
    const searchParams = new URLSearchParams();
    if (params.query && params.query.length > 0) {
        for (const query of params.query) {
            searchParams.append("query", query);
        }
    }

    const { data } = await http.get<BackendProvider[]>(
        `/masters${
            searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`
    );
    const mapped = data.map(mapBackendProvider);
    return mapped;
}

export async function fetchMyProfile() {
    const { data } = await http.get<BackendMaster>(`/masters/profile/me`);
    const mapped = mapBackendMaster(data);
    const avatarMap = await getAccountAvatars([resolveAccountId(mapped)]);
    return applyAvatarMap([mapped], avatarMap)[0];
}

export async function updateMyProfile(payload: {
    fullName?: string;
    address?: string;
    coordinates?: { x: number; y: number };
    description?: string;
    professions?: string[];
    autoMarks?: { name: string; internationalName?: string }[];
    services?: string[];
    payments?: string[];
    workingDays?: boolean[];
    workFrom?: string;
    workTo?: string;
    onlineBookingEnabled?: boolean;
    liveQueueEnabled?: boolean;
    phone?: string;
    workingPhone?: string;
    coverImageAssetId?: string;
    hasParking?: boolean;
    hasWifi?: boolean;
    hasWaitingArea?: boolean;
    offersCoffee?: boolean;
    hasEvacuation?: boolean;
    hasPartsInStock?: boolean;
    liftCount?: number;
}) {
    const requestPayload = {
        ...payload,
        coordinates: mapCoordinatesToPoint(payload.coordinates),
        autoMarks: payload.autoMarks?.map((mark) =>
            typeof mark === "string" ? mark : mark.name
        ),
    };
    const { data } = await http.put<BackendProvider>(
        `/masters/profile/me`,
        requestPayload
    );
    return mapBackendProvider(data);
}

export async function updateStatus(status: MasterStatus) {
    const { data } = await http.patch(`/masters/profile/me/status`, { status });
    return data;
}

type CatalogOption = {
    id: string;
    name: string;
};

type CatalogVehicleBrand = CatalogOption & {
    internationalName?: string;
    models?: CatalogOption[];
};

export async function fetchAllProfessions(): Promise<string[]> {
    const { data } = await http.get<CatalogOption[]>("/catalog/professions");
    return data.map((item) => item.name);
}

export async function fetchAllAutoMarks(): Promise<
    { name: string; internationalName?: string }[]
> {
    const { data } = await http.get<CatalogVehicleBrand[]>(
        "/catalog/vehicle-brands",
    );
    return data.map(({ name, internationalName }) => ({
        name,
        internationalName,
    }));
}

export async function fetchAllServices(): Promise<string[]> {
    const { data } = await http.get<CatalogOption[]>("/catalog/services");
    return data.map((item) => item.name);
}

export async function fetchMasterById(
    id: string,
    userLat?: number,
    userLng?: number
): Promise<Master> {
    const searchParams = new URLSearchParams();
    if (userLat !== undefined && userLng !== undefined) {
        searchParams.append("lat", userLat.toString());
        searchParams.append("lng", userLng.toString());
    }
    const queryString = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";
    const { data } = await http.get<BackendMaster>(`/masters/${id}${queryString}`);
    return mapBackendMaster(data);
}
