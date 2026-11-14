import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import {
    GeolocationControl,
    Map,
    Placemark,
    YMaps,
    ZoomControl,
} from "@pbe/react-yandex-maps";
import { DEFAULT_ZOOM } from "../../domain/constants";
import {
    BalloonAction,
    BalloonActions,
    BalloonAddress,
    BalloonAvatar,
    BalloonAvatarImage,
    BalloonBody,
    BalloonBookingPill,
    BalloonCover,
    BalloonCoverImage,
    BalloonDot,
    BalloonHeader,
    BalloonMeta,
    BalloonMetaItem,
    BalloonName,
    BalloonPills,
    BalloonScheduleTag,
    BalloonStatus,
    BalloonStatusDot,
    BalloonTag,
    BalloonTags,
    BalloonTitleGroup,
    BALLOON_CARD_WIDTH,
    BALLOON_MAX_HEIGHT,
    MapContainer,
    ProviderCard,
} from "./styles";
import ReactDOMServer from "react-dom/server";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";
import {
    AutoServiceMapPinIcon,
    AvailableMasterIcon,
    AutoWashMapPinIcon,
    BusyMasterIcon,
    CalendarIcon,
    ClockIcon,
    EyeIcon,
    MapPinIcon,
    PhoneIcon,
    PrivateMasterMapPinIcon,
    ServiceCenterMapPinIcon,
    StarIcon,
    UnavailableMasterIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { MasterStatus } from "@modules/masters";
import { ActivityType, Provider } from "@modules/providers";
import { useCoords } from "@common/hooks";
import { MapStub, type MapFailureCode } from "../MapStub";
import { ThemeProvider } from "@common/theme";

type Props = {
    masters: Provider[];
    mastersRef: any;
    mapInstanceRef?: MutableRefObject<any | null>;
    height?: string;
    showZoomControl?: boolean;
    showGeolocationControl?: boolean;
    disableScrollZoom?: boolean;
    initialZoom?: number;
};

type VisualStatus = "on" | "busy" | "off";
const WEEK_DAYS_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MAP_LOAD_TIMEOUT_MS = 20_000;

type MapResourceDiagnostic = {
    host: string;
    status: number | null;
    durationMs: number;
};

function isYandexMapTileUrl(value: string): boolean {
    try {
        return /(?:^|\.)maps\.yandex\.(?:ru|net)$/i.test(new URL(value).hostname);
    } catch {
        return false;
    }
}

function getYandexMapResources(since = 0): MapResourceDiagnostic[] {
    if (typeof performance === "undefined") return [];

    return performance.getEntriesByType("resource")
        .map((entry) => {
            const resource = entry as PerformanceResourceTiming & { responseStatus?: number };
            try {
                const host = new URL(resource.name).hostname;
                const isApi = host === "api-maps.yandex.ru";
                const isMapTile = /(?:^|\.)maps\.yandex\.(?:ru|net)$/i.test(host);
                if (resource.startTime < since || (!isApi && !isMapTile)) return null;
                return {
                    host,
                    status: typeof resource.responseStatus === "number" ? resource.responseStatus : null,
                    durationMs: Math.round(resource.duration),
                };
            } catch {
                return null;
            }
        })
        .filter((resource): resource is MapResourceDiagnostic => resource !== null)
        .slice(-12);
}

function hasLoadedYandexMapTiles(
    resources = getYandexMapResources(),
    mapRoot: HTMLElement | null = null,
): boolean {
    const loadedTileImage = Array.from(mapRoot?.querySelectorAll("img") ?? []).some((image) =>
        image.complete && image.naturalWidth > 0 && isYandexMapTileUrl(image.currentSrc || image.src),
    );
    return loadedTileImage || resources.some(({ host, status }) =>
        host !== "api-maps.yandex.ru" && status !== null && status >= 200 && status < 400,
    );
}

function classifyMapFailure(reason: unknown, stage: string, since = 0): MapFailureCode {
    const message = reason instanceof Error
        ? reason.message
        : typeof reason === "string"
            ? reason
            : "";
    const resources = getYandexMapResources(since);
    if (
        resources.some(({ status }) => status === 401 || status === 403) ||
        /\b(401|403)\b|invalid.{0,12}(api.?key|key)|api.?key.{0,12}(invalid|denied)|referer/i.test(message)
    ) {
        return "api-access";
    }
    if (stage === "tiles-loading") return "tiles-timeout";
    if (stage === "api-loading" || /network|script|load/i.test(message)) return "api-network";
    if (stage === "map-initializing") return "map-timeout";
    return "map-init";
}

function isYandexApiScript(target: EventTarget | null): target is HTMLScriptElement {
    return target instanceof HTMLScriptElement && /api-maps\.yandex\.ru/i.test(target.src);
}

export function getIconForStatus(
    activityTypeOrStatus?: ActivityType | MasterStatus,
    currentStatus: MasterStatus = MasterStatus.UNAVAILABLE
) {
    const resolvedActivityType = Object.values(ActivityType).includes(
        activityTypeOrStatus as ActivityType
    )
        ? (activityTypeOrStatus as ActivityType)
        : undefined;
    const resolvedStatus =
        resolvedActivityType === undefined &&
        activityTypeOrStatus !== undefined
            ? (activityTypeOrStatus as MasterStatus)
            : currentStatus;

    if (resolvedActivityType === ActivityType.auto_service) {
        return {
            href: AutoServiceMapPinIcon,
            size: [48, 48] as [number, number],
            offset: [-24, -48] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.auto_shop) {
        return {
            href: ServiceCenterMapPinIcon,
            size: [48, 48] as [number, number],
            offset: [-24, -48] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.auto_wash) {
        return {
            href: AutoWashMapPinIcon,
            size: [48, 48] as [number, number],
            offset: [-24, -48] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.master) {
        return {
            href: PrivateMasterMapPinIcon,
            size: [48, 48] as [number, number],
            offset: [-24, -48] as [number, number],
        };
    }

    if (resolvedStatus === MasterStatus.AVAILABLE) {
        return {
            href: AvailableMasterIcon,
            size: [60, 60] as [number, number],
            offset: [-18, -36] as [number, number],
        };
    }
    if (resolvedStatus === MasterStatus.SCHEDULE) {
        return {
            href: BusyMasterIcon,
            size: [60, 60] as [number, number],
            offset: [-14, -28] as [number, number],
        };
    }
    return {
        href: UnavailableMasterIcon,
        size: [60, 60] as [number, number],
        offset: [-14, -28] as [number, number],
    };
}

function getProviderType(provider: Provider): ActivityType {
    return provider.activityType || ActivityType.master;
}

function isMasterProvider(provider: Provider): boolean {
    return getProviderType(provider) === ActivityType.master;
}

function shouldShowBookingAction(provider: Provider): boolean {
    const type = getProviderType(provider);

    return Boolean(provider.onlineBookingEnabled) &&
        !provider.liveQueueEnabled &&
        (type === ActivityType.master || type === ActivityType.auto_service);
}

function getDisplayName(provider: Provider): string {
    return (
        provider.fullName ||
        provider.businessName ||
        provider.name ||
        (isMasterProvider(provider) ? "Мастер" : "Организация")
    );
}

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function getAvatarUrl(provider: Provider): string | undefined {
    if (provider.activityType === ActivityType.master || !provider.activityType) {
        return provider.avatarUrl;
    }
    return getCoverUrl(provider);
}

function getCoverUrl(provider: Provider): string | undefined {
    return provider.coverImageUrl || provider.coverImage || undefined;
}

function getVisualStatus(provider: Provider): VisualStatus {
    const status = provider.currentStatus || provider.status;

    if (status === MasterStatus.AVAILABLE) {
        return "on";
    }

    return "off";
}

function getStatusLabel(provider: Provider): string {
    const status = provider.currentStatus || provider.status;

    if (status === MasterStatus.AVAILABLE) {
        return isMasterProvider(provider) ? "На работе" : "Открыто";
    }

    return isMasterProvider(provider) ? "Не работает" : "Закрыто";
}

function formatClock(time?: string): string | undefined {
    if (!time) {
        return undefined;
    }

    return time.slice(0, 5);
}

function getStatusSummary(provider: Provider): string {
    const status = provider.currentStatus || provider.status;
    const label = getStatusLabel(provider);
    const workTo = formatClock(provider.workTo);

    if (status === MasterStatus.AVAILABLE && workTo) {
        return `${label} до ${workTo}`;
    }

    return label;
}

function formatWorkingDaysSummary(workingDays?: boolean[]): string {
    const activeIndexes =
        workingDays
            ?.map((isActive, index) => (isActive ? index : -1))
            .filter((index) => index >= 0) ?? [];

    if (activeIndexes.length === 0) {
        return "График уточняется";
    }

    if (activeIndexes.length === WEEK_DAYS_LABELS.length) {
        return "Ежедневно";
    }

    const ranges: string[] = [];
    let rangeStart = activeIndexes[0];
    let previous = activeIndexes[0];

    for (const index of activeIndexes.slice(1)) {
        if (index === previous + 1) {
            previous = index;
            continue;
        }

        ranges.push(
            rangeStart === previous
                ? WEEK_DAYS_LABELS[rangeStart]
                : `${WEEK_DAYS_LABELS[rangeStart]}-${WEEK_DAYS_LABELS[previous]}`
        );
        rangeStart = index;
        previous = index;
    }

    ranges.push(
        rangeStart === previous
            ? WEEK_DAYS_LABELS[rangeStart]
            : `${WEEK_DAYS_LABELS[rangeStart]}-${WEEK_DAYS_LABELS[previous]}`
    );

    return ranges.join(", ");
}

function buildTags(provider: Provider): string[] {
    const isMaster = isMasterProvider(provider);
    const tags = isMaster
        ? [
              ...(provider.professions || []).slice(0, 1),
              ...(provider.services || []).slice(0, 2),
              ...(provider.autoMarks || []).slice(0, 1),
          ]
        : [
              ...(provider.professions || []).slice(0, 2),
              ...(provider.services || []).slice(0, 2),
          ];

    return Array.from(new Set(tags.filter(Boolean))).slice(0, 4);
}

function getDetailsHref(provider: Provider): string {
    return `/provider?id=${provider.id}&type=${getProviderType(provider)}`;
}

function getPhoneHref(provider: Provider): string {
    return provider.workingPhone || provider.phone
        ? `tel:${provider.workingPhone || provider.phone}`
        : "#";
}

function MapBalloonCard({ provider }: { provider: Provider }) {
    const name = getDisplayName(provider);
    const avatarUrl = getAvatarUrl(provider);
    const coverUrl = getCoverUrl(provider);
    const status = getVisualStatus(provider);
    const tags = buildTags(provider);

    return (
        <ProviderCard>
            {!isMasterProvider(provider) && coverUrl && (
                <BalloonCover>
                    <BalloonCoverImage src={coverUrl} alt={name} />
                </BalloonCover>
            )}
            <BalloonHeader>
                <BalloonAvatar>
                    {avatarUrl ? (
                        <BalloonAvatarImage src={avatarUrl} alt={name} />
                    ) : (
                        getInitials(name)
                    )}
                    <BalloonStatusDot $status={status} />
                </BalloonAvatar>
                <BalloonTitleGroup>
                    <BalloonName>{name}</BalloonName>
                    <BalloonMeta>
                        <BalloonMetaItem>
                            <StarIcon />
                            {provider.rating ? provider.rating.toFixed(1) : "0.0"}
                        </BalloonMetaItem>
                        <BalloonDot />
                        <BalloonMetaItem>
                            {formatDistanceFromUser(provider.distance)}
                        </BalloonMetaItem>
                    </BalloonMeta>
                </BalloonTitleGroup>
            </BalloonHeader>

            <BalloonBody>
                <BalloonPills>
                    <BalloonStatus $status={status}>
                        {getStatusSummary(provider)}
                    </BalloonStatus>
                    <BalloonScheduleTag>
                        {formatWorkingDaysSummary(provider.workingDays)}
                    </BalloonScheduleTag>
					{(provider.liveQueueEnabled || (provider.onlineBookingEnabled && getProviderType(provider) !== ActivityType.auto_wash)) && (
                        <BalloonBookingPill>
                            {provider.liveQueueEnabled ? <ClockIcon /> : <CalendarIcon />}
                            {provider.liveQueueEnabled ? "Живая очередь" : "Запись онлайн"}
                        </BalloonBookingPill>
                    )}
                </BalloonPills>
                <BalloonAddress>
                    <MapPinIcon />
                    <span>{provider.address || "Адрес уточняется"}</span>
                </BalloonAddress>
                <BalloonTags>
                    {(tags.length > 0 ? tags : ["Заполняется"]).map((tag) => (
                        <BalloonTag key={tag}>{tag}</BalloonTag>
                    ))}
                </BalloonTags>
                {shouldShowBookingAction(provider) ? (
                    <BalloonActions $layout="booking">
                        <BalloonAction href={getDetailsHref(provider)} $variant="booking">
                            <CalendarIcon />
                            Записаться
                        </BalloonAction>
                        <BalloonAction
                            href={getPhoneHref(provider)}
                            $variant="phoneIcon"
                            aria-label="Позвонить"
                            title="Позвонить"
                        >
                            <PhoneIcon />
                        </BalloonAction>
                    </BalloonActions>
                ) : (
                    <BalloonActions>
                        <BalloonAction href={getPhoneHref(provider)} $variant="primary">
                            <PhoneIcon />
                            Позвонить
                        </BalloonAction>
                        <BalloonAction href={getDetailsHref(provider)} $variant="outline">
                            <EyeIcon />
                            Подробнее
                        </BalloonAction>
                    </BalloonActions>
                )}
            </BalloonBody>
        </ProviderCard>
    );
}

function buildBalloonHtml(provider: Provider): string {
    const sheet = new ServerStyleSheet();
    try {
        const html = ReactDOMServer.renderToStaticMarkup(
            sheet.collectStyles(
                <StyleSheetManager sheet={sheet.instance}>
                    <ThemeProvider>
                        <MapBalloonCard provider={provider} />
                    </ThemeProvider>
                </StyleSheetManager>
            )
        );
        const styleTags = sheet.getStyleTags();
        return `${styleTags}<div style="width: ${BALLOON_CARD_WIDTH}px; max-width: calc(100vw - 40px);">${html}</div>`;
    } finally {
        sheet.seal();
    }
}

export function ProvidersMap({
    masters,
    mastersRef,
    mapInstanceRef,
    height = "60vh",
    showZoomControl = true,
    showGeolocationControl = true,
    disableScrollZoom = false,
    initialZoom = DEFAULT_ZOOM,
}: Props) {
    const { userCoords } = useCoords();
    const mapRef = useRef<any>(null);
    const mapRootRef = useRef<HTMLDivElement | null>(null);
    const mapLoadStateRef = useRef<"loading" | "ready" | "error">("loading");
    const mapStageRef = useRef("api-loading");
    const mapLoadTimerRef = useRef<number | null>(null);
    const mapStartTimeRef = useRef(0);
    const tileImageErrorsRef = useRef(0);
    const tileLayerCleanupRef = useRef<(() => void) | null>(null);
    const [isInited, setIsInited] = useState(false);
    const [mapLoadState, setMapLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [mapFailureCode, setMapFailureCode] = useState<MapFailureCode | null>(null);
    const [mapAttempt, setMapAttempt] = useState(0);
    const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);

    const clearTileLayerListeners = () => {
        tileLayerCleanupRef.current?.();
        tileLayerCleanupRef.current = null;
    };

    const markMapFailed = (code: MapFailureCode) => {
        if (mapLoadStateRef.current === "ready" || mapLoadStateRef.current === "error") return;
        mapLoadStateRef.current = "error";
        setMapFailureCode(code);
        setMapLoadState("error");
        clearTileLayerListeners();
        if (mapLoadTimerRef.current !== null) {
            window.clearTimeout(mapLoadTimerRef.current);
            mapLoadTimerRef.current = null;
        }
    };

    const markMapReady = () => {
        if (mapLoadStateRef.current === "error") return;
        mapLoadStateRef.current = "ready";
        mapStageRef.current = "ready";
        setMapLoadState("ready");
        clearTileLayerListeners();
        if (mapLoadTimerRef.current !== null) {
            window.clearTimeout(mapLoadTimerRef.current);
            mapLoadTimerRef.current = null;
        }
    };

    useLayoutEffect(() => {
        mapStartTimeRef.current = performance.now();
        mapLoadStateRef.current = "loading";
        mapStageRef.current = "api-loading";
        tileImageErrorsRef.current = 0;
        setMapLoadState("loading");
        setMapFailureCode(null);
        setDiagnosticsCopied(false);
        setIsInited(false);

        const handleScriptError = (event: Event) => {
            if (isYandexApiScript(event.target)) {
                markMapFailed(classifyMapFailure(event, mapStageRef.current, mapStartTimeRef.current));
            }
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason as { target?: EventTarget | null; message?: string } | string;
            const target = typeof reason === "object" && reason !== null ? reason.target ?? null : null;
            const message = typeof reason === "string" ? reason : reason?.message || "";
            if (isYandexApiScript(target) || /api-maps\.yandex\.ru/i.test(message)) {
                markMapFailed(classifyMapFailure(reason, mapStageRef.current, mapStartTimeRef.current));
            }
        };

        const handleResourceEntries = () => {
            if (mapStageRef.current === "tiles-loading" && hasLoadedYandexMapTiles(
                getYandexMapResources(mapStartTimeRef.current),
                mapRootRef.current,
            )) {
                markMapReady();
            }
        };
        const handleTileImageLoad = (event: Event) => {
            const image = event.target;
            if (
                mapStageRef.current === "tiles-loading" &&
                image instanceof HTMLImageElement &&
                isYandexMapTileUrl(image.currentSrc || image.src)
            ) {
                markMapReady();
            }
        };
        const handleTileImageError = (event: Event) => {
            const image = event.target;
            if (image instanceof HTMLImageElement && isYandexMapTileUrl(image.currentSrc || image.src)) {
                tileImageErrorsRef.current += 1;
            }
        };

        window.addEventListener("error", handleScriptError, true);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);
        document.addEventListener("load", handleTileImageLoad, true);
        document.addEventListener("error", handleTileImageError, true);

        let resourceObserver: PerformanceObserver | null = null;
        if (typeof PerformanceObserver !== "undefined") {
            try {
                resourceObserver = new PerformanceObserver(handleResourceEntries);
                resourceObserver.observe({ type: "resource", buffered: true });
            } catch {
                resourceObserver = null;
            }
        }

        mapLoadTimerRef.current = window.setTimeout(() => {
            markMapFailed(classifyMapFailure(null, mapStageRef.current, mapStartTimeRef.current));
        }, MAP_LOAD_TIMEOUT_MS);

        return () => {
            window.removeEventListener("error", handleScriptError, true);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
            document.removeEventListener("load", handleTileImageLoad, true);
            document.removeEventListener("error", handleTileImageError, true);
            resourceObserver?.disconnect();
            clearTileLayerListeners();
            if (mapLoadTimerRef.current !== null) {
                window.clearTimeout(mapLoadTimerRef.current);
                mapLoadTimerRef.current = null;
            }
        };
    }, [mapAttempt]);

    useEffect(() => {
        if (mapRef.current && userCoords) {
            try {
            mapRef.current.setCenter(userCoords, initialZoom, {
                    duration: 300,
                });
            } catch (_) {}
        }
    }, [userCoords, isInited, initialZoom]);

    const mapState = useMemo(
        () => ({
            center: (userCoords ?? [43.21564479600424, 46.89458462676669]) as [
                number,
                number
            ],
            zoom: initialZoom,
            ...(disableScrollZoom
                ? { behaviors: ["drag", "multiTouch", "dblClickZoom", "rightMouseButtonMagnifier"] }
                : {}),
        }),
        [userCoords, disableScrollZoom, initialZoom]
    );

    const setMapRef = (ref: ymaps.Map | null) => {
        mapRef.current = ref;
        if (mapInstanceRef) {
            mapInstanceRef.current = ref;
        }
        if (!ref) {
            clearTileLayerListeners();
            return;
        }

        clearTileLayerListeners();
        setIsInited(true);
        mapStageRef.current = "tiles-loading";

        // Yandex renders its base tiles through nested layer collections. On
        // Android Chrome, cross-origin PerformanceResourceTiming entries do
        // not expose responseStatus, and the tiles are not necessarily <img>
        // elements. Use the API's tileloadchange/getTileStatus signal instead.
        const subscriptions: Array<{ events: any; handler: () => void }> = [];
        const tileReadinessChecks: Array<() => void> = [];
        const visited = new Set<any>();
        const observeTileLayer = (layerOrCollection: any, depth = 0) => {
            if (!layerOrCollection || depth > 5 || visited.has(layerOrCollection)) return;
            visited.add(layerOrCollection);

            if (typeof layerOrCollection.getTileStatus === "function") {
                const events = layerOrCollection.events;
                const handleTileLoadChange = () => {
                    try {
                        const status = layerOrCollection.getTileStatus();
                        if (Number(status?.readyTileNumber) > 0) markMapReady();
                    } catch {
                        // Keep waiting; the existing timeout will report a map error.
                    }
                };

                events?.add?.("tileloadchange", handleTileLoadChange);
                subscriptions.push({ events, handler: handleTileLoadChange });
                tileReadinessChecks.push(handleTileLoadChange);
                return;
            }

            if (typeof layerOrCollection.each === "function") {
                layerOrCollection.each((child: any) => observeTileLayer(child, depth + 1));
            }
        };

        observeTileLayer(ref.layers);
        tileLayerCleanupRef.current = () => {
            subscriptions.forEach(({ events, handler }) => {
                events?.remove?.("tileloadchange", handler);
            });
        };
        tileReadinessChecks.forEach((check) => check());

        if (hasLoadedYandexMapTiles(getYandexMapResources(mapStartTimeRef.current), mapRootRef.current)) {
            markMapReady();
        }
    };

    const handleMapError = (error: Error) => {
        markMapFailed(classifyMapFailure(error, mapStageRef.current));
    };

    const retryMap = () => {
        mapLoadStateRef.current = "loading";
        mapStageRef.current = "api-loading";
        mapRef.current = null;
        if (mapInstanceRef) mapInstanceRef.current = null;
        setMapLoadState("loading");
        setMapFailureCode(null);
        setIsInited(false);
        setDiagnosticsCopied(false);
        setMapAttempt((attempt) => attempt + 1);
    };

    const copyDiagnostics = async () => {
        const report = {
            service: "Yandex Maps JS API 2.1",
            stage: mapStageRef.current,
            failure: mapFailureCode,
            pageOrigin: window.location.origin,
            online: navigator.onLine,
            android: /Android/i.test(navigator.userAgent),
            chrome: /Chrome\//i.test(navigator.userAgent),
            tileImageErrors: tileImageErrorsRef.current,
            resources: getYandexMapResources(mapStartTimeRef.current),
        };
        const serialized = JSON.stringify(report, null, 2);

        try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(serialized);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = serialized;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand("copy");
                textarea.remove();
                if (!copied) throw new Error("clipboard-unavailable");
            }
            setDiagnosticsCopied(true);
        } catch {
            setDiagnosticsCopied(false);
        }
    };

    // Keep the map visible after its instance is created, but leave the
    // loading state in place until at least one Yandex tile resource arrives.
    const isReady = isInited;
    const handleMapClick = () => {
        mapRef.current?.balloon?.close?.();
    };

    return (
        <div ref={mapRootRef} style={{ position: "relative", width: "100%", height }}>
            <YMaps key={mapAttempt} query={{ apikey: import.meta.env.VITE_YMAPS_API_KEY }}>
                {mapLoadState !== "ready" && (
                    <MapStub
                        errorCode={mapLoadState === "error" ? mapFailureCode : null}
                        onRetry={retryMap}
                        onCopyDiagnostics={copyDiagnostics}
                        copied={diagnosticsCopied}
                    />
                )}
                <MapContainer $isReady={isReady}>
                    <Map
                        state={mapState}
                        width="100%"
                        height={height}
                        instanceRef={setMapRef}
                        onLoad={() => { mapStageRef.current = "map-initializing"; }}
                        onError={handleMapError}
                        onClick={handleMapClick}
                    >
                        {showZoomControl && (
                            <ZoomControl
                                options={{ position: { right: 16, top: 16 } }}
                            />
                        )}
                        {showGeolocationControl && (
                            <GeolocationControl
                                options={{ position: { right: 16, bottom: 32 } }}
                            />
                        )}

                        {masters.map((m) => {
                            const icon = getIconForStatus(
                                m.activityType,
                                m.currentStatus
                            );
                            return (
                                <Placemark
                                    instanceRef={(el) => {
                                        mastersRef.current[m.id] = el;
                                    }}
                                    height={500}
                                    key={m.id}
                                    geometry={[
                                        m.coordinates.x,
                                        m.coordinates.y,
                                    ]}
                                    options={{
                                        iconLayout: "default#image",
                                        iconImageHref: icon.href,
                                        iconImageSize: icon.size,
                                        iconImageOffset: icon.offset,
                                        balloonMaxWidth: BALLOON_CARD_WIDTH,
                                        balloonMaxHeight: BALLOON_MAX_HEIGHT,
                                        balloonPanelMaxMapArea: 0,
                                        balloonAutoPanMargin: [24, 24, 24, 24],
                                        hideIconOnBalloonOpen: false,
                                    }}
                                    modules={[
                                        "geoObject.addon.balloon",
                                        "geoObject.addon.hint",
                                    ]}
                                    properties={{
                                        iconCaption: m.address,
                                        balloonContent: buildBalloonHtml(m),
                                    }}
                                />
                            );
                        })}
                    </Map>
                </MapContainer>
            </YMaps>
        </div>
    );
}
