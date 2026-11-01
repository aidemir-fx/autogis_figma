import React, { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
    ActivityType,
    DEFAULT_SEARCH_RADIUS,
    Provider,
    ProvidersMap,
} from "@modules/providers";
import { fetchCombinedProviders } from "@modules/providers/api";
import { CreateOrderModal } from "@modules/masters/features/CreateOrderModal";
import { useAuth, useCoords, useQueryParams, useUserProfile } from "@common/hooks";
import { UserRole } from "@common/types";
import { NotificationBell } from "../../components/NotificationBell";
import { RadiusPickerModal } from "./components/RadiusPickerModal";
import { FigmaMasterCard } from "./components/FigmaMasterCard";
import { FigmaOrgCard } from "./components/FigmaOrgCard";
import { FigmaStoryStrip } from "./components/FigmaStoryStrip";
import { BookingModal } from "./components/BookingModal";

type ProviderCategory = {
    type: ActivityType;
    title: string;
    chip: string;
    empty: string;
};

// Exact order from Figma mock:
// 1. Частные мастера
// 2. Автосервисы
// 3. Автомагазины
// 4. Автомойки
const FIGMA_CATEGORIES: ProviderCategory[] = [
    {
        type: ActivityType.master,
        title: "Частные мастера",
        chip: "Частные",
        empty: "Частные мастера в выбранном радиусе не найдены.",
    },
    {
        type: ActivityType.auto_service,
        title: "Автосервисы",
        chip: "Автосервисы",
        empty: "Автосервисы в выбранном радиусе не найдены.",
    },
    {
        type: ActivityType.auto_shop,
        title: "Автомагазины",
        chip: "Автомагазины",
        empty: "Автомагазины в выбранном радиусе не найдены.",
    },
    {
        type: ActivityType.auto_wash,
        title: "Автомойки",
        chip: "Автомойки",
        empty: "Автомойки в выбранном радиусе не найдены.",
    },
];

export function MainpPageScreen() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { profile } = useUserProfile();
    const { params, setParam } = useQueryParams();

    // Search query & filters
    const [searchQuery, setSearchQuery] = useState("");
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ActivityType | "all">("all");
    const [isRadiusPickerOpen, setIsRadiusPickerOpen] = useState(false);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

    // Online booking modal & Map selected provider card
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedBookingProvider, setSelectedBookingProvider] = useState<Provider | null>(null);
    const [selectedMapProvider, setSelectedMapProvider] = useState<Provider | null>(null);

    // Radius from URL or 5 km default (as in Figma mock: "Радиус 5 км")
    const radiusParam = params.radius as string | undefined;
    const radius = useMemo(() => {
        if (!radiusParam) return 5;
        const parsed = parseInt(radiusParam, 10);
        return isNaN(parsed) ? 5 : parsed;
    }, [radiusParam]);

    // Coordinates & Map
    const { userCoords } = useCoords();
    const centerCoords: [number, number] = useMemo(
        () => userCoords || [55.7558, 37.6173],
        [userCoords]
    );
    const yandexMapRef = useRef<any>(null);
    const mastersRef = useRef<any>({});
    const categoryRefs = {
        [ActivityType.master]: useRef<HTMLDivElement>(null),
        [ActivityType.auto_service]: useRef<HTMLDivElement>(null),
        [ActivityType.auto_shop]: useRef<HTMLDivElement>(null),
        [ActivityType.auto_wash]: useRef<HTMLDivElement>(null),
    };

    // Providers query
    const { data, isLoading } = useQuery({
        queryKey: ["providers", centerCoords[0], centerCoords[1], radius],
        queryFn: () =>
            fetchCombinedProviders(
                centerCoords[0],
                centerCoords[1],
                radius
            ),
        staleTime: 60_000,
    });

    const allProviders = useMemo(() => data?.allProviders ?? [], [data?.allProviders]);
    const nearbyProviders = useMemo(() => data?.nearbyProviders ?? allProviders, [data?.nearbyProviders, allProviders]);

    // Filter providers by search query and availability
    const filteredProviders = useMemo(() => {
        let list = nearbyProviders.length > 0 ? nearbyProviders : allProviders;

        if (onlyAvailable) {
            list = list.filter((p) => p.status === "available");
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((p) => {
                const name = (p.fullName || p.businessName || p.name || "").toLowerCase();
                const desc = (p.description || "").toLowerCase();
                const professions = (p.professions || []).some((prof) => prof.toLowerCase().includes(q));
                const services = (p.services || []).some((s) => s.toLowerCase().includes(q));
                const autoMarks = (p.autoMarks || []).some((m) => m.toLowerCase().includes(q));
                return name.includes(q) || desc.includes(q) || professions || services || autoMarks;
            });
        }

        return list;
    }, [nearbyProviders, allProviders, onlyAvailable, searchQuery]);

    // Group filtered providers by category
    const providersByType = useMemo(() => {
        const map: Record<ActivityType, Provider[]> = {
            [ActivityType.master]: [],
            [ActivityType.auto_service]: [],
            [ActivityType.auto_shop]: [],
            [ActivityType.auto_wash]: [],
        };

        for (const p of filteredProviders) {
            const rawType = (p.activityType || (p as any).providerType) as string;
            let type: ActivityType = ActivityType.master;
            if (rawType === "auto_service" || rawType === "1") type = ActivityType.auto_service;
            else if (rawType === "master" || rawType === "2") type = ActivityType.master;
            else if (rawType === "auto_wash" || rawType === "3") type = ActivityType.auto_wash;
            else if (rawType === "auto_shop" || rawType === "4") type = ActivityType.auto_shop;

            if (map[type]) {
                map[type].push(p);
            }
        }

        return map;
    }, [filteredProviders]);

    // Counts for filter pills
    const totalCount = filteredProviders.length;
    const masterCount = providersByType[ActivityType.master].length;
    const serviceCount = providersByType[ActivityType.auto_service].length;
    const shopCount = providersByType[ActivityType.auto_shop].length;
    const washCount = providersByType[ActivityType.auto_wash].length;

    // Action handlers
    const handleRecenterMap = () => {
        if (yandexMapRef.current) {
            yandexMapRef.current.setCenter(centerCoords, 15, { duration: 500 });
        }
    };

    const handleOpenBooking = (provider: Provider) => {
        setSelectedBookingProvider(provider);
        setBookingModalOpen(true);
    };

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
    };

    const handleChat = (provider: Provider) => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        navigate(`/cabinet/chats?providerId=${provider.id}`);
    };

    const handleCategoryFilterClick = (type: ActivityType | "all") => {
        setSelectedCategory(type);
        if (type !== "all" && categoryRefs[type]?.current) {
            categoryRefs[type].current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Scroll & Collapse mechanics for Bottom Sheet over Map
    const [scrollY, setScrollY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const scrollStartY = useRef(0);
    const hasDragged = useRef(false);

    React.useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setScrollY(window.scrollY);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleToggleMap = () => {
        if (hasDragged.current) return;
        if (window.scrollY > 160) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            window.scrollTo({ top: 480, behavior: "smooth" });
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        dragStartY.current = e.clientY;
        scrollStartY.current = window.scrollY;
        hasDragged.current = false;
        setIsDragging(true);
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch (_) {}
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const deltaY = dragStartY.current - e.clientY;
        if (Math.abs(deltaY) > 4) {
            hasDragged.current = true;
        }
        window.scrollTo({
            top: Math.max(0, scrollStartY.current + deltaY),
            behavior: "auto",
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (_) {}
    };

    const isMapCollapsed = scrollY > 240;

    const categoriesToRender = useMemo(() => {
        if (selectedCategory === "all") return FIGMA_CATEGORIES;
        return FIGMA_CATEGORIES.filter((c) => c.type === selectedCategory);
    }, [selectedCategory]);

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 480,
                margin: "0 auto",
                backgroundColor: "#FFFFFF",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#1E293B",
                overflowX: "clip",
                boxSizing: "border-box",
                paddingBottom: 72, // Leave space for fixed bottom navigation
            }}
        >
            {/* 1. Header (Sticky at top, white background, light aesthetic) */}
            <header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #F1F5F9",
                    flexShrink: 0,
                }}
            >
                {/* Logo left: full brand logo image (graphic + text included) */}
                <div
                    onClick={() => navigate("/")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                    }}
                >
                    <img
                        src="/assets/aistudio/image_ae9be8c8.png"
                        alt="АвтоГис"
                        style={{
                            height: 38,
                            width: "auto",
                            maxWidth: 160,
                            objectFit: "contain",
                            display: "block",
                        }}
                    />
                </div>

                {/* Right actions: Notifications & Login/Profile */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Notification bell square (40x40, rounded 8px) */}
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: "#F1F5F9",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <NotificationBell isAdmin={profile?.role === UserRole.ADMIN} />
                    </div>

                    {/* Login button (68x40, rounded 8px, dark text) or profile */}
                    {isAuthenticated ? (
                        <button
                            type="button"
                            onClick={() => navigate("/cabinet")}
                            style={{
                                height: 40,
                                padding: "0 14px",
                                backgroundColor: "#F1F5F9",
                                borderRadius: 8,
                                border: "none",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#1E293B",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            Профиль
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            style={{
                                width: 68,
                                height: 40,
                                backgroundColor: "#F1F5F9",
                                borderRadius: 8,
                                border: "none",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#1E293B",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background-color 0.15s ease",
                            }}
                        >
                            Войти
                        </button>
                    )}
                </div>
            </header>

            {/* 2. Story Strip: 5 rounded-square items */}
            <div
                style={{
                    paddingTop: 8,
                    paddingBottom: 8,
                    backgroundColor: "#FFFFFF",
                    position: "relative",
                    zIndex: 40,
                }}
            >
                <FigmaStoryStrip />
            </div>

            {/* 3. Map Section: Sticky at top (under 60px header), covered smoothly by sheet on scroll */}
            <div
                style={{
                    position: "sticky",
                    top: 60,
                    width: "100%",
                    height: 520,
                    backgroundColor: "#E2E8F0",
                    zIndex: 10,
                    overflow: "hidden",
                }}
            >
                <ProvidersMap
                    masters={filteredProviders}
                    mastersRef={mastersRef}
                    mapInstanceRef={yandexMapRef}
                    isLoading={isLoading}
                    height="520px"
                    onSelectProvider={(p) => setSelectedMapProvider(p)}
                />

                {/* Floating Geolocation Square Button (centered vertically on right, compact icon) */}
                <button
                    type="button"
                    onClick={handleRecenterMap}
                    aria-label="Определить мое местоположение"
                    title="Мое местоположение"
                    style={{
                        position: "absolute",
                        top: "50%",
                        right: 16,
                        transform: "translateY(-50%)",
                        width: 36,
                        height: 36,
                        backgroundColor: "#FFFFFF",
                        borderRadius: 8,
                        border: "none",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.16)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 15,
                        transition: "background-color 0.15s ease",
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                </button>

                {/* Floating Profile Preview Card over Map upon Marker Click */}
                {selectedMapProvider && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: 82,
                            left: 12,
                            right: 12,
                            backgroundColor: "#FFFFFF",
                            borderRadius: 16,
                            padding: "14px 14px 12px",
                            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
                            border: "1px solid #E2E8F0",
                            zIndex: 35,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                {selectedMapProvider.avatarUrl || selectedMapProvider.avatar ? (
                                    <img
                                        src={selectedMapProvider.avatarUrl || selectedMapProvider.avatar}
                                        alt=""
                                        style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", flexShrink: 0, backgroundColor: "#E2E8F0" }}
                                    />
                                ) : (
                                    <div aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0, backgroundColor: "#E2E8F0", color: "#475569", fontWeight: 700 }}>
                                        {(selectedMapProvider.fullName || selectedMapProvider.businessName || selectedMapProvider.name || "").trim().charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.25 }}>
                                        {selectedMapProvider.businessName || selectedMapProvider.fullName || selectedMapProvider.name}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "#2563EB",
                                                backgroundColor: "#EFF6FF",
                                                padding: "2px 6px",
                                                borderRadius: 4,
                                            }}
                                        >
                                            {selectedMapProvider.activityType === ActivityType.auto_service
                                                ? "Автосервис"
                                                : selectedMapProvider.activityType === ActivityType.auto_shop
                                                ? "Автомагазин"
                                                : selectedMapProvider.activityType === ActivityType.auto_wash
                                                ? "Автомойка"
                                                : "Частный мастер"}
                                        </span>
                                        {(selectedMapProvider.reviewsCount ?? 0) > 0 && (
                                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E293B" }}>
                                                ★ {(selectedMapProvider.rating ?? 0).toFixed(1)} ({selectedMapProvider.reviewsCount})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedMapProvider(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94A3B8",
                                    fontSize: 18,
                                    cursor: "pointer",
                                    padding: "2px 4px",
                                    lineHeight: 1,
                                }}
                                title="Закрыть"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Address & Key stats nuance */}
                        {selectedMapProvider.address && <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4 }}>
                            <span>📍</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {selectedMapProvider.address}
                            </span>
                        </div>}

                        {/* Action buttons row */}
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const phone = selectedMapProvider.workingPhone || selectedMapProvider.phone;
                                    if (phone) window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
                                }}
                                style={{
                                    flex: 1,
                                    height: 38,
                                    backgroundColor: "#F1F5F9",
                                    color: "#1E293B",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                }}
                            >
                                <span>📞</span> Позвонить
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const type = selectedMapProvider.activityType || ActivityType.master;
                                    navigate(`/provider?id=${selectedMapProvider.id}&type=${type}`);
                                }}
                                style={{
                                    flex: 1.3,
                                    height: 38,
                                    backgroundColor: "#2563EB",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                Подробнее →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Results Panel ("Шторка", slides up over the map, covering it smoothly as you scroll down) */}
            <main
                style={{
                    position: "relative",
                    marginTop: -72,
                    backgroundColor: "#F6F6F6",
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    paddingTop: 8,
                    paddingBottom: 24,
                    boxShadow: "0 -6px 20px rgba(0, 0, 0, 0.10)",
                    zIndex: 20,
                    boxSizing: "border-box",
                    minHeight: "calc(100vh - 60px)",
                }}
            >
                {/* Interactive Drag Handle Area (pull down/up, or tap to toggle map view) */}
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onClick={handleToggleMap}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isDragging ? "grabbing" : "grab",
                        userSelect: "none",
                        touchAction: "none",
                        padding: "4px 16px 10px",
                        gap: 6,
                    }}
                    title={isMapCollapsed ? "Нажмите, чтобы развернуть карту" : "Нажмите или потяните, чтобы свернуть карту"}
                >
                    {/* Drag handle line (42x4 px, centered) */}
                    <div
                        style={{
                            width: 42,
                            height: 4,
                            backgroundColor: isDragging ? "#94A3B8" : "#CBD5E1",
                            borderRadius: 2,
                            transition: "background-color 0.15s ease, transform 0.15s ease",
                            transform: isDragging ? "scaleX(1.2)" : "scaleX(1)",
                        }}
                    />

                    {/* Dynamic Status / Action Hint */}
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isMapCollapsed ? "#0284C7" : "#94A3B8",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "color 0.15s ease",
                        }}
                    >
                        {isMapCollapsed ? (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="18 15 12 9 6 15" />
                                </svg>
                                <span>Развернуть карту</span>
                            </>
                        ) : (
                            <span>Потяните вверх или прокрутите для каталога</span>
                        )}
                    </div>
                </div>

                {/* Sticky Search & Filters Header Bar inside the Sheet */}
                <div
                    style={{
                        position: "sticky",
                        top: 60,
                        zIndex: 25,
                        backgroundColor: "#F6F6F6",
                        paddingTop: 4,
                        paddingBottom: 4,
                        boxShadow: scrollY > 480 ? "0 4px 12px rgba(0, 0, 0, 0.05)" : "none",
                        transition: "box-shadow 0.2s ease",
                    }}
                >

                {/* Search Bar (328 px / padding 16px, height 44 px, rounded 8px, white bg) */}
                <div style={{ padding: "0 16px", marginBottom: 12 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: 44,
                            backgroundColor: "#FFFFFF",
                            borderRadius: 8,
                            padding: "0 12px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                            border: "1px solid #E2E8F0",
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94A3B8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0, marginRight: 8 }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по профессиям, маркам, услугам"
                            style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                fontSize: 13,
                                color: "#1E293B",
                                backgroundColor: "transparent",
                            }}
                        />

                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#94A3B8",
                                    cursor: "pointer",
                                    padding: 4,
                                    fontSize: 16,
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Strip (Horizontal row: Все 12, Открыто сейчас, Радиус 5 км, Частные 4, ...) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        overflowX: "auto",
                        padding: "0 16px 12px",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    {/* "Все" Filter pill */}
                    <button
                        type="button"
                        onClick={() => handleCategoryFilterClick("all")}
                        style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            border: "none",
                            backgroundColor: selectedCategory === "all" ? "#1E293B" : "#FFFFFF",
                            color: selectedCategory === "all" ? "#FFFFFF" : "#475569",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        Все {totalCount}
                    </button>

                    {/* "Открыто сейчас" Filter pill */}
                    <button
                        type="button"
                        onClick={() => setOnlyAvailable(!onlyAvailable)}
                        style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 500,
                            border: onlyAvailable ? "1.5px solid #16A34A" : "1px solid #E2E8F0",
                            backgroundColor: onlyAvailable ? "#DCFCE7" : "#FFFFFF",
                            color: onlyAvailable ? "#15803D" : "#475569",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        Открыто сейчас
                    </button>

                    {/* "Радиус 5 км ∨" Filter pill */}
                    <button
                        type="button"
                        onClick={() => setIsRadiusPickerOpen(true)}
                        style={{
                            height: 32,
                            padding: "0 10px 0 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 500,
                            border: "1px solid #E2E8F0",
                            backgroundColor: "#FFFFFF",
                            color: "#475569",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        Радиус {radius} км
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {/* Category pills with counts */}
                    {FIGMA_CATEGORIES.map((cat) => {
                        const count = providersByType[cat.type].length;
                        const isSelected = selectedCategory === cat.type;
                        return (
                            <button
                                key={cat.type}
                                type="button"
                                onClick={() => handleCategoryFilterClick(cat.type)}
                                style={{
                                    height: 32,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: isSelected ? 600 : 500,
                                    border: isSelected ? "none" : "1px solid #E2E8F0",
                                    backgroundColor: isSelected ? "#1E293B" : "#FFFFFF",
                                    color: isSelected ? "#FFFFFF" : "#475569",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                                }}
                            >
                                {cat.chip} {count}
                            </button>
                        );
                    })}
                </div>
            </div>

                {/* 5. Four Category Sections vertically */}
                <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 8 }}>
                    {categoriesToRender.map((category) => {
                        const providers = providersByType[category.type];

                        return (
                            <section
                                key={category.type}
                                ref={categoryRefs[category.type]}
                                style={{ display: "flex", flexDirection: "column" }}
                            >
                                {/* Category Header */}
                                <div
                                    style={{
                                        padding: "0 16px",
                                        marginBottom: 12,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                    }}
                                >
                                    <h2
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: "#0F172A",
                                            margin: 0,
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        {category.title}
                                    </h2>
                                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                                        {providers.length} предл.
                                    </span>
                                </div>

                                {/* Horizontal Scroll Track with Partial Next Card Peek */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 16,
                                        overflowX: "auto",
                                        padding: "4px 16px 12px",
                                        scrollbarWidth: "none",
                                        msOverflowStyle: "none",
                                        WebkitOverflowScrolling: "touch",
                                    }}
                                >
                                    {providers.length > 0 ? (
                                        providers.map((p) => {
                                            if (category.type === ActivityType.master) {
                                                return (
                                                    <FigmaMasterCard
                                                        key={p.id}
                                                        provider={p}
                                                        onCall={handleCall}
                                                        onChat={handleChat}
                                                        onClick={() => navigate(`/master-details?id=${p.id}`)}
                                                    />
                                                );
                                            }

                                            return (
                                                <FigmaOrgCard
                                                    key={p.id}
                                                    provider={p}
                                                    categoryType={category.type}
                                                    onBook={handleOpenBooking}
                                                    onCall={handleCall}
                                                    onChat={handleChat}
                                                    onClick={() => navigate(`/provider?id=${p.id}&type=${category.type}`)}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div
                                            style={{
                                                backgroundColor: "#FFFFFF",
                                                borderRadius: 12,
                                                padding: "24px 20px",
                                                color: "#64748B",
                                                fontSize: 13,
                                                width: "calc(100% - 32px)",
                                                border: "1px dashed #CBD5E1",
                                                textAlign: "center",
                                            }}
                                        >
                                            {category.empty}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>

            {/* Online Booking Modal */}
            <BookingModal
                isOpen={bookingModalOpen}
                provider={selectedBookingProvider}
                onClose={() => {
                    setBookingModalOpen(false);
                    setSelectedBookingProvider(null);
                }}
            />

            {/* Radius Picker Modal */}
            <RadiusPickerModal
                open={isRadiusPickerOpen}
                currentRadius={radius}
                onSelectRadius={(newRadius: number) => {
                    setParam("radius", String(newRadius));
                    setIsRadiusPickerOpen(false);
                }}
                onClose={() => setIsRadiusPickerOpen(false)}
            />

            {/* Create Order Modal (retained for custom tender workflow) */}
            <CreateOrderModal
                open={isCreateOrderOpen}
                onClose={() => setIsCreateOrderOpen(false)}
                providers={filteredProviders}
            />
        </div>
    );
}
