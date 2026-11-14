import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import { styled } from "styled-components";

import { Filters, MasterStatus } from "@modules/masters";
import { ActivityType, Provider, ProvidersMap } from "@modules/providers";
import { StoryStrip } from "@modules/stories";
import { ErrorState } from "@common/components";
import { LogoIcon, MapPinIcon, PhoneIcon, StarIcon } from "@common/icons";
import { RadiusPickerModal } from "./components/RadiusPickerModal";

export type MobileProviderCategory = {
    type: ActivityType;
    title: string;
    empty: string;
};

type Props = {
    query: string[];
    onQueryChange: (query: string[]) => void;
    onlyAvailable: boolean;
    onOnlyAvailableChange: (value: boolean) => void;
    isRadiusPickerOpen: boolean;
    onRadiusPickerOpen: () => void;
    onRadiusPickerClose: () => void;
    onRadiusChange: (radius: number) => void;
    radius: number;
    activeTypes: ActivityType[];
    isAllTypesActive: boolean;
    onAllTypesClick: () => void;
    onActivityTypeClick: (type: ActivityType) => void;
    categories: MobileProviderCategory[];
    providersByType: Record<ActivityType, Provider[]>;
    countsByType: Record<ActivityType, number>;
    totalNearbyCount: number;
    filteredAllProviders: Provider[];
    isLoading: boolean;
    isError: boolean;
    errorMessage: string;
    onRetry: () => void;
    onShowOnMap: (provider: Provider) => void;
    onOpenProfile: (provider: Provider) => void;
    onFocusMap: (coordinates: [number, number]) => void;
    userCoords?: [number, number] | null;
    mastersRef: React.MutableRefObject<Record<string, any>>;
    mapInstanceRef: React.MutableRefObject<any | null>;
    mapRef: React.RefObject<HTMLDivElement>;
    isMapAttentionVisible: boolean;
    mapAttentionKey: number;
    isAuthenticated: boolean;
    profileName?: string | null;
    profileAvatarUrl?: string;
};

const SNAP_REFERENCE_TOPS = [80, 304, 519, 671] as const;
const StableProvidersMap = React.memo(ProvidersMap);

function getInitials(name?: string | null): string {
    if (!name?.trim()) return "AG";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function getProviderType(provider: Provider): ActivityType {
    return provider.activityType || ActivityType.master;
}

function getProviderName(provider: Provider): string {
    return (
        provider.fullName ||
        provider.businessName ||
        provider.name ||
        (getProviderType(provider) === ActivityType.master ? "Мастер" : "Организация")
    );
}

function isMasterProvider(provider: Provider): boolean {
    return getProviderType(provider) === ActivityType.master;
}

function getStatus(provider: Provider): "open" | "closed" {
    return (provider.currentStatus || provider.status) === MasterStatus.AVAILABLE
        ? "open"
        : "closed";
}

function formatDistance(distance?: number): string {
    if (typeof distance !== "number" || !Number.isFinite(distance)) return "—";
    if (distance < 1000) return `${Math.max(1, Math.round(distance))} м`;
    return `${(distance / 1000).toFixed(1).replace(".0", "")} км`;
}

function getTags(provider: Provider): string[] {
    const tags = isMasterProvider(provider)
        ? [
              ...(provider.professions || []),
              ...(provider.services || []),
              ...(provider.autoMarks || []),
          ]
        : [...(provider.services || []), ...(provider.professions || [])];
    const normalized = Array.from(new Set(tags.filter(Boolean)));
    const visibleCount = 5;
    return normalized.length > visibleCount
        ? [...normalized.slice(0, visibleCount), `+${normalized.length - visibleCount}`]
        : normalized;
}

function shouldShowBooking(provider: Provider): boolean {
    const type = getProviderType(provider);
    return Boolean(provider.onlineBookingEnabled) &&
        !provider.liveQueueEnabled &&
        [ActivityType.master, ActivityType.auto_service, ActivityType.auto_wash].includes(type);
}

function getPhoneHref(provider: Provider): string {
    const phone = provider.workingPhone || provider.phone;
    return phone ? `tel:${phone}` : "#";
}

function getProviderProfileHref(provider: Provider): string {
    return `/provider?id=${encodeURIComponent(provider.id)}&type=${encodeURIComponent(getProviderType(provider))}`;
}

function MobileProviderCard({
    provider,
    onOpenProfile,
}: {
    provider: Provider;
    onOpenProfile: (provider: Provider) => void;
}) {
    const type = getProviderType(provider);
    const isMaster = isMasterProvider(provider);
    const name = getProviderName(provider);
    const status = getStatus(provider);
    const tags = getTags(provider);
    const coverUrl = provider.coverImageUrl || provider.coverImage;
    const avatarUrl = isMaster ? provider.avatarUrl : undefined;
    const booking = shouldShowBooking(provider);
    const rating = typeof provider.rating === "number" ? provider.rating.toFixed(1) : "0.0";
    const reviews = provider.reviewsCount || 0;

    const stopCardClick = (event: React.MouseEvent) => event.stopPropagation();
    const handleProfileLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.stopPropagation();
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpenProfile(provider);
    };

    return (
        <MobileCard
            $organization={!isMaster}
            onClick={() => onOpenProfile(provider)}
        >
            {isMaster ? (
                <MobileMasterBody>
                    <MobileMasterHeader>
                        <MobileAvatar $status={status}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={name} />
                            ) : (
                                <span>{getInitials(name)}</span>
                            )}
                            <MobileStatusDot $status={status} />
                        </MobileAvatar>
                        <MobileIdentity>
                            <MobileProviderName><MobileProfileLink href={getProviderProfileHref(provider)} onClick={handleProfileLinkClick}>{name}</MobileProfileLink></MobileProviderName>
                            <MobileMetaRow>
                                <MobileRating><StarIcon />{rating} <span>({reviews})</span></MobileRating>
                                <MobileDistance><MapPinIcon />{formatDistance(provider.distance)}</MobileDistance>
                            </MobileMetaRow>
                        </MobileIdentity>
                    </MobileMasterHeader>
                    <MobileMasterFieldGroup $afterHeader>
                        <MobileFieldTitle>График работы</MobileFieldTitle>
                        <MobileTagRow $compact>
                            <MobileStatusTag $status={status}>{status === "open" ? "Открыто" : "Закрыто"}</MobileStatusTag>
                            <MobileTag>Пн - Вс</MobileTag>
                            <MobileTag>{provider.workFrom && provider.workTo ? `${provider.workFrom.slice(0, 5)} - ${provider.workTo.slice(0, 5)}` : "8:00 - 19:00"}</MobileTag>
                        </MobileTagRow>
                    </MobileMasterFieldGroup>
                    <MobileMasterFieldGroup>
                        <MobileFieldTitle>Специализация</MobileFieldTitle>
                        <MobileTagRow $wrap $compact>
                            {(tags.length ? tags : ["Профиль заполняется"]).map((tag) => <MobileTag key={tag}>{tag}</MobileTag>)}
                        </MobileTagRow>
                    </MobileMasterFieldGroup>
                    <MobileActions>
                        <MobilePrimaryAction href={getPhoneHref(provider)} onClick={stopCardClick} $variant="blue">Позвонить</MobilePrimaryAction>
                        <MobileIconAction type="button" onClick={(event) => { stopCardClick(event); onOpenProfile(provider); }} aria-label="Открыть профиль"><ChatGlyph /></MobileIconAction>
                    </MobileActions>
                </MobileMasterBody>
            ) : (
                <>
                    <MobileCover>
                        {coverUrl ? <img src={coverUrl} alt={name} /> : <MobileCoverFallback><span>{getInitials(name)}</span></MobileCoverFallback>}
                        <MobileRatingBadge><StarIcon />{rating} <span>({reviews})</span></MobileRatingBadge>
                    </MobileCover>
                    <MobileOrganizationBody>
                        <MobileProviderName><MobileProfileLink href={getProviderProfileHref(provider)} onClick={handleProfileLinkClick}>{name}</MobileProfileLink></MobileProviderName>
                        <MobileOrganizationFieldGroup>
                            <MobileScheduleLine>
                                <span>График работы</span>
                                <MobileDistance><MapPinIcon />{formatDistance(provider.distance)}</MobileDistance>
                            </MobileScheduleLine>
                            <MobileTagRow $compact>
                                <MobileStatusTag $status={status}>{status === "open" ? "Открыто" : "Закрыто"}</MobileStatusTag>
                                <MobileTag>Пн - Вс</MobileTag>
                                <MobileTag>{provider.workFrom && provider.workTo ? `${provider.workFrom.slice(0, 5)} - ${provider.workTo.slice(0, 5)}` : "8:00 - 19:00"}</MobileTag>
                            </MobileTagRow>
                        </MobileOrganizationFieldGroup>
                        <MobileOrganizationFieldGroup>
                            <MobileFieldTitle>{type === ActivityType.auto_shop ? "Товары" : "Услуги"}</MobileFieldTitle>
                            <MobileTagRow $wrap $compact>
                                {(tags.length ? tags : ["Заполняется"]).map((tag) => <MobileTag key={tag}>{tag}</MobileTag>)}
                            </MobileTagRow>
                        </MobileOrganizationFieldGroup>
                        <MobileActions>
                            {booking ? (
                                <MobilePrimaryAction href={`/provider?id=${encodeURIComponent(provider.id)}&type=${encodeURIComponent(type)}`} onClick={stopCardClick} $variant="green">Записаться</MobilePrimaryAction>
                            ) : (
                                <MobilePrimaryAction href={getPhoneHref(provider)} onClick={stopCardClick} $variant="blue">Позвонить</MobilePrimaryAction>
                            )}
                            <MobileIconAction type="button" onClick={(event) => { stopCardClick(event); onOpenProfile(provider); }} aria-label="Открыть профиль">
                                {booking ? <PhoneIcon /> : <ChatGlyph />}
                            </MobileIconAction>
                        </MobileActions>
                    </MobileOrganizationBody>
                </>
            )}
        </MobileCard>
    );
}

function ChatGlyph() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.8 4v-4H6.5A2.5 2.5 0 0 1 4 12.5z" /></svg>;
}

function MobileFilterRail({
    isAllTypesActive,
    activeTypes,
    totalNearbyCount,
    countsByType,
    categories,
    onlyAvailable,
    radius,
    onAllTypesClick,
    onActivityTypeClick,
    onOnlyAvailableChange,
    onOpenRadius,
    scrollLeftRef,
}: {
    isAllTypesActive: boolean;
    activeTypes: ActivityType[];
    totalNearbyCount: number;
    countsByType: Record<ActivityType, number>;
    categories: MobileProviderCategory[];
    onlyAvailable: boolean;
    radius: number;
    onAllTypesClick: () => void;
    onActivityTypeClick: (type: ActivityType) => void;
    onOnlyAvailableChange: (value: boolean) => void;
    onOpenRadius: () => void;
    scrollLeftRef: React.MutableRefObject<number>;
}) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (ref.current) ref.current.scrollLeft = scrollLeftRef.current;
    }, [scrollLeftRef]);

    return (
        <MobileFilterRailRoot
            ref={ref}
            data-horizontal-scroll="true"
            onScroll={(event) => { scrollLeftRef.current = event.currentTarget.scrollLeft; }}
        >
            <MobileFilterChip $active={isAllTypesActive} onClick={onAllTypesClick}>Все <span>{totalNearbyCount}</span></MobileFilterChip>
            <MobileFilterChip $active={onlyAvailable} onClick={() => onOnlyAvailableChange(!onlyAvailable)}>
                {onlyAvailable && <CheckGlyph />}
                Открыто сейчас
            </MobileFilterChip>
            <MobileRadiusChip type="button" onClick={onOpenRadius}>Радиус <strong>{radius} км</strong><ChevronGlyph /></MobileRadiusChip>
            {categories.map((category) => {
                const active = !isAllTypesActive && activeTypes.includes(category.type);
                return <MobileFilterChip key={category.type} $active={active} onClick={() => onActivityTypeClick(category.type)}>{category.title.replace(/^Частные мастера$/, "Частные").replace(/^Автомагазины$/, "Автомагазины")} <span>{countsByType[category.type] || 0}</span></MobileFilterChip>;
            })}
        </MobileFilterRailRoot>
    );
}

function CheckGlyph() {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>;
}

function ChevronGlyph() {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>;
}

export function MobileSearchExperience({
    query,
    onQueryChange,
    onlyAvailable,
    onOnlyAvailableChange,
    isRadiusPickerOpen,
    onRadiusPickerOpen,
    onRadiusPickerClose,
    onRadiusChange,
    radius,
    activeTypes,
    isAllTypesActive,
    onAllTypesClick,
    onActivityTypeClick,
    categories,
    providersByType,
    countsByType,
    totalNearbyCount,
    filteredAllProviders,
    isLoading,
    isError,
    errorMessage,
    onRetry,
    onShowOnMap,
    onOpenProfile,
    onFocusMap,
    userCoords,
    mastersRef,
    mapInstanceRef,
    mapRef,
    isMapAttentionVisible,
    mapAttentionKey,
    isAuthenticated,
    profileName,
    profileAvatarUrl,
}: Props) {
    const navigate = useNavigate();
    const [viewportHeight, setViewportHeight] = useState(() => window.visualViewport?.height || window.innerHeight);
    const filterScrollLeftRef = useRef(0);
    const sheetScrollRef = useRef<HTMLDivElement | null>(null);
    const sheetContentRef = useRef<HTMLDivElement | null>(null);
    const floatingFiltersRef = useRef<HTMLDivElement | null>(null);
    const panelFiltersRef = useRef<HTMLDivElement | null>(null);
    const scrollRafRef = useRef<number | null>(null);
    const isExpandedRef = useRef(false);
    const filterOnMapRef = useRef(true);

    useEffect(() => {
        const updateViewportHeight = () => setViewportHeight(window.visualViewport?.height || window.innerHeight);
        updateViewportHeight();
        window.visualViewport?.addEventListener("resize", updateViewportHeight);
        window.addEventListener("resize", updateViewportHeight);
        return () => {
            window.visualViewport?.removeEventListener("resize", updateViewportHeight);
            window.removeEventListener("resize", updateViewportHeight);
        };
    }, []);

    const snapTops = useMemo(
        () => SNAP_REFERENCE_TOPS.map((top) => Math.max(72, Math.min(viewportHeight - 116, Math.round(top * viewportHeight / 800)))),
        [viewportHeight],
    );
    const snapOffsets = useMemo(
        () => snapTops.slice().reverse().map((top) => snapTops[3] - top),
        [snapTops],
    );

    const handleSheetScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget || scrollRafRef.current !== null) return;
        scrollRafRef.current = window.requestAnimationFrame(() => {
            scrollRafRef.current = null;
            const viewport = sheetScrollRef.current;
            if (!viewport) return;

            const expanded = viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 1;
            if (isExpandedRef.current !== expanded) {
                isExpandedRef.current = expanded;
                if (sheetContentRef.current) {
                    sheetContentRef.current.style.overflowY = expanded ? "auto" : "hidden";
                }
            }

            // iOS Safari may not start native scrolling when the overflow element
            // has pointer-events:none. Clip its hit area to the visible sheet so
            // gestures on the exposed map still reach the map underneath.
            viewport.style.clipPath = `inset(${Math.max(0, snapTops[3] - viewport.scrollTop)}px 0 0)`;

            const showOnMap = viewport.scrollTop <= 1;
            if (filterOnMapRef.current !== showOnMap) {
                filterOnMapRef.current = showOnMap;
                if (floatingFiltersRef.current) {
                    floatingFiltersRef.current.style.opacity = showOnMap ? "1" : "0";
                    floatingFiltersRef.current.style.pointerEvents = showOnMap ? "auto" : "none";
                    floatingFiltersRef.current.setAttribute("aria-hidden", String(!showOnMap));
                }
                if (panelFiltersRef.current) {
                    panelFiltersRef.current.style.opacity = showOnMap ? "0" : "1";
                    panelFiltersRef.current.style.visibility = showOnMap ? "hidden" : "visible";
                    panelFiltersRef.current.style.pointerEvents = showOnMap ? "none" : "auto";
                    panelFiltersRef.current.setAttribute("aria-hidden", String(showOnMap));
                }
            }
        });
    };

    useEffect(() => () => {
        if (scrollRafRef.current !== null) window.cancelAnimationFrame(scrollRafRef.current);
    }, []);

    useEffect(() => {
        const viewport = sheetScrollRef.current;
        if (!viewport) return;

        const settleAtNearestPosition = () => {
            const maxSnapOffset = snapOffsets[snapOffsets.length - 1] ?? 0;
            const currentTop = viewport.scrollTop;
            if (currentTop > maxSnapOffset + 1 || snapOffsets.length === 0) return;

            const nearestOffset = snapOffsets.reduce((nearest, offset) => (
                Math.abs(offset - currentTop) < Math.abs(nearest - currentTop) ? offset : nearest
            ), snapOffsets[0]);

            if (Math.abs(nearestOffset - currentTop) > 2) {
                viewport.scrollTo({ top: nearestOffset, behavior: "smooth" });
            }
        };

        viewport.addEventListener("scrollend", settleAtNearestPosition, { passive: true });
        return () => viewport.removeEventListener("scrollend", settleAtNearestPosition);
    }, [snapOffsets]);

    const filterRail = (
        <MobileFilterRail
            isAllTypesActive={isAllTypesActive}
            activeTypes={activeTypes}
            totalNearbyCount={totalNearbyCount}
            countsByType={countsByType}
            categories={categories}
            onlyAvailable={onlyAvailable}
            radius={radius}
            onAllTypesClick={onAllTypesClick}
            onActivityTypeClick={onActivityTypeClick}
            onOnlyAvailableChange={onOnlyAvailableChange}
            onOpenRadius={onRadiusPickerOpen}
            scrollLeftRef={filterScrollLeftRef}
        />
    );

    return (
        <MobilePageRoot>
            <MobileMapSurface ref={mapRef}>
                <StableProvidersMap
                    masters={filteredAllProviders}
                    mastersRef={mastersRef}
                    mapInstanceRef={mapInstanceRef}
                    height="100%"
                    initialZoom={13}
                    showZoomControl={false}
                    showGeolocationControl={false}
                    disableScrollZoom
                />
                {isMapAttentionVisible && <MobileMapAttention key={mapAttentionKey} />}
                <MobileLocationButton type="button" onClick={() => onFocusMap(userCoords || [43.21564479600424, 46.89458462676669])} aria-label="Показать моё местоположение">
                    <NavigationRoundedIcon />
                </MobileLocationButton>
            </MobileMapSurface>

            <MobileHeader>
                <a href="/" aria-label="АвтоГис"><img src={LogoIcon} alt="АвтоГис" /></a>
                <MobileHeaderActions>
                    <MobileBellButton type="button" aria-label="Уведомления" onClick={() => { if (!isAuthenticated) navigate("/login"); }}>
                        <NotificationsNoneRoundedIcon />
                    </MobileBellButton>
                    {isAuthenticated ? (
                        <MobileProfileButton type="button" onClick={() => navigate("/cabinet")} aria-label="Профиль">
                            {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : getInitials(profileName)}
                        </MobileProfileButton>
                    ) : (
                        <MobileLoginButton type="button" onClick={() => navigate("/login")}>Войти</MobileLoginButton>
                    )}
                </MobileHeaderActions>
            </MobileHeader>

            <MobileStories>
                <StoryStrip showTitle={false} compact />
            </MobileStories>

            <MobileSheetScroll
                ref={sheetScrollRef}
                onScroll={handleSheetScroll}
                style={{
                    height: `${viewportHeight}px`,
                    clipPath: `inset(${snapTops[3]}px 0 0)`,
                }}
                role="region"
                tabIndex={0}
                aria-label="Каталог мастеров и организаций"
            >
                <MobileSheetSpacer style={{ height: `${snapTops[3]}px` }} aria-hidden="true">
                    {snapOffsets.map((offset, index) => (
                        <MobileSnapMarker
                            key={offset}
                            style={{ marginTop: `${index === 0 ? 0 : offset - snapOffsets[index - 1] - 1}px` }}
                        />
                    ))}
                </MobileSheetSpacer>
                <MobileSheet style={{ height: `${viewportHeight - snapTops[0]}px` }}>
                    <MobileSheetContent
                        ref={sheetContentRef}
                    >
                        <MobileSheetHandle>
                            <span />
                        </MobileSheetHandle>
                        <MobileSearchBox>
                    <Filters query={query} onChange={(next) => onQueryChange(next.query)} ariaLabel="Поиск по профессиям, маркам и услугам" />
                        </MobileSearchBox>
                        <MobilePanelFilters
                            ref={panelFiltersRef}
                            aria-hidden
                            style={{ opacity: 0, visibility: "hidden", pointerEvents: "none" }}
                        >
                            {filterRail}
                        </MobilePanelFilters>

                        {isError ? (
                            <MobileError><ErrorState message={errorMessage} onRetry={onRetry} /></MobileError>
                        ) : isLoading ? (
                            <MobileLoading>Загрузка предложений…</MobileLoading>
                        ) : (
                            <MobileCatalog>
                                {categories.map((category) => {
                                    const providers = providersByType[category.type] || [];
                                    return (
                                        <MobileCategory key={category.type}>
                                            <MobileCategoryTitle>{category.title}</MobileCategoryTitle>
                                            <MobileCardsTrack data-horizontal-scroll="true">
                                                {providers.length > 0 ? providers.map((provider) => (
                                                    <MobileProviderCard key={`${provider.activityType}-${provider.id}`} provider={provider} onOpenProfile={onOpenProfile} />
                                                )) : <MobileEmptyCard>{category.empty}</MobileEmptyCard>}
                                            </MobileCardsTrack>
                                        </MobileCategory>
                                    );
                                })}
                            </MobileCatalog>
                        )}
                    </MobileSheetContent>
                </MobileSheet>
            </MobileSheetScroll>

            <MobileFloatingFilters
                ref={floatingFiltersRef}
                aria-hidden={false}
                style={{ top: Math.max(160, snapTops[3] - 44) }}
            >
                {filterRail}
            </MobileFloatingFilters>

            <RadiusPickerModal
                open={isRadiusPickerOpen}
                currentRadius={radius}
                onClose={onRadiusPickerClose}
                onSelectRadius={onRadiusChange}
            />
        </MobilePageRoot>
    );
}

const MobilePageRoot = styled.div`
    position: relative;
    height: 100dvh;
    margin-bottom: calc(-56px - env(safe-area-inset-bottom, 0px));
    overflow: hidden;
    background: var(--ds-color-gray-100);
    color: var(--ds-color-gray-900);
    font-family: var(--default-font-family);
`;

const MobileMapSurface = styled.div`
    position: absolute;
    inset: 64px 0 0;
    z-index: 1;
    overflow: hidden;
    background: var(--ds-color-gray-100);

    > div {
        height: 100%;
    }
`;

const MobileMapAttention = styled.div`
    position: absolute;
    left: 50%;
    top: 50%;
    width: 54px;
    height: 54px;
    transform: translate(-50%, -50%);
    border: 2px solid rgb(var(--ds-color-blue-500-rgb) / 0.75);
    border-radius: var(--ds-radius-round);
    background: rgb(var(--ds-color-blue-500-rgb) / 0.1);
    box-shadow: var(--ds-shadow-list);
    animation: mobile-map-pulse 1.2s ease-out both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    @keyframes mobile-map-pulse {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.7); }
        25% { opacity: 1; }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
    }
`;

const MobileHeader = styled.header`
    position: absolute;
    inset: 0 0 auto;
    z-index: 70;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background: var(--ds-color-white);
    border-bottom: 1px solid rgb(var(--ds-color-gray-900-rgb) / 0.05);

    > a { display: inline-flex; align-items: center; }
    > a img { width: 119px; height: auto; display: block; }
`;

const MobileHeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 20px;
`;

const MobileBellButton = styled.button`
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-gray-100);
    color: var(--ds-color-gray-700);
    cursor: pointer;
    svg { width: 24px; height: 24px; }
`;

const MobileLoginButton = styled.button`
    height: 40px;
    min-width: 68px;
    padding: 0 14px;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-gray-100);
    color: var(--ds-color-gray-900);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
`;

const MobileProfileButton = styled.button`
    position: relative;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: var(--ds-radius-8);
    overflow: hidden;
    display: grid;
    place-items: center;
    background: var(--ds-color-blue-600);
    color: var(--ds-color-white);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
    }
`;

const MobileStories = styled.div`
    position: absolute;
    inset: 64px 0 auto;
    z-index: 25;
    height: 104px;
    overflow: hidden;
    background: var(--ds-color-white);
    &:empty { display: none; }
`;

const MobileLocationButton = styled.button`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: var(--ds-radius-8);
    display: grid;
    place-items: center;
    background: var(--ds-color-white);
    color: var(--ds-color-gray-700);
    box-shadow: var(--ds-shadow-filter);
    cursor: pointer;
    z-index: 5;
    svg { width: 24px; height: 24px; }
`;

const MobileFloatingFilters = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    z-index: 45;
    pointer-events: auto;
`;

const MobileSheetScroll = styled.div`
    position: absolute;
    inset: 0;
    z-index: 40;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-snap-type: y proximity;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    touch-action: pan-y;
    pointer-events: auto;
    &::-webkit-scrollbar { display: none; }
`;

const MobileSheetSpacer = styled.div`
    position: relative;
    width: 100%;
    pointer-events: none;
`;

const MobileSnapMarker = styled.span`
    display: block;
    width: 100%;
    height: 1px;
    flex: 0 0 1px;
    opacity: 0;
    scroll-snap-align: start;
    scroll-snap-stop: normal;
    pointer-events: none;
`;

const MobileSheet = styled.section`
    position: relative;
    width: 100%;
    flex: 0 0 auto;
    overflow: hidden;
    border-radius: var(--ds-radius-16) var(--ds-radius-16) 0 0;
    background: var(--ds-color-gray-100);
    box-shadow: var(--ds-shadow-filter);
    pointer-events: auto;
`;

const MobileSheetHandle = styled.div`
    position: sticky;
    top: 0;
    height: 30px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    padding-top: 8px;
    touch-action: pan-y;
    z-index: 2;
    background: var(--ds-color-gray-100);
    span { width: 42px; height: 3px; border-radius: var(--ds-radius-pill); background: var(--ds-color-gray-300); }
`;

const MobileSheetContent = styled.div`
    height: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: hidden;
    touch-action: pan-y;
    overscroll-behavior-y: auto;
    padding: 0 0 calc(88px + env(safe-area-inset-bottom, 0px));
    -webkit-overflow-scrolling: touch;
`;

const MobileSearchBox = styled.div`
    position: relative;
    margin: 0 16px 12px;
    min-height: 44px;
    display: flex;
    align-items: center;
    background: var(--ds-color-white);
    border-radius: var(--ds-radius-8);
    color: var(--ds-color-gray-500);
    overflow: hidden;
    > svg { position: absolute; left: 12px; width: 22px; height: 22px; z-index: 1; pointer-events: none; }
    > div { width: 100%; }
    .MuiAutocomplete-root { width: 100%; }
    .MuiInput-root { min-height: 44px; border: 0; border-radius: var(--ds-radius-8); background: var(--ds-color-white); }
    .MuiInputBase-root { min-height: 44px; }
    .MuiInputBase-input { padding: 0 12px 0 8px !important; color: var(--ds-color-gray-900); font-size: 12px; }
    .MuiInputBase-input::placeholder { color: var(--ds-color-gray-700); opacity: 1; }
    .MuiInputAdornment-root { margin: 0 0 0 12px; color: var(--ds-color-gray-700); }
    .MuiInputAdornment-root svg { width: 20px; height: 20px; }
    .MuiAutocomplete-tag { margin: 2px; }
`;

const MobilePanelFilters = styled.div`
    margin-bottom: 16px;
`;

const MobileFilterRailRoot = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 0 16px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    &[data-horizontal-scroll] { user-select: none; }
    &::-webkit-scrollbar { display: none; }
`;

const MobileFilterChip = styled.button<{ $active: boolean }>`
    flex: 0 0 auto;
    height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: ${({ $active }) => $active ? "var(--ds-color-gray-900)" : "var(--ds-color-white)"};
    color: ${({ $active }) => $active ? "var(--ds-color-white)" : "var(--ds-color-gray-900)"};
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    span { color: ${({ $active }) => $active ? "var(--ds-color-white)" : "var(--ds-color-gray-900)"}; font-weight: 600; }
    svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
`;

const MobileRadiusChip = styled.button`
    flex: 0 0 auto;
    height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-white);
    color: var(--ds-color-gray-900);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    strong { color: var(--ds-color-gray-900); font-weight: 700; }
    svg { width: 14px; height: 14px; fill: none; stroke: var(--ds-color-gray-700); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
`;

const MobileError = styled.div`
    padding: 20px 16px;
`;

const MobileLoading = styled.div`
    min-height: 220px;
    display: grid;
    place-items: center;
    color: var(--ds-color-gray-700);
    font-size: 14px;
`;

const MobileCatalog = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const MobileCategory = styled.section``;

const MobileCategoryTitle = styled.h2`
    margin: 0 16px 12px;
    color: var(--ds-color-gray-900);
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
`;

const MobileCardsTrack = styled.div`
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 0 16px 4px;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    &[data-horizontal-scroll] { user-select: none; }
    &::-webkit-scrollbar { display: none; }
    > * { flex: 0 0 auto; scroll-snap-align: start; }
`;

const MobileEmptyCard = styled.div`
    width: min(250px, calc(100vw - 48px));
    box-sizing: border-box;
    min-height: 150px;
    display: grid;
    place-items: center;
    padding: 18px;
    border-radius: var(--ds-radius-12);
    background: var(--ds-color-white);
    color: var(--ds-color-gray-700);
    font-size: 12px;
    text-align: center;
`;

const MobileCard = styled.article<{ $organization: boolean }>`
    width: min(250px, calc(100vw - 48px));
    min-width: min(250px, calc(100vw - 48px));
    height: ${({ $organization }) => $organization ? "381px" : "266px"};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--ds-radius-12);
    background: var(--ds-color-white);
    color: var(--ds-color-gray-900);
    cursor: pointer;
    scroll-snap-align: start;
    @media (max-width: 340px) {
        height: ${({ $organization }) => $organization ? "381px" : "266px"};
    }
`;

const MobileProfileLink = styled.a`
    color: inherit;
    text-decoration: none;
    &:focus-visible { outline: 2px solid var(--ds-color-blue-600); outline-offset: 2px; border-radius: var(--ds-radius-4); }
`;

const MobileMasterBody = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    padding: 12px;
`;

const MobileMasterHeader = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    min-height: 64px;
`;

const MobileAvatar = styled.div<{ $status: "open" | "closed" }>`
    position: relative;
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
    display: grid;
    place-items: center;
    overflow: visible;
    border: 2px solid var(--ds-color-white);
    border-radius: var(--ds-radius-12);
    box-shadow: 0 0 0 2px var(--ds-color-gray-500), 0 0 0 4px var(--ds-color-white);
    background: linear-gradient(135deg, var(--ds-color-gray-100), var(--ds-color-gray-300));
    color: var(--ds-color-blue-500);
    font-size: 14px;
    font-weight: 800;
    img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        object-fit: cover;
        border-radius: var(--ds-radius-8);
        clip-path: inset(0 round var(--ds-radius-8));
    }
`;

const MobileStatusDot = styled.span<{ $status: "open" | "closed" }>`
    position: absolute;
    left: -2px;
    top: -2px;
    width: 12px;
    height: 12px;
    border: 2px solid var(--ds-color-white);
    border-radius: var(--ds-radius-round);
    background: ${({ $status }) => $status === "open" ? "var(--ds-color-green-500)" : "var(--ds-color-gray-500)"};
    z-index: 1;
    ${({ $status }) => $status === "open" && `
        animation: mobile-status-pulse 1.8s ease-out infinite;
        @media (prefers-reduced-motion: reduce) { animation: none; }
        @keyframes mobile-status-pulse {
            0% { box-shadow: 0 0 0 0 rgb(90 138 54 / 0.5); }
            70% { box-shadow: 0 0 0 5px rgb(90 138 54 / 0); }
            100% { box-shadow: 0 0 0 0 rgb(90 138 54 / 0); }
        }
    `}
`;

const MobileIdentity = styled.div`
    min-width: 0;
    flex: 1;
`;

const MobileProviderName = styled.h3`
    margin: 0;
    overflow: hidden;
    color: var(--ds-color-gray-900);
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const MobileMetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 4px;
    color: var(--ds-color-gray-700);
    font-size: 11px;
    white-space: nowrap;
`;

const MobileRating = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--ds-color-gray-900);
    font-weight: 600;
    svg { width: 12px; height: 12px; color: var(--ds-color-yellow-500); fill: var(--ds-color-yellow-500); }
    span { color: var(--ds-color-gray-700); }
`;

const MobileDistance = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--ds-color-blue-600);
    font-weight: 600;
    svg { width: 13px; height: 13px; }
`;

const MobileFieldTitle = styled.div`
    color: var(--ds-color-gray-900);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.33;
`;

const MobileTagRow = styled.div<{ $wrap?: boolean; $compact?: boolean }>`
    display: flex;
    flex-wrap: ${({ $wrap }) => $wrap ? "wrap" : "nowrap"};
    gap: 4px;
    margin-top: ${({ $compact }) => $compact ? "0" : "8px"};
    overflow: hidden;
    max-height: ${({ $wrap }) => $wrap ? "44px" : "none"};
`;

const MobileMasterFieldGroup = styled.div<{ $afterHeader?: boolean }>`
    display: flex;
    flex-direction: column;
    margin-top: ${({ $afterHeader }) => $afterHeader ? "12px" : "0"};
    & + & { margin-top: 8px; }
`;

const MobileOrganizationFieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    & + & { margin-top: 8px; }
`;

const MobileTag = styled.span`
    flex: 0 0 auto;
    max-width: 190px;
    overflow: hidden;
    padding: 2px 8px;
    border-radius: var(--ds-radius-4);
    background: var(--ds-color-gray-100);
    color: var(--ds-color-gray-700);
    font-size: 11px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const MobileStatusTag = styled(MobileTag)<{ $status: "open" | "closed" }>`
    color: ${({ $status }) => $status === "open" ? "var(--ds-color-green-600)" : "var(--ds-color-red-600)"};
`;

const MobileActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: auto;
`;

const MobilePrimaryAction = styled.a<{ $variant: "blue" | "green" }>`
    flex: 1;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: ${({ $variant }) => $variant === "green" ? "var(--ds-color-green-500)" : "var(--ds-color-blue-500)"};
    color: var(--ds-color-white) !important;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
`;

const MobileIconAction = styled.button`
    width: 55px;
    height: 38px;
    flex: 0 0 55px;
    display: grid;
    place-items: center;
    border: 2px solid var(--ds-color-gray-300);
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-white);
    color: var(--ds-color-blue-500);
    cursor: pointer;
    svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
`;

const MobileCover = styled.div`
    position: relative;
    height: 149px;
    flex: 0 0 149px;
    overflow: hidden;
    background: linear-gradient(135deg, var(--ds-color-gray-300), var(--ds-color-gray-500));
    > img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const MobileCoverFallback = styled.div`
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--ds-color-blue-500);
    font-size: 30px;
    font-weight: 800;
`;

const MobileRatingBadge = styled.div`
    position: absolute;
    top: 12px;
    left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 7px;
    border-radius: var(--ds-radius-4);
    background: rgba(255,255,255,.96);
    color: var(--ds-color-gray-900);
    font-size: 11px;
    font-weight: 600;
    svg { width: 12px; height: 12px; color: var(--ds-color-yellow-500); fill: var(--ds-color-yellow-500); }
    span { color: var(--ds-color-gray-700); }
`;

const MobileOrganizationBody = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 232px;
    box-sizing: border-box;
    padding: 8px 12px 12px;
    > h3 { flex: 0 0 auto; }
`;

const MobileScheduleLine = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
    color: var(--ds-color-gray-900);
    font-size: 12px;
    font-weight: 600;
`;
