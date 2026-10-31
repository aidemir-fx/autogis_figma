export type Coordinates = { x: number; y: number };

export enum AutoWashStatus {
    AVAILABLE = "available",
    SCHEDULE = "schedule",
    UNAVAILABLE = "unavailable",
}
export type AdditionalService = {
    id: string;
    name: string;
};

export type AutoWash = {
    id: string;
    userId: string;
    fullName?: string;
    address: string;
    coordinates: Coordinates;
    status: AutoWashStatus;
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
    liveQueueEnabled?: boolean;
    activitySubtype?: {
        code?: string;
        displayName?: string;
    };
    distance?: number; // Distance in meters from user location
    user?: {
        id: string;
        phone: string;
    };
};
