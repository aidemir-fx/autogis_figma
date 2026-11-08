export type Coordinates = { x: number; y: number };

export enum AutoShopStatus {
    AVAILABLE = "available",
    SCHEDULE = "schedule",
    UNAVAILABLE = "unavailable",
}

export type AdditionalService = {
    id: string;
    name: string;
};

export type AutoShop = {
    id: string;
    userId: string;
    fullName?: string;
    address: string;
    coordinates: Coordinates;
    status: AutoShopStatus;
    description: string;
    rating: number;
    reviewsCount?: number;
    professions: string[];
    autoMarks: string[];
    services: string[];
    payments?: string[];
    additionalServices?: AdditionalService[];
    workingDays: boolean[];
    workFrom?: string;
    workTo?: string;
    workingPhone?: string;
    avatar?: string;
    avatarUrl?: string;
    coverImage?: string;
    coverImageUrl?: string;
    coverImageAssetId?: string;
    onlineBookingEnabled?: boolean;
    distance?: number; // Distance in meters from user location
    user?: {
        id: string;
        phone: string;
    };
};
