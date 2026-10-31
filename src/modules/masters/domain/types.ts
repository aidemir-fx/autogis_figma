import { Coordinates, MasterStatus } from "@common/types";

export type MastersSearchParams = {
    query?: string[];
};

export type MasterListItem = {
    id: string;
    address: string;
    coordinates: Coordinates;
    status: MasterStatus;
    description: string;
    rating: number;
    professions: string[];
    autoMarks: string[];
    services: string[];
    workingDays: boolean[];
};

// These enums can be used for predefined values, but the API now accepts any strings
export enum MasterProfessions {
    motor = "Моторист",
    chassis = "Ходовик",
}

export enum MasterAutoMarks {
    mersedes = "Мерседес",
    motorcycle = "Мотоцикл",
}

export enum MasterServices {
    repair = "Ремонт",
    maintenance = "Обслуживание",
}
