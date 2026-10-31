export type Coordinates = { x: number; y: number };

export enum AutoServiceStatus {
    AVAILABLE = "available",
    SCHEDULE = "schedule",
    UNAVAILABLE = "unavailable",
}

export type AutoService = {
    id: string;
    userId: string;
    fullName?: string;
    address: string;
    coordinates: Coordinates;
    status: AutoServiceStatus;
    currentStatus?: AutoServiceStatus;
    description: string;
    rating: number;
    reviewsCount?: number;
    professions: string[];
    autoMarks: string[];
    services: string[];
    payments?: string[];
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
    distance?: number; // Distance in meters from user location
    user?: {
        id: string;
        phone: string;
    };
};
