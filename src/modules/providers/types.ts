import { Master } from "@modules/masters";

export enum ActivityType {
    master = "master",
    auto_shop = "auto_shop",
    auto_service = "auto_service",
    auto_wash = "auto_wash",
}

export type Provider = {
    activityType?: ActivityType;
    name?: string | null;
    phone?: string;
} & Master;
