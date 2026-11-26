import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";

import { Filters, GeolocationPrompt, MasterStatus } from "@modules/masters";
import {
    ActivityType,
    DEFAULT_SEARCH_RADIUS,
    Provider,
    ProvidersMap,
} from "@modules/providers";
import { AppActivityTypes } from "@modules/providers/features/ActivityTypeFilters/constants";
import { fetchCombinedProviders } from "@modules/providers/api";
import { CreateOrderModal } from "@modules/masters/features/CreateOrderModal";
import { ProviderShowcaseCard } from "@modules/providers/features/ProviderShowcaseCard";
import { Button, ErrorState } from "@common/components";
import { LogoIcon } from "@common/icons";
import { useAuth, useCoords, useQueryParams, useUserProfile } from "@common/hooks";
import { NotificationBell } from "../../components/NotificationBell";
import { StoryRing, StoryStrip } from "@modules/stories";
import { getAccountAvatars } from "@modules/media/api";
import { RadiusPickerModal } from "./components/RadiusPickerModal";
import {
    MobileSearchExperience,
    MobileProviderCategory,
} from "./MobileSearchExperience";
import { COMPACT_LAYOUT_MEDIA_QUERY } from "@modules/layout/features/layoutViewport";
import {
    ActivityChip,
    AvailableToggle,
    BrandLogo,
    BrandMark,
    CarouselHead,
    CarouselMeta,
    CarouselSection,
    CarouselTitle,
    CarouselTrack,
    ContentFlow,
    EmptyCard,
    ErrorWrapper,
    FiltersStrip,
    HeroCopy,
    HeroGrid,
    HeroMapCard,
    HomeShell,
    LoadingPanel,
    MapAttentionMarker,
    MapWrapper,
    PageRoot,
    ProfileButton,
    RadiusFilterButton,
    SearchPanel,
    TenderBarActions,
    TenderBarBadge,
    TenderBarHeader,
    TenderBarInfo,
    TenderCloseButtonDesktop,
    TenderCloseButtonMobile,
    TenderFloatingBar,
    TopActions,
    TopActionTile,
    TopBar,
} from "./styles";

type ProviderCategory = {
    type: ActivityType;
    title: string;
    chip: string;
    empty: string;
};

const PROVIDER_CATEGORIES: ProviderCategory[] = [
    {
        type: ActivityType.master,
        title: "Частные исполнители",
        chip: "Исполнители",
        empty: "Пока нет частных исполнителей в выбранном радиусе.",
    },
    {
        type: ActivityType.auto_service,
        title: "Автосервисы",
        chip: "Автосервисы",
        empty: "Автосервисы не найдены. Попробуйте увеличить радиус.",
    },
    {
        type: ActivityType.auto_wash,
        title: "Автомойки",
        chip: "Автомойки",
        empty: "Автомоек рядом пока не найдено.",
    },
    {
        type: ActivityType.auto_shop,
        title: "Автомагазины",
        chip: "Магазины",
        empty: "Автомагазинов рядом пока не найдено.",
    },
];

const DEFAULT_CENTER: [number, number] = [43.21564479600424, 46.89458462676669];
const MAP_FOCUS_ZOOM = 17;
const MAP_FOCUS_DURATION = 650;
const MAP_SCROLL_FOCUS_MAX_WAIT = 1800;
const MAP_SCROLL_STABLE_FRAMES = 6;
const MAP_ATTENTION_AFTER_FOCUS_DELAY = 120;
const MAP_ATTENTION_VISIBLE_DURATION = 1280;

function isElementFocusedInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();

    if (rect.height <= 0 || rect.width <= 0) {
        return false;
    }

    const elementCenter = rect.top + rect.height / 2;
    const hasVisibleCenter =
        elementCenter >= 0 && elementCenter <= window.innerHeight;
    const isMostlyOnscreen =
        rect.top <= window.innerHeight * 0.72 &&
        rect.bottom >= window.innerHeight * 0.28;

    return hasVisibleCenter || isMostlyOnscreen;
}

function normalizeActivityTypes(value: unknown): ActivityType[] {
    if (!value) {
        return [];
    }

    const rawValue = Array.isArray(value) ? value.join(",") : String(value);
    return rawValue
        .split(",")
        .filter((type): type is ActivityType =>
            Object.values(ActivityType).includes(type as ActivityType)
        )
        .sort();
}

function getProviderText(provider: Provider): string {
    return [
        provider.fullName,
        provider.name,
        provider.businessName,
        provider.address,
        provider.description,
        ...(provider.professions || []),
        ...(provider.services || []),
        ...(provider.autoMarks || []),
        ...(provider.brandSupport || []),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function filterByQuery(providers: Provider[], query: string[]): Provider[] {
    const terms = query.map((item) => item.trim().toLowerCase()).filter(Boolean);

    if (terms.length === 0) {
        return providers;
    }

    return providers.filter((provider) => {
        const haystack = getProviderText(provider);
        return terms.every((term) => haystack.includes(term));
    });
}

function countAvailable(providers: Provider[]): number {
    return providers.reduce((count, provider) => {
        const visibleStatus = provider.currentStatus || provider.status;
        return visibleStatus === MasterStatus.AVAILABLE ? count + 1 : count;
    }, 0);
}

function getInitials(name?: string | null): string {
    if (!name) {
        return "AG";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}


interface ProviderCardProps {
    provider: Provider;
    onShowOnMap: (provider: Provider) => void;
    onOpenProfile: (provider: Provider) => void;
    isCarouselItem?: boolean;
}

const ProviderCard = ({
    provider,
    onShowOnMap,
    onOpenProfile,
    isCarouselItem = false,
}: ProviderCardProps) => {
    return (
        <div
            style={{
                position: 'relative',
                borderRadius: '16px',
                flex: isCarouselItem ? '0 0 auto' : undefined,
                width: isCarouselItem ? 'fit-content' : undefined,
                marginInline: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <ProviderShowcaseCard
                provider={provider}
                onShowOnMap={onShowOnMap}
                onOpenProfile={onOpenProfile}
            />
        </div>
    );
};

export const MainpPageScreen = () => {

    const [query, setQuery] = useState<string[]>([]);
    const [onlyAvailable, setOnlyAvailable] = useState(false);
    const [isRadiusPickerOpen, setIsRadiusPickerOpen] = useState(false);
    const [isMapAttentionVisible, setIsMapAttentionVisible] = useState(false);
    const [mapAttentionKey, setMapAttentionKey] = useState(0);
    const mastersRef = useRef<Record<string, any>>({});
    const mapRef = useRef<HTMLDivElement>(null);
    const yandexMapRef = useRef<any>(null);
    const mapAttentionTimeoutRef = useRef<number | null>(null);
    const mapFocusFrameRef = useRef<number | null>(null);
    const navigate = useNavigate();
    const isCompact = useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY);
    const { isAuthenticated } = useAuth();
    const { profile } = useUserProfile({ enabled: isAuthenticated });
    const { data: profileAvatars = {} } = useQuery({
        queryKey: ["account-avatar", profile?.id],
        queryFn: () => getAccountAvatars([profile!.id]),
        enabled: Boolean(isAuthenticated && profile?.id),
        staleTime: 5 * 60_000,
    });
    const { userCoords } = useCoords();
    const { params, setParam } = useQueryParams();

    const [lat, lng] = userCoords ?? DEFAULT_CENTER;
    const profileAvatarUrl = profile?.master
        ? profileAvatars[profile.id]
        : profile?.autoService?.coverImageUrl
            ?? profile?.autoWash?.coverImageUrl
            ?? profile?.autoShop?.coverImageUrl
            ?? profileAvatars[profile?.id ?? ""];
    const radius = params.radius
        ? parseFloat(params.radius as string)
        : DEFAULT_SEARCH_RADIUS;

    const selectedActivityTypes = useMemo(
        () => normalizeActivityTypes(params.activityTypes),
        [params.activityTypes]
    );

    const activeTypes = useMemo(
        () =>
            selectedActivityTypes.length > 0
                ? selectedActivityTypes
                : (AppActivityTypes as ActivityType[]),
        [selectedActivityTypes]
    );

    const isAllTypesActive = selectedActivityTypes.length === 0;

    const { data, isLoading, error, isError, refetch } = useQuery({
        queryKey: [
            "combined-providers",
            lat,
            lng,
            radius,
        ],
        queryFn: () => fetchCombinedProviders(lat, lng, radius),
        enabled: true,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const personalAvatarIds = useMemo(
        () => Array.from(new Set((data?.allProviders ?? [])
            .filter((provider) => (provider.activityType || ActivityType.master) === ActivityType.master)
            .map((provider) => provider.userId)
            .filter(Boolean))),
        [data?.allProviders]
    );
    const { data: personalProviderAvatars = {} } = useQuery({
        queryKey: ["provider-account-avatars", personalAvatarIds],
        queryFn: () => getAccountAvatars(personalAvatarIds),
        enabled: personalAvatarIds.length > 0,
        staleTime: 5 * 60_000,
    });
    const withPersonalMasterAvatars = useCallback((providers: Provider[]) => providers.map((provider) => {
        if ((provider.activityType || ActivityType.master) !== ActivityType.master) return provider;
        return { ...provider, avatarUrl: personalProviderAvatars[provider.userId] ?? undefined };
    }), [personalProviderAvatars]);

    const nearbyAfterSearch = useMemo(
        () => filterByQuery(withPersonalMasterAvatars(data?.nearbyProviders ?? []), query),
        [data?.nearbyProviders, query, withPersonalMasterAvatars]
    );

    const allAfterSearch = useMemo(
        () => filterByQuery(withPersonalMasterAvatars(data?.allProviders ?? []), query),
        [data?.allProviders, query, withPersonalMasterAvatars]
    );

    const filteredNearbyProviders = useMemo(
        () =>
            nearbyAfterSearch.filter((provider) =>
                activeTypes.includes(provider.activityType || ActivityType.master)
            ).filter((provider) =>
                !onlyAvailable ||
                (provider.currentStatus || provider.status) === MasterStatus.AVAILABLE
            ),
        [activeTypes, nearbyAfterSearch, onlyAvailable]
    );

    const filteredAllProviders = useMemo(
        () =>
            allAfterSearch.filter((provider) =>
                activeTypes.includes(provider.activityType || ActivityType.master)
            ).filter((provider) =>
                !onlyAvailable ||
                (provider.currentStatus || provider.status) === MasterStatus.AVAILABLE
            ),
        [activeTypes, allAfterSearch, onlyAvailable]
    );

    const providersByType = useMemo(() => {
        return PROVIDER_CATEGORIES.reduce(
            (acc, category) => {
                acc[category.type] = filteredNearbyProviders.filter(
                    (provider) =>
                        (provider.activityType || ActivityType.master) ===
                        category.type
                );
                return acc;
            },
            {} as Record<ActivityType, Provider[]>
        );
    }, [filteredNearbyProviders]);

    const countsByType = useMemo(() => {
        return PROVIDER_CATEGORIES.reduce(
            (acc, category) => {
                acc[category.type] = filteredNearbyProviders.filter(
                    (provider) =>
                        (provider.activityType || ActivityType.master) ===
                        category.type
                ).length;
                return acc;
            },
            {} as Record<ActivityType, number>
        );
    }, [filteredNearbyProviders]);

    const categoriesToRender = useMemo(
        () =>
            PROVIDER_CATEGORIES.filter((category) =>
                activeTypes.includes(category.type)
            ),
        [activeTypes]
    );

    const availableCount = countAvailable(filteredNearbyProviders);

    const clearMapAttentionTimers = useCallback(() => {
        if (mapAttentionTimeoutRef.current !== null) {
            window.clearTimeout(mapAttentionTimeoutRef.current);
            mapAttentionTimeoutRef.current = null;
        }

        if (mapFocusFrameRef.current !== null) {
            window.cancelAnimationFrame(mapFocusFrameRef.current);
            mapFocusFrameRef.current = null;
        }
    }, []);

    const hideMapAttention = useCallback(() => {
        clearMapAttentionTimers();
        setIsMapAttentionVisible(false);
    }, [clearMapAttentionTimers]);

    const showMapAttention = useCallback(() => {
        if (mapAttentionTimeoutRef.current !== null) {
            window.clearTimeout(mapAttentionTimeoutRef.current);
        }

        setMapAttentionKey((key) => key + 1);
        setIsMapAttentionVisible(true);
        mapAttentionTimeoutRef.current = window.setTimeout(() => {
            setIsMapAttentionVisible(false);
            mapAttentionTimeoutRef.current = null;
        }, MAP_ATTENTION_VISIBLE_DURATION);
    }, []);

    const focusMapOnCoordinates = useCallback((coordinates: [number, number]) => {
        try {
            yandexMapRef.current?.container?.fitToViewport?.();
            yandexMapRef.current?.setCenter(coordinates, MAP_FOCUS_ZOOM, {
                duration: MAP_FOCUS_DURATION,
                checkZoomRange: true,
            });
        } catch (_) {
            try {
                yandexMapRef.current?.setCenter(coordinates, MAP_FOCUS_ZOOM);
            } catch (_) {}
        }
    }, []);

    const scheduleMapAttentionAfterFocus = useCallback(
        (coordinates: [number, number]) => {
            const mapElement = mapRef.current;

            if (!mapElement) {
                focusMapOnCoordinates(coordinates);
                mapAttentionTimeoutRef.current = window.setTimeout(() => {
                    showMapAttention();
                }, MAP_FOCUS_DURATION + MAP_ATTENTION_AFTER_FOCUS_DELAY);
                return;
            }

            const startedAt = window.performance.now();
            let lastScrollY = window.scrollY;
            let stableFrames = 0;

            const waitForMapFocus = () => {
                const now = window.performance.now();
                const currentScrollY = window.scrollY;
                const scrollDelta = Math.abs(currentScrollY - lastScrollY);

                stableFrames =
                    scrollDelta < 1 ? stableFrames + 1 : 0;
                lastScrollY = currentScrollY;

                const elapsed = now - startedAt;
                const isMapFocused = isElementFocusedInViewport(mapElement);
                const isScrollSettled =
                    stableFrames >= MAP_SCROLL_STABLE_FRAMES;
                const isMapMoveSettled = elapsed >= MAP_FOCUS_DURATION;
                const timedOut = elapsed >= MAP_SCROLL_FOCUS_MAX_WAIT;

                if (
                    (isMapFocused && isScrollSettled && isMapMoveSettled) ||
                    timedOut
                ) {
                    mapFocusFrameRef.current = null;
                    focusMapOnCoordinates(coordinates);
                    mapAttentionTimeoutRef.current = window.setTimeout(() => {
                        showMapAttention();
                    }, MAP_FOCUS_DURATION + MAP_ATTENTION_AFTER_FOCUS_DELAY);
                    return;
                }

                mapFocusFrameRef.current =
                    window.requestAnimationFrame(waitForMapFocus);
            };

            mapFocusFrameRef.current = window.requestAnimationFrame(waitForMapFocus);
        },
        [focusMapOnCoordinates, showMapAttention]
    );

    useEffect(() => {
        return () => {
            clearMapAttentionTimers();
        };
    }, [clearMapAttentionTimers]);

    const handleProviderClick = useCallback((provider: Provider) => {
        const coordinates: [number, number] = [
            provider.coordinates.x,
            provider.coordinates.y,
        ];

        hideMapAttention();

        if (isCompact) {
            focusMapOnCoordinates(coordinates);
        } else {
            mapRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }

        scheduleMapAttentionAfterFocus(coordinates);
    }, [focusMapOnCoordinates, hideMapAttention, isCompact, scheduleMapAttentionAfterFocus]);

    const handleProviderProfileClick = useCallback((provider: Provider) => {
        const type = provider.activityType || ActivityType.master;
        navigate(`/provider?id=${encodeURIComponent(provider.id)}&type=${encodeURIComponent(type)}`);
    }, [navigate]);

    const handleAllTypesClick = useCallback(() => {
        setParam("activityTypes", null);
    }, [setParam]);

    const handleActivityTypeClick = useCallback(
        (type: ActivityType) => {
            if (isAllTypesActive) {
                setParam("activityTypes", type);
                return;
            }

            const next = activeTypes.includes(type)
                ? activeTypes.filter((item) => item !== type)
                : [...activeTypes, type];

            setParam(
                "activityTypes",
                next.length === 0 || next.length === AppActivityTypes.length
                    ? null
                    : next.join(",")
            );
        },
        [activeTypes, isAllTypesActive, setParam]
    );


    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const tenderMode = false;
    const selectedProviders: Provider[] = [];
    const showTenderHint = false;
    const setTenderMode = (_value: boolean) => undefined;
    const setSelectedProviders = (_value: Provider[]) => undefined;
    const handleSelectAllInRadius = () => undefined;
    const handleDeselectAll = () => undefined;
    const handleDismissHintPermanently = () => undefined;

    const providersErrorMessage = useMemo(() => {
        if (!error) {
            return "Не удалось загрузить список специалистов.";
        }

        if (isAxiosError(error) && error.code === "ERR_NETWORK") {
            return "Не удалось подключиться к серверу. Проверьте, что backend запущен и доступен на порту 3001.";
        }

        return "Не удалось загрузить список специалистов. Попробуйте обновить страницу.";
    }, [error]);

    const mobileCategories = useMemo<MobileProviderCategory[]>(() => {
        const order = [
            ActivityType.master,
            ActivityType.auto_service,
            ActivityType.auto_wash,
            ActivityType.auto_shop,
        ];
        return categoriesToRender
            .slice()
            .sort((left, right) => order.indexOf(left.type) - order.indexOf(right.type))
            .map(({ type, title, empty }) => ({ type, title, empty }));
    }, [categoriesToRender]);

    if (isCompact) {
        return (
            <MobileSearchExperience
                query={query}
                onQueryChange={setQuery}
                onlyAvailable={onlyAvailable}
                onOnlyAvailableChange={setOnlyAvailable}
                isRadiusPickerOpen={isRadiusPickerOpen}
                onRadiusPickerOpen={() => setIsRadiusPickerOpen(true)}
                onRadiusPickerClose={() => setIsRadiusPickerOpen(false)}
                onRadiusChange={(nextRadius) => {
                    setParam("radius", nextRadius);
                    setIsRadiusPickerOpen(false);
                }}
                radius={radius}
                activeTypes={activeTypes}
                isAllTypesActive={isAllTypesActive}
                onAllTypesClick={handleAllTypesClick}
                onActivityTypeClick={handleActivityTypeClick}
                categories={mobileCategories}
                providersByType={providersByType}
                countsByType={countsByType}
                totalNearbyCount={filteredNearbyProviders.length}
                filteredAllProviders={filteredAllProviders}
                isLoading={isLoading}
                isError={Boolean(isError && !data)}
                errorMessage={providersErrorMessage}
                onRetry={() => void refetch()}
                onShowOnMap={handleProviderClick}
                onOpenProfile={handleProviderProfileClick}
                onFocusMap={focusMapOnCoordinates}
                userCoords={userCoords}
                mastersRef={mastersRef}
                mapInstanceRef={yandexMapRef}
                mapRef={mapRef}
                isMapAttentionVisible={isMapAttentionVisible}
                mapAttentionKey={mapAttentionKey}
                isAuthenticated={isAuthenticated}
                profileName={profile?.name}
                profileAvatarUrl={profileAvatarUrl ?? undefined}
            />
        );
    }

    return (
        <PageRoot>
            <HomeShell>
                <TopBar>
                    <BrandMark href="/" aria-label="Автогис">
                        <BrandLogo src={LogoIcon} alt="Автогис" />
                    </BrandMark>
                    <TopActions>
                        {isAuthenticated && profile && (
                            <TopActionTile>
                                <NotificationBell
                                    isAdmin={
                                        profile.role === "admin"
                                    }
                                />
                            </TopActionTile>
                        )}
                        {isAuthenticated ? (
                            <TopActionTile $profile>
                                <StoryRing authorId={profile?.id} size={40}>
                                    <ProfileButton
                                        aria-label="Профиль"
                                        onClick={() => navigate("/cabinet")}
                                        $hasAvatar={Boolean(profileAvatarUrl)}
                                        $square
                                    >
                                        {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(profile?.name)}
                                    </ProfileButton>
                                </StoryRing>
                            </TopActionTile>
                        ) : (
                            <ProfileButton
                                aria-label="Войти в профиль"
                                onClick={() => navigate("/login")}
                            >
                                Войти
                            </ProfileButton>
                        )}
                    </TopActions>
                </TopBar>
                {isAuthenticated && <StoryStrip />}
                <div
                    style={{
                        margin: '12px 0 20px',
                        display: 'none',
                        padding: '16px 20px',
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: tenderMode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        boxShadow: tenderMode
                            ? '0 8px 24px rgba(37, 99, 235, 0.1)'
                            : '0 1px 3px rgba(0, 0, 0, 0.04)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                userSelect: 'none',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={tenderMode}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setTenderMode(checked);
                                    if (!checked) setSelectedProviders([]);
                                }}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer',
                                    accentColor: '#2563eb',
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '16px', color: '#111827' }}>
                                    Режим Мульти-рассылки
                                </strong>
                                {tenderMode && (
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: '#dbeafe',
                                            color: '#1d4ed8',
                                            letterSpacing: '0.02em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: '#2563eb',
                                            }}
                                        />
                                        Активен
                                    </span>
                                )}
                            </div>
                        </label>

                        {tenderMode && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    onClick={handleSelectAllInRadius}
                                >
                                    Выбрать всех в радиусе ({filteredNearbyProviders?.length ?? 0})
                                </Button>
                                {selectedProviders.length > 0 && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleDeselectAll}
                                    >
                                        Сбросить
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    disabled={selectedProviders.length === 0}
                                    onClick={() => setIsCreateOrderOpen(true)}
                                >
                                    Отправить заявку ({selectedProviders.length})
                                </Button>
                            </div>
                        )}
                    </div>

                    {tenderMode && showTenderHint && (
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '10px 14px',
                                background: '#eff6ff',
                                borderRadius: '12px',
                                border: '1px solid #bfdbfe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                                <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
                                <div style={{ fontSize: '13px', lineHeight: 1.45, color: '#1e3a8a' }}>
                                    <strong>Мульти-рассылка:</strong> нажимайте на карточки мастеров или «Выбрать всех», чтобы отправить заявку сразу нескольким специалистам.
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                    type="button"
                                    onClick={handleDismissHintPermanently}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#2563eb',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        whiteSpace: 'nowrap',
                                        transition: 'background-color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    Не показывать больше
                                </button>
                            </div>
                        </div>
                    )}
                </div>


                {isError && !data ? (
                    <ErrorWrapper>
                        <ErrorState
                            message={providersErrorMessage}
                            onRetry={() => {
                                void refetch();
                            }}
                        />
                    </ErrorWrapper>
                ) : (
                    <>
                        <HeroGrid>
                            <HeroCopy>
                                <SearchPanel>
                                    <Filters
                                        query={query}
                                        onChange={(next) =>
                                            setQuery(next.query)
                                        }
                                    />
                                </SearchPanel>
                            </HeroCopy>

                            <HeroMapCard ref={mapRef}>
                                <MapWrapper>
                                    <ProvidersMap
                                        masters={filteredAllProviders}
                                        mastersRef={mastersRef}
                                        mapInstanceRef={yandexMapRef}
                                        height="418px"
                                    />
                                    {isMapAttentionVisible && (
                                        <MapAttentionMarker
                                            key={mapAttentionKey}
                                            aria-hidden="true"
                                        />
                                    )}
                                </MapWrapper>
                            </HeroMapCard>
                        </HeroGrid>

                        <FiltersStrip>
                            <ActivityChip
                                $isActive={isAllTypesActive}
                                onClick={handleAllTypesClick}
                            >
                                Все
                                <span>{filteredNearbyProviders.length}</span>
                            </ActivityChip>
                            {PROVIDER_CATEGORIES.map((category) => (
                                <ActivityChip
                                    key={category.type}
                                    $isActive={
                                        !isAllTypesActive &&
                                        activeTypes.includes(category.type)
                                    }
                                    onClick={() =>
                                        handleActivityTypeClick(category.type)
                                    }
                                >
                                    {category.chip}
                                    <span>{countsByType[category.type] || 0}</span>
                                </ActivityChip>
                            ))}
                            <AvailableToggle
                                type="button"
                                $isActive={onlyAvailable}
                                aria-pressed={onlyAvailable}
                                onClick={() => setOnlyAvailable((value) => !value)}
                            >
                                <span>Доступны сейчас</span>
                            </AvailableToggle>
                            <RadiusFilterButton
                                type="button"
                                onClick={() => setIsRadiusPickerOpen(true)}
                                aria-label={`Изменить радиус поиска, сейчас ${radius} километров`}
                            >
                                Радиус: {radius} км
                            </RadiusFilterButton>
                        </FiltersStrip>

                        {isLoading ? (
                            <LoadingPanel>Загрузка предложений...</LoadingPanel>
                        ) : (
                            <ContentFlow>
                                {categoriesToRender.map((category) => {
                                    const providers =
                                        providersByType[category.type] || [];
                                    const categoryAvailable =
                                        countAvailable(providers);

                                    return (
                                        <CarouselSection key={category.type}>
                                            <CarouselHead>
                                                <CarouselTitle>
                                                    {category.title}
                                                </CarouselTitle>
                                                <CarouselMeta>
                                                    {providers.length} рядом ·{" "}
                                                    {categoryAvailable} доступно
                                                </CarouselMeta>
                                            </CarouselHead>
                                            <CarouselTrack>
                                                {providers.length > 0 ? (
                                                    providers.map((provider) => {
                                                        return (
                                                            <ProviderCard
                                                                key={`${provider.activityType}-${provider.id}`}
                                                                provider={provider}
                                                                onShowOnMap={handleProviderClick}
                                                                onOpenProfile={handleProviderProfileClick}
                                                                isCarouselItem
                                                            />
                                                        );
                                                    })
                                                ) : (
                                                    <EmptyCard>
                                                        {category.empty}
                                                    </EmptyCard>
                                                )}
                                            </CarouselTrack>
                                        </CarouselSection>
                                    );
                                })}

                            </ContentFlow>
                        )}
                    </>
                )}
            </HomeShell>

            {tenderMode && selectedProviders.length > 0 && (
                <TenderFloatingBar>
                    <TenderBarHeader>
                        <TenderBarInfo>
                            <TenderBarBadge>
                                {selectedProviders.length}
                            </TenderBarBadge>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                    {selectedProviders.length > 0
                                        ? `Выбрано: ${selectedProviders.length} ${
                                              selectedProviders.length === 1
                                                  ? 'мастер'
                                                  : selectedProviders.length < 5
                                                  ? 'мастера'
                                                  : 'мастеров'
                                          }`
                                        : 'Мастера не выбраны'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {selectedProviders.length > 0
                                        ? 'Нажмите «Отправить заявку»'
                                        : 'Нажимайте на карточки для выбора'}
                                </div>
                            </div>
                        </TenderBarInfo>

                        <TenderCloseButtonMobile
                            type="button"
                            onClick={() => {
                                setTenderMode(false);
                                setSelectedProviders([]);
                            }}
                            title="Выйти из режима мульти-рассылки"
                        >
                            ✕
                        </TenderCloseButtonMobile>
                    </TenderBarHeader>

                    <TenderBarActions>
                        {selectedProviders.length > 0 ? (
                            <Button
                                variant="outlined"
                                onClick={handleDeselectAll}
                            >
                                Сбросить
                            </Button>
                        ) : (
                            <Button
                                variant="outlined"
                                onClick={handleSelectAllInRadius}
                            >
                                Выбрать всех
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            disabled={selectedProviders.length === 0}
                            onClick={() => setIsCreateOrderOpen(true)}
                        >
                            Отправить ({selectedProviders.length})
                        </Button>
                        <TenderCloseButtonDesktop
                            type="button"
                            onClick={() => {
                                setTenderMode(false);
                                setSelectedProviders([]);
                            }}
                            title="Выйти из режима мульти-рассылки"
                        >
                            ✕
                        </TenderCloseButtonDesktop>
                    </TenderBarActions>
                </TenderFloatingBar>
            )}
            <GeolocationPrompt />

            <RadiusPickerModal
                open={isRadiusPickerOpen}
                currentRadius={radius}
                onClose={() => setIsRadiusPickerOpen(false)}
                onSelectRadius={(nextRadius) => setParam("radius", nextRadius)}
            />

            {isCreateOrderOpen && selectedProviders.length > 0 && (
                <CreateOrderModal
                    open={isCreateOrderOpen}
                    onClose={() => setIsCreateOrderOpen(false)}
                    onSuccess={() => {
                        setSelectedProviders([]);
                        setTenderMode(false);
                    }}
                    providers={selectedProviders}
                />
            )}
        </PageRoot>

    );
};
