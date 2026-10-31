import { Navigate, useLocation } from "react-router-dom";
import { hasCapability, UserCapabilityKey } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";
import { PageSkeleton } from "./PageSkeleton";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredCapability?: UserCapabilityKey;
}

export function ProtectedRoute({ children, requiredCapability }: ProtectedRouteProps) {
    const location = useLocation();
    const accessToken = localStorage.getItem("accessToken");
    const { profile, isLoading } = useUserProfile({ enabled: !!accessToken && !!requiredCapability });

    if (!accessToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (requiredCapability) {
        if (isLoading && !profile) {
            return <PageSkeleton rows={3} hasAvatar />;
        }

        if (!hasCapability(profile, requiredCapability)) {
            return <Navigate to="/cabinet" replace />;
        }
    }

    return <>{children}</>;
}
