import React from "react";
import { useUserProfile } from "@common/hooks";
import { UserRole } from "@common/types/user";
import { CustomerSettings } from "../CustomerSettings/CustomerSettings";
import { MasterSettings } from "../MasterSettings/MasterSettings";
import { AutoWashSettings } from "../AutoWashSettings/AutoWashSettings";
import { AutoShopSettings } from "../AutoShopSettings/AutoShopSettings";
import { AutoServiceSettings } from "../AutoServiceSettings/AutoServiceSettings";

export function Settings() {
    const { profile } = useUserProfile();

    if (!profile) return null;

    // accountType is the canonical account discriminator. The role fallback
    // keeps compatibility with older profiles stored before accountType was added.
    switch (profile.accountType ?? profile.role) {
        case UserRole.CUSTOMER:
            return <CustomerSettings />;
        case UserRole.MASTER:
        case "private_executor":
            return <MasterSettings />;
        case UserRole.AUTO_WASH:
            return <AutoWashSettings />;
        case UserRole.AUTO_SHOP:
            return <AutoShopSettings />;
        case UserRole.AUTO_SERVICE:
            return <AutoServiceSettings />;
        case UserRole.ADMIN:
        case UserRole.MODERATOR:
            return <MasterSettings />;
        default:
            return <CustomerSettings />;
    }
}
