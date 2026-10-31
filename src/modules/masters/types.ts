import { ActivityType } from "@modules/providers/types";

export type Coordinates = { x: number; y: number };

export enum MasterStatus {
    AVAILABLE = "available",
    SCHEDULE = "schedule",
    UNAVAILABLE = "unavailable",
}

export type Master = {
    id: string;
    userId: string;
    activityType?: ActivityType;
    fullName?: string;
    address: string;
    coordinates: Coordinates;
    status: MasterStatus;
    currentStatus: MasterStatus;
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
    providerType?: "master" | "auto_service" | "auto_wash" | "auto_shop";
    businessName?: string;
    brandSupport?: string[];
    hasParking?: boolean;
    liftCount?: number;
    warranty?: boolean;
    hotline?: string;
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
