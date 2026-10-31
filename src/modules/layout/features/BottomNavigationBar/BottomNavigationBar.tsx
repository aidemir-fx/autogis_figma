import {
    Badge,
    Box,
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    useMediaQuery,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { hasCapability } from "@common/lib/userAccess";
import { useUserProfile } from "@common/hooks";
import { getProviderOrders, ChatOrder } from "@modules/chats/api";
import { useUnreadChatsCount } from "@modules/chats/hooks";
import {
    BOTTOM_NAV_RESERVED_SPACE,
    COMPACT_LAYOUT_MEDIA_QUERY,
} from "../layoutViewport";

const SEARCH_ROUTE = "/";
const BOOKINGS_ROUTE = "/cabinet/bookings";
const CHATS_ROUTE = "/cabinet/chats";
const CABINET_ROUTE = "/cabinet/professional";
const PROFILE_ROUTE = "/cabinet";
export const BOTTOM_NAV_MEDIA_QUERY = COMPACT_LAYOUT_MEDIA_QUERY;

type NavigationValue = "search" | "bookings" | "cabinet" | "chats" | "profile";

type MockupIconName = "search" | "calendar" | "chat" | "user";

function MockupNavIcon({ name }: { name: MockupIconName }) {
    return (
        <Box component="span" className="nav-icon" aria-hidden="true">
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {name === "search" && (
                    <>
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </>
                )}
                {name === "calendar" && (
                    <>
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 10h18" />
                    </>
                )}
                {name === "chat" && (
                    <path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-4-.8L3 21l1.8-5A8 8 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
                )}
                {name === "user" && (
                    <>
                        <path d="M20 21a8 8 0 0 0-16 0" />
                        <circle cx="12" cy="8" r="5" />
                    </>
                )}
            </svg>
        </Box>
    );
}

function getActiveValue(pathname: string): NavigationValue {
    if (pathname.startsWith("/cabinet/bookings")) {
        return "bookings";
    }

    if (pathname.startsWith("/cabinet/professional")) {
        return "cabinet";
    }

    if (pathname.startsWith("/cabinet/chats")) {
        return "chats";
    }

    if (pathname.startsWith("/cabinet")) {
        return "profile";
    }

    return "search";
}

export const BottomNavigationBar = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isMobile = useMediaQuery(BOTTOM_NAV_MEDIA_QUERY);
    const accessToken =
        typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
    const shouldFetchNavData =
        !!accessToken && pathname.startsWith("/cabinet");
    const { profile } = useUserProfile({ enabled: shouldFetchNavData });

    const hasProfessionalCabinetAccess = hasCapability(
        profile,
        "professionalCabinet",
    );
    const hasApplicationsAccess = hasCapability(profile, "applications");

    const { data: providerOrders } = useQuery<ChatOrder[]>({
        queryKey: ["providerOrders", profile?.id],
        queryFn: getProviderOrders,
        enabled: shouldFetchNavData && hasApplicationsAccess,
        refetchInterval: 60_000,
        retry: false,
    });

    const pendingCount = hasApplicationsAccess
        ? (providerOrders ?? []).filter((o) => o.status === "pending").length
        : 0;

    const unreadChatsCount = useUnreadChatsCount(shouldFetchNavData);

    if (!isMobile) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1300,
                borderTop: "1px solid #e5e7eb",
                pb: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            <BottomNavigation
                showLabels
                value={getActiveValue(pathname)}
                sx={{
                    minHeight: 56,
                    bgcolor: "rgba(250,250,250,0.97)",
                    backdropFilter: "blur(10px)",
                    "& .MuiBottomNavigationAction-root": {
                        minWidth: 0,
                        px: 0.5,
                        py: 0.5,
                        color: "#6b7280",
                        "& .MuiBottomNavigationAction-label": {
                            color: "#6b7280",
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: 0,
                            lineHeight: 1.2,
                            mt: "3px",
                        },
                        "&.Mui-selected": {
                            color: "#111827",
                            "& .MuiBottomNavigationAction-label": {
                                color: "#111827",
                                fontSize: "10px",
                            },
                            "& .nav-icon": {
                                color: "#1d4ed8",
                                backgroundColor: "#eff6ff",
                            },
                        },
                    },
                    "& .nav-icon": {
                        width: 28,
                        height: 28,
                        borderRadius: "9px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        transition:
                            "background-color 160ms ease, color 160ms ease",
                    },
                    "& .nav-icon svg": {
                        display: "block",
                        width: 18,
                        height: 18,
                    },
                }}
                onChange={(_event, newValue: NavigationValue) => {
                    if (newValue === "search") {
                        navigate(SEARCH_ROUTE);
                    } else if (newValue === "bookings") {
                        navigate(BOOKINGS_ROUTE);
                    } else if (newValue === "cabinet") {
                        navigate(CABINET_ROUTE);
                    } else if (newValue === "chats") {
                        navigate(CHATS_ROUTE);
                    } else {
                        navigate(PROFILE_ROUTE);
                    }
                }}
            >
                <BottomNavigationAction
                    label="Поиск"
                    value="search"
                    icon={<MockupNavIcon name="search" />}
                />
                <BottomNavigationAction
                    label="Мои записи"
                    value="bookings"
                    icon={<MockupNavIcon name="calendar" />}
                />
                {hasProfessionalCabinetAccess && (
                    <BottomNavigationAction
                        label="Кабинет"
                        value="cabinet"
                        icon={
                            <Badge
                                badgeContent={pendingCount}
                                color="error"
                                max={99}
                            >
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "8px",
                                        background:
                                            "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 2px 6px rgba(99,102,241,0.35)",
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            color: "#fff",
                                            fontSize: "9px",
                                            fontWeight: 800,
                                            letterSpacing: "0.08em",
                                            lineHeight: 1,
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        PRO
                                    </Box>
                                </Box>
                            </Badge>
                        }
                    />
                )}
                <BottomNavigationAction
                    label="Чаты"
                    value="chats"
                    icon={
                        <Badge
                            badgeContent={unreadChatsCount}
                            color="error"
                            max={99}
                        >
                            <MockupNavIcon name="chat" />
                        </Badge>
                    }
                />
                <BottomNavigationAction
                    label="Профиль"
                    value="profile"
                    icon={<MockupNavIcon name="user" />}
                />
            </BottomNavigation>
        </Paper>
    );
};
