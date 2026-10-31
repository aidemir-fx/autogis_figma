import { http } from "@common/lib/http";
import { AutoServiceStatus } from "@modules/auto-service";
import { AutoShopStatus } from "@modules/auto-shops";
import { AutoWashStatus } from "@modules/auto-washes";

// Типы статусов для всех ролей
export type ServiceStatus = "available" | "busy" | "unavailable";

// Типы статусов для всех ролей

// API для автомойки
export async function fetchAutoWashProfile() {
    const { data } = await http.get(`/auto_washes/profile/me`);
    return data;
}

export async function updateAutoWashProfile(payload: {
    fullName?: string;
    address?: string;
    description?: string;
    coordinates?: { x: number; y: number };
    services?: string[];
    workingDays?: boolean[];
    workFrom?: string;
    workTo?: string;
    phone?: string;
    workingPhone?: string;
    onlineBookingEnabled?: boolean;
    liveQueueEnabled?: boolean;
}) {
    const { data } = await http.put(`/auto_washes/profile/me`, payload);
    return data;
}

export async function updateAutoWashStatus(status: AutoWashStatus) {
    const { data } = await http.put(`/auto_washes/status`, { status });
    return data;
}

export async function fetchAdditionalServices() {
    const { data } = await http.get(`/auto_washes/additional-services`);
    return data;
}

export async function fetchAutoShopAdditionalServices() {
    const { data } = await http.get(`/auto_shops/additional-services`);
    return data;
}

// API для автосервиса
export async function fetchAutoShopProfile() {
    const { data } = await http.get(`/auto_shops/profile/me`);
    return data;
}

export async function updateAutoShopProfile(payload: {
    fullName?: string;
    address?: string;
    description?: string;
    coordinates?: { x: number; y: number };
    services?: string[];
    workingDays?: boolean[];
    workFrom?: string;
    workTo?: string;
    phone?: string;
    workingPhone?: string;
}) {
    const { data } = await http.put(`/auto_shops/profile/me`, payload);
    return data;
}

export async function updateAutoShopStatus(status: AutoShopStatus) {
    const { data } = await http.put(`/auto_shops/status`, { status });
    return data;
}

// API для авто-магазина
export async function fetchAutoServiceProfile() {
    const { data } = await http.get(`/auto_services/profile/me`);
    return data;
}

export async function updateAutoServiceProfile(payload: {
    fullName?: string;
    address?: string;
    description?: string;
    coordinates?: { x: number; y: number };
    services?: string[];
    workingDays?: boolean[];
    workFrom?: string;
    workTo?: string;
    phone?: string;
    workingPhone?: string;
}) {
    const { data } = await http.put(`/auto_services/profile/me`, payload);
    return data;
}

export async function updateAutoServiceStatus(status: AutoServiceStatus) {
    const { data } = await http.put(`/auto_services/status`, { status });
    return data;
}
