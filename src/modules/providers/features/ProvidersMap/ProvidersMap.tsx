import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import {
    Map,
    Placemark,
    YMaps,
    Clusterer,
    useYMaps,
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
    AutoServiceCategoryIcon,
    AvailableMasterIcon,
    AutoWashCategoryIcon,
    BusyMasterIcon,
    CalendarIcon,
    ClockIcon,
    EyeIcon,
    MapPinIcon,
    PhoneIcon,
    PrivateMasterCategoryIcon,
    ServiceCenterCategoryIcon,
    AutoShopCategoryIcon,
    StarIcon,
    UnavailableMasterIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { MasterStatus } from "@modules/masters";
import { ActivityType, Provider } from "@modules/providers";
import { useCoords } from "@common/hooks";
import { MapStub } from "../MapStub";
import { ThemeProvider } from "@common/theme";

type Props = {
    masters: Provider[];
    mastersRef: any;
    mapInstanceRef?: MutableRefObject<any | null>;
    isLoading: boolean;
    height?: string;
    onSelectProvider?: (provider: Provider) => void;
};

type VisualStatus = "on" | "busy" | "off";
const WEEK_DAYS_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function getIconForStatus(
    activityTypeOrStatus?: ActivityType | MasterStatus | string,
    currentStatus: MasterStatus = MasterStatus.UNAVAILABLE
) {
    const raw = String(activityTypeOrStatus || "");
    let resolvedActivityType: ActivityType | undefined = undefined;
    if (raw === "auto_service" || raw === "1") resolvedActivityType = ActivityType.auto_service;
    else if (raw === "auto_shop" || raw === "4") resolvedActivityType = ActivityType.auto_shop;
    else if (raw === "auto_wash" || raw === "3") resolvedActivityType = ActivityType.auto_wash;
    else if (raw === "master" || raw === "2") resolvedActivityType = ActivityType.master;

    const resolvedStatus =
        resolvedActivityType === undefined &&
        activityTypeOrStatus !== undefined
            ? (activityTypeOrStatus as MasterStatus)
            : currentStatus;

    if (resolvedActivityType === ActivityType.auto_service) {
        return {
            href: AutoServiceCategoryIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.auto_shop) {
        return {
            href: AutoShopCategoryIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.auto_wash) {
        return {
            href: AutoWashCategoryIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }

    if (resolvedActivityType === ActivityType.master) {
        return {
            href: PrivateMasterCategoryIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }

    if (resolvedStatus === MasterStatus.AVAILABLE) {
        return {
            href: AvailableMasterIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }
    if (resolvedStatus === MasterStatus.SCHEDULE) {
        return {
            href: BusyMasterIcon,
            size: [54, 54] as [number, number],
            offset: [-27, -46] as [number, number],
        };
    }
    return {
        href: UnavailableMasterIcon,
        size: [54, 54] as [number, number],
        offset: [-27, -46] as [number, number],
    };
}

function getProviderType(provider: Provider): ActivityType {
    const raw = String(provider.activityType || (provider as any).providerType || (provider as any).activityTypeId || "");
    if (raw === "auto_service" || raw === "1") return ActivityType.auto_service;
    if (raw === "auto_wash" || raw === "3") return ActivityType.auto_wash;
    if (raw === "auto_shop" || raw === "4") return ActivityType.auto_shop;
    return ActivityType.master;
}

function isMasterProvider(provider: Provider): boolean {
    return getProviderType(provider) === ActivityType.master;
}

function shouldShowBookingAction(provider: Provider): boolean {
    const type = getProviderType(provider);

    return (
        Boolean(provider.onlineBookingEnabled) &&
        !provider.liveQueueEnabled &&
		type !== ActivityType.auto_wash &&
        (type === ActivityType.master ||
            type === ActivityType.auto_service)
    );
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
    // Keep personal account avatars out of professional map cards.
    return isMasterProvider(provider)
        ? provider.avatarUrl || undefined
        : getCoverUrl(provider);
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

interface ClusteredProvidersProps {
    masters: Provider[];
    mastersRef: any;
    onSelectProvider?: (provider: Provider) => void;
}

function ClusteredProviders({ masters, mastersRef, onSelectProvider }: ClusteredProvidersProps) {
    const ymaps = useYMaps(["templateLayoutFactory"]);

    const clusterOptions = useMemo(() => {
        const baseOptions = {
            preset: "islands#invertedDarkBlueClusterIcons",
            groupByCoordinates: false,
            clusterDisableClickZoom: false,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false,
            gridSize: 72,
            minClusterSize: 2,
        };

        if (!ymaps?.templateLayoutFactory) return baseOptions;

        // Custom cluster label showing "+N" (e.g. "+5", "+3") when zooming out
        const customContentLayout = ymaps.templateLayoutFactory.createClass(
            '<div style="font-size: 14px; font-weight: 800; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">+{{ properties.geoObjects.length }}</div>'
        );

        return {
            ...baseOptions,
            clusterIconContentLayout: customContentLayout,
        };
    }, [ymaps]);

    return (
        <Clusterer options={clusterOptions}>
            {masters.map((m) => {
                const providerType = getProviderType(m);
                const icon = getIconForStatus(
                    providerType,
                    m.currentStatus
                );
                return (
                    <Placemark
                        instanceRef={(el) => {
                            if (mastersRef?.current) {
                                mastersRef.current[m.id] = el;
                            }
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
                        onClick={() => {
                            if (onSelectProvider) {
                                onSelectProvider(m);
                            }
                        }}
                    />
                );
            })}
        </Clusterer>
    );
}

export function ProvidersMap({
    masters,
    mastersRef,
    mapInstanceRef,
    isLoading,
    height = "60vh",
    onSelectProvider,
}: Props) {
    const { userCoords } = useCoords();
    const mapRef = useRef<any>(null);
    const [isInited, setIsInited] = useState(false);

    useEffect(() => {
        if (mapRef.current) {
            try {
                mapRef.current.setCenter(userCoords, DEFAULT_ZOOM, {
                    duration: 300,
                });
            } catch (_) {}
        }
    }, [userCoords, mapRef.current]);

    const mapState = useMemo(
        () => ({
            center: (userCoords ?? [43.21564479600424, 46.89458462676669]) as [
                number,
                number
            ],
            zoom: DEFAULT_ZOOM,
        }),
        [userCoords]
    );

    const setMapRef = (ref: ymaps.Map | null) => {
        mapRef.current = ref;
        if (mapInstanceRef) {
            mapInstanceRef.current = ref;
        }
        if (ref) {
            setIsInited(true);
        }
    };

    const isReady = isInited && !isLoading;
    const handleMapClick = () => {
        mapRef.current?.balloon?.close?.();
    };

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <YMaps query={{ apikey: import.meta.env.VITE_YMAPS_API_KEY }}>
                {!isReady && <MapStub />}
                <MapContainer $isReady={isReady}>
                    <Map
                        state={mapState}
                        width="100%"
                        height={height}
                        instanceRef={setMapRef}
                        onClick={handleMapClick}
                    >
                        <ClusteredProviders
                            masters={masters}
                            mastersRef={mastersRef}
                            onSelectProvider={onSelectProvider}
                        />
                    </Map>
                </MapContainer>
            </YMaps>
        </div>
    );
}
