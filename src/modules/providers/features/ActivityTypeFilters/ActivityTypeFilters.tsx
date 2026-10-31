import React from "react";
import { useQueryParams } from "@common/hooks";
import { ActivityType } from "./types";
import { ActivityTypeButton, Root } from "./styles";
import {
    AutoServiceCategoryIcon,
    AutoWashCategoryIcon,
    PrivateMasterCategoryIcon,
    ServiceCenterCategoryIcon,
} from "@common/icons";

type ActivityTypeFilterId = ActivityType | "detailing";

interface ActivityTypeFilter {
    id: ActivityTypeFilterId;
    name: string;
    displayName: string;
    icon: React.ReactNode;
    color: string;
}

const ACTIVITY_TYPE_FILTERS: ActivityTypeFilter[] = [
    {
        id: "master",
        name: "master",
        displayName: "Частные автомастера",
        icon: <img src={PrivateMasterCategoryIcon} alt="Частные автомастера" />,
        color: "#1d4ed8",
    },
    {
        id: "auto_service",
        name: "auto_service",
        displayName: "Автосервисы",
        icon: <img src={AutoServiceCategoryIcon} alt="Автосервисы" />,
        color: "#00a63e",
    },
    {
        id: "auto_wash",
        name: "auto_wash",
        displayName: "Автомойки",
        icon: <img src={AutoWashCategoryIcon} alt="Автомойки" />,
        color: "#0092b8",
    },
    {
        id: "auto_shop",
        name: "auto_shop",
        displayName: "Автомагазины",
        icon: <img src={ServiceCenterCategoryIcon} alt="Автомагазины" />,
        color: "#9810fa",
    },
    {
        id: "detailing",
        name: "detailing",
        displayName: "Детейлинг",
        icon: <img src={ServiceCenterCategoryIcon} alt="Детейлинг" />,
        color: "#ea580c",
    },
];

export function ActivityTypeFilters() {
    const { params, setParam } = useQueryParams();
    const activityTypesParam = params.activityTypes as string | undefined;
    const allFilterIds = ACTIVITY_TYPE_FILTERS.map((filter) => filter.id);

    const activeActivityTypes = activityTypesParam
        ? activityTypesParam.split(',').filter(Boolean)
        : allFilterIds;

    const handleFilterToggle = (filterId: ActivityTypeFilterId) => {
        // Test-only card for carousel overflow checks: does not affect provider filtering.
        if (filterId === "detailing") {
            return;
        }

        const isActive = activeActivityTypes.includes(filterId);
        let newActiveTypes: string[];
        if (isActive) {
            if (activeActivityTypes.length === 1) {
                return;
            }
            newActiveTypes = activeActivityTypes.filter((id) => id !== filterId);
        } else {
            newActiveTypes = [...activeActivityTypes, filterId];
        }

        const newParamValue =
            newActiveTypes.length === allFilterIds.length
                ? null
                : newActiveTypes.join(",");

        setParam("activityTypes", newParamValue);
    };

    return (
        <Root>
            {ACTIVITY_TYPE_FILTERS.map((filter) => {
                const isActive = activeActivityTypes.includes(filter.id);

                return (
                    <ActivityTypeButton
                        key={filter.id}
                        $color={filter.color}
                        $isActive={isActive}
                        onClick={() => handleFilterToggle(filter.id)}
                    >
                        {filter.icon}
                        <span>{filter.displayName}</span>
                    </ActivityTypeButton>
                );
            })}
        </Root>
    );
}
