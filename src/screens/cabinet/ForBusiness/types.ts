export type LegacyBusinessType =
    | "auto_service"
    | "auto_wash"
    | "auto_shop"
    | "tire_fitting"
    | "detailing"
    | "station"
    | "master"
    | "other";

export type ActivityGroupCode =
    | "private_executor"
    | "auto_service"
    | "auto_wash"
    | "auto_shop";

export type ActivitySubtypeCode =
    | "master"
    | "washer"
    | "general_service"
    | "tire_fitting"
    | "detailing"
    | "classic"
    | "self_service"
    | "general";

export type BusinessApplicationStatus =
    | "pending"
    | "approved"
    | "rejected"
    | "needs_revision";

export interface ActivitySubtypeOption {
    value: ActivitySubtypeCode;
    label: string;
    description: string;
}

export interface ActivityGroupOption {
    value: ActivityGroupCode;
    label: string;
    description: string;
    subtypes: ActivitySubtypeOption[];
}

export interface BusinessApplication {
    id: string;
    userId: string;
    businessType?: LegacyBusinessType;
    activityGroupCode?: ActivityGroupCode;
    activitySubtypeCode?: ActivitySubtypeCode;
    businessName?: string;
    applicantName?: string;
    city: string;
    address?: string;
    phone: string;
    yandexMapsUrl?: string;
    contactPerson?: string;
    email?: string;
    comment?: string;
    status: BusinessApplicationStatus;
    rejectionReason?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBusinessApplicationRequest {
    activityGroupCode: ActivityGroupCode;
    activitySubtypeCode: ActivitySubtypeCode;
    businessName?: string;
    applicantName?: string;
    city: string;
    address?: string;
    phone: string;
    yandexMapsUrl?: string;
    comment?: string;
    agreedToTerms: boolean;
}

export const PRIVATE_EXECUTOR_GROUP: ActivityGroupCode = "private_executor";

export const ACTIVITY_GROUP_OPTIONS: ActivityGroupOption[] = [
    {
        value: "private_executor",
        label: "Частный автомастер",
        description: "Работаете самостоятельно и принимаете заявки без карточки бизнеса.",
        subtypes: [
            {
                value: "master",
                label: "Автомастер",
                description: "Частный мастер по ремонту и обслуживанию автомобилей.",
            },
            {
                value: "washer",
                label: "Автомойщик",
                description: "Частный автомастер услуг мойки и ухода за автомобилем.",
            },
        ],
    },
    {
        value: "auto_service",
        label: "Автосервис",
        description: "Сервисный центр, шиномонтаж или детейлинг-студия с точкой на карте.",
        subtypes: [
            {
                value: "general_service",
                label: "Автосервис",
                description: "Общий сервис, диагностика и ремонт.",
            },
            {
                value: "tire_fitting",
                label: "Шиномонтаж",
                description: "Шиномонтаж, балансировка и сезонные работы.",
            },
            {
                value: "detailing",
                label: "Детейлинг",
                description: "Полировка, химчистка, керамика и уход за кузовом.",
            },
        ],
    },
    {
        value: "auto_wash",
        label: "Автомойка",
        description: "Мойка с персоналом или формат самообслуживания.",
        subtypes: [
            {
                value: "classic",
                label: "Классическая автомойка",
                description: "Мойка с персоналом и стандартным приёмом клиентов.",
            },
            {
                value: "self_service",
                label: "Самомойка",
                description: "Боксы самообслуживания для клиентов.",
            },
        ],
    },
    {
        value: "auto_shop",
        label: "Автомагазин",
        description: "Магазин запчастей, шин, расходников и автохимии.",
        subtypes: [
            {
                value: "general",
                label: "Автомагазин",
                description: "Единый тип без подтипов.",
            },
        ],
    },
];

export const SINGLE_SUBTYPE_GROUPS: ActivityGroupCode[] = ["auto_shop"];

export function isSingleSubtypeGroup(activityGroupCode?: ActivityGroupCode) {
    return Boolean(activityGroupCode && SINGLE_SUBTYPE_GROUPS.includes(activityGroupCode));
}

export const ACTIVITY_GROUP_LABELS = Object.fromEntries(
    ACTIVITY_GROUP_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ActivityGroupCode, string>;

export const ACTIVITY_SUBTYPE_LABELS = Object.fromEntries(
    ACTIVITY_GROUP_OPTIONS.flatMap((option) =>
        option.subtypes.map((subtype) => [subtype.value, subtype.label] as const),
    ),
) as Record<ActivitySubtypeCode, string>;

const LEGACY_BUSINESS_TYPE_TO_ACTIVITY: Partial<
    Record<
        LegacyBusinessType,
        { activityGroupCode: ActivityGroupCode; activitySubtypeCode: ActivitySubtypeCode }
    >
> = {
    auto_service: {
        activityGroupCode: "auto_service",
        activitySubtypeCode: "general_service",
    },
    tire_fitting: {
        activityGroupCode: "auto_service",
        activitySubtypeCode: "tire_fitting",
    },
    detailing: {
        activityGroupCode: "auto_service",
        activitySubtypeCode: "detailing",
    },
    station: {
        activityGroupCode: "auto_service",
        activitySubtypeCode: "general_service",
    },
    auto_wash: {
        activityGroupCode: "auto_wash",
        activitySubtypeCode: "classic",
    },
    auto_shop: {
        activityGroupCode: "auto_shop",
        activitySubtypeCode: "general",
    },
    master: {
        activityGroupCode: "private_executor",
        activitySubtypeCode: "master",
    },
};

export function getActivityGroupOption(
    activityGroupCode?: ActivityGroupCode,
): ActivityGroupOption | undefined {
    return ACTIVITY_GROUP_OPTIONS.find((option) => option.value === activityGroupCode);
}

export function getActivitySubtypeOption(
    activityGroupCode?: ActivityGroupCode,
    activitySubtypeCode?: ActivitySubtypeCode,
): ActivitySubtypeOption | undefined {
    return getActivityGroupOption(activityGroupCode)?.subtypes.find(
        (option) => option.value === activitySubtypeCode,
    );
}

export function isPrivateExecutorGroup(activityGroupCode?: ActivityGroupCode) {
    return activityGroupCode === PRIVATE_EXECUTOR_GROUP;
}

export function resolveActivitySelection(
    application?: Pick<
        BusinessApplication,
        "activityGroupCode" | "activitySubtypeCode" | "businessType"
    > | null,
) {
    if (!application) {
        return null;
    }

    if (application.activityGroupCode && application.activitySubtypeCode) {
        return {
            activityGroupCode: application.activityGroupCode,
            activitySubtypeCode: application.activitySubtypeCode,
        };
    }

    if (!application.businessType) {
        return null;
    }

    return LEGACY_BUSINESS_TYPE_TO_ACTIVITY[application.businessType] ?? null;
}
