import { Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@common/types/user";

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MODERATOR];

function readRoleFromStorage(): UserRole | null {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return null;
        const parsed = JSON.parse(userStr);
        return typeof parsed?.role === "string" ? (parsed.role as UserRole) : null;
    } catch {
        return null;
    }
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const role = readRoleFromStorage();
    if (!role || !ADMIN_ROLES.includes(role)) {
        return <Navigate to="/cabinet" replace />;
    }

    return <>{children}</>;
}
