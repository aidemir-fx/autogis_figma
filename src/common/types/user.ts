import { AutoService } from "@modules/auto-service";
import { AutoShop } from "@modules/auto-shops";
import { AutoWash } from "@modules/auto-washes";
import { Master } from "@modules/masters";

export enum UserRole {
    CUSTOMER = "customer",
    MASTER = "master",
    AUTO_WASH = "auto_wash",
    AUTO_SHOP = "auto_shop",
    AUTO_SERVICE = "auto_service",
    ADMIN = "admin",
    MODERATOR = "moderator",
}

export enum UserAccountType {
    CUSTOMER = "customer",
    PRIVATE_EXECUTOR = "private_executor",
    AUTO_WASH = "auto_wash",
    AUTO_SHOP = "auto_shop",
    AUTO_SERVICE = "auto_service",
    ADMIN = "admin",
    MODERATOR = "moderator",
}

export interface UserCapabilities {
    professionalCabinet: boolean;
    crmMini: boolean;
    businessCrm: boolean;
    professionalChat: boolean;
    applications: boolean;
    calendar: boolean;
}

export interface BaseProfile {
    id: string;
    fullName?: string;
    address?: string;
    description?: string;
    services?: string[];
    workingPhone?: string;
    coordinatesX?: number;
    coordinatesY?: number;
    workingDays: boolean[];
    workFrom?: string;
    workTo?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface MasterProfile extends BaseProfile {
    rating: number;
}

export interface AutoWashProfile extends BaseProfile {
    boxCount?: number;
}

export interface AutoShopProfile extends BaseProfile {
    liftCount?: number;
}

export interface AutoServiceProfile extends BaseProfile {}

export interface User {
    id: string;
    phone: string;
    role: UserRole;
    accountType?: UserAccountType;
    name?: string;
    contactNumber?: string;
    isProfessional: boolean;
    capabilities?: UserCapabilities;
    createdAt?: string;
    updatedAt?: string;
    activityTypes?: Array<{
        id: string;
        name: string;
        displayName: string;
    }>;

    master?: Master;
    autoShop?: AutoShop;
    autoService?: AutoService;
    autoWash?: AutoWash;
}

export interface UserResponse {
    id: string;
    phone: string;
    role: UserRole;
    profile:
        | MasterProfile
        | AutoWashProfile
        | AutoShopProfile
        | AutoServiceProfile
        | null;
}
