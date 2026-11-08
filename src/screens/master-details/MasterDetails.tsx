import { useSearchParams } from "react-router-dom";
import { Avatar, useMediaQuery } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AuthLayout } from "@modules/layout/features/AuthLayout";
import { Master, MasterAccountHeader } from "@modules/masters";
import { fetchProviderByTypeAndId } from "@modules/providers/api";
import { fetchMasterById } from "@modules/masters/domain/api";
import { ActivityType } from "@modules/providers";
import { getProviderReviews } from "@modules/reviews";
import { Card } from "@common/components";
import {
    Container,
    StyledCardContent,
    BoxWrapper,
    StyledCardHeader,
    MapWrapper,
    SpecializationSection,
    SpecializationTags,
    WorkingDay,
} from "./styles";
import { CameraIcon, ClockIcon, LocationIcon, StarIcon, UserIcon } from "@common/icons";
import { Map, Placemark, YMaps, ZoomControl } from "@pbe/react-yandex-maps";
import { useMemo, useRef } from "react";
import { DEFAULT_ZOOM } from "@modules/masters/domain/constants";
import { useCoords, useUserProfile } from "@common/hooks";
import { getIconForStatus } from "@modules/providers/features/ProvidersMap/ProvidersMap";
import { StoryHighlights } from "@modules/stories";
import { MobileMasterProfile } from "./MobileMasterProfile";

const getDetailsTitle = (activityType: ActivityType) => {
    switch (activityType) {
        case ActivityType.auto_service:
            return "Профиль автосервиса";
        case ActivityType.auto_shop:
            return "Профиль автомагазина";
        case ActivityType.auto_wash:
            return "Профиль автомойки";
        default:
            return "Профиль мастера";
    }
};

function getReviewAuthorName(review: { from?: { name?: string | null; phone?: string } | null }) {
    return review.from?.name || review.from?.phone || "Клиент";
}

function getReviewAuthorInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "К";
    return words
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("");
}

export const MasterDetailsScreen = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");
    const rawType = searchParams.get("type");
    const activityType = Object.values(ActivityType).includes(
        rawType as ActivityType
    )
        ? (rawType as ActivityType)
        : ActivityType.master;
    const mapRef = useRef<any>(null);
    const { userCoords } = useCoords();
    const { profile: currentProfile } = useUserProfile();
    const isMobile = useMediaQuery("(max-width: 1024px)");
    const {
        data: provider,
        isLoading,
        error,
    } = useQuery<Master>({
        queryKey: ["provider", activityType, id, userCoords],
        queryFn: () => {
            return fetchProviderByTypeAndId(
                activityType,
                id!,
                userCoords?.[0],
                userCoords?.[1]
            ) as Promise<Master>;
        },
        enabled: !!id,
        retry: false,
    });
    const { data: mobileMaster } = useQuery<Master>({
        queryKey: ["masterProfile", id],
        queryFn: () => fetchMasterById(id!),
        enabled: Boolean(id) && activityType === ActivityType.master && isMobile,
        staleTime: 30_000,
    });
    const { data: reviews = [] } = useQuery({
        queryKey: ["providerReviews", provider?.userId],
        queryFn: () => getProviderReviews(provider!.userId),
        enabled: Boolean(provider?.userId),
    });
    const mapState = useMemo(
        () => ({
            center: provider
                ? [provider.coordinates.x, provider.coordinates.y]
                : [0, 0],
            zoom: DEFAULT_ZOOM,
        }),
        [provider]
    );
    const title = getDetailsTitle(activityType);

    if (isLoading) {
        return (
            <AuthLayout title={title}>
                <div>Загрузка...</div>
            </AuthLayout>
        );
    }

    if (error || !provider) {
        return (
            <AuthLayout title={title}>
                <div>Ошибка загрузки профиля</div>
            </AuthLayout>
        );
    }

    if (isMobile && activityType === ActivityType.master) {
        return <MobileMasterProfile master={mobileMaster || provider} />;
    }

    const icon = getIconForStatus(provider.activityType, provider.currentStatus);

    const showAutoServiceDetails =
        provider.activityType === ActivityType.auto_service &&
        (provider.hasParking !== undefined ||
            provider.liftCount !== undefined ||
            provider.warranty !== undefined ||
            provider.hotline ||
            (provider.brandSupport?.length ?? 0) > 0);

    return (
        <AuthLayout title={title}>
            <Container>
                <MasterAccountHeader master={provider} />
                <StoryHighlights
                    authorId={provider.userId}
                    manage={currentProfile?.id === provider.userId}
                />
                {provider.workFrom && provider.workTo && (
                    <BoxWrapper>
                        <Card>
                            <StyledCardHeader>
                                <ClockIcon />
                                График работы
                            </StyledCardHeader>
                            <StyledCardContent>
                                {`С ${provider.workFrom} - До ${provider.workTo}`}
                                <SpecializationSection>
                                    <SpecializationTags>
                                        {[
                                            "пн",
                                            "вт",
                                            "ср",
                                            "чт",
                                            "пт",
                                            "сб",
                                            "вс",
                                        ].map((day, index) => (
                                            <WorkingDay
                                                key={day}
                                                style={{
                                                    backgroundColor: provider
                                                        .workingDays?.[index]
                                                        ? "#ecfdf5"
                                                        : "#f1f5f9",
                                                    color: provider.workingDays?.[
                                                        index
                                                    ]
                                                        ? "#10b981"
                                                        : "#9ca3af",
                                                }}
                                            >
                                                {day}
                                            </WorkingDay>
                                        ))}
                                    </SpecializationTags>
                                </SpecializationSection>
                            </StyledCardContent>
                        </Card>
                    </BoxWrapper>
                )}
                <BoxWrapper>
                    <Card>
                        <StyledCardHeader>
                            <LocationIcon />
                            Местоположение
                        </StyledCardHeader>
                        <StyledCardContent>
                            <MapWrapper>
                                {provider?.address}
                                <YMaps
                                    query={{
                                        apikey: import.meta.env
                                            .VITE_YMAPS_API_KEY,
                                    }}
                                >
                                    <Map
                                        state={mapState}
                                        width="100%"
                                        height="30vh"
                                        instanceRef={(ref) =>
                                            (mapRef.current = ref)
                                        }
                                    >
                                        <ZoomControl
                                            options={{
                                                position: {
                                                    right: 16,
                                                    top: 16,
                                                },
                                            }}
                                        />
                                        {userCoords && (
                                            <Placemark
                                                key="__user__"
                                                geometry={userCoords}
                                                options={{
                                                    preset: "islands#blueCircleDotIcon",
                                                }}
                                                properties={{
                                                    hintContent: "Вы здесь",
                                                }}
                                            />
                                        )}
                                        <Placemark
                                            height={500}
                                            geometry={[
                                                provider?.coordinates.x,
                                                provider?.coordinates.y,
                                            ]}
                                            options={{
                                                iconLayout: "default#image",
                                                iconImageHref: icon.href,
                                                iconImageSize: icon.size,
                                                iconImageOffset: icon.offset,
                                            }}
                                            modules={[
                                                "geoObject.addon.balloon",
                                                "geoObject.addon.hint",
                                            ]}
                                            properties={{
                                                iconCaption: provider?.address,
                                            }}
                                        />
                                    </Map>
                                </YMaps>
                            </MapWrapper>
                        </StyledCardContent>
                    </Card>
                </BoxWrapper>
                {showAutoServiceDetails && (
                    <BoxWrapper>
                        <Card>
                            <StyledCardHeader>
                                <UserIcon />
                                Детали автосервиса
                            </StyledCardHeader>
                            <StyledCardContent>
                                <SpecializationSection>
                                    <SpecializationTags>
                                        {provider.hasParking !== undefined && (
                                            <WorkingDay
                                                style={{
                                                    backgroundColor: "#f1f5f9",
                                                    color: "#374151",
                                                }}
                                            >
                                                Парковка: {provider.hasParking ? "Да" : "Нет"}
                                            </WorkingDay>
                                        )}
                                        {provider.liftCount !== undefined && (
                                            <WorkingDay
                                                style={{
                                                    backgroundColor: "#f1f5f9",
                                                    color: "#374151",
                                                }}
                                            >
                                                Постов: {provider.liftCount}
                                            </WorkingDay>
                                        )}
                                        {provider.warranty !== undefined && (
                                            <WorkingDay
                                                style={{
                                                    backgroundColor: "#f1f5f9",
                                                    color: "#374151",
                                                }}
                                            >
                                                Гарантия: {provider.warranty ? "Да" : "Нет"}
                                            </WorkingDay>
                                        )}
                                    </SpecializationTags>
                                </SpecializationSection>
                                {provider.hotline && (
                                    <div>Горячая линия: {provider.hotline}</div>
                                )}
                                {(provider.brandSupport?.length ?? 0) > 0 && (
                                    <SpecializationSection>
                                        <SpecializationTags>
                                            {provider.brandSupport?.map((brand) => (
                                                <WorkingDay
                                                    key={brand}
                                                    style={{
                                                        backgroundColor: "#f1f5f9",
                                                        color: "#374151",
                                                    }}
                                                >
                                                    {brand}
                                                </WorkingDay>
                                            ))}
                                        </SpecializationTags>
                                    </SpecializationSection>
                                )}
                            </StyledCardContent>
                        </Card>
                    </BoxWrapper>
                )}
                <BoxWrapper>
                    <Card>
                        <StyledCardHeader>
                            <StarIcon />
                            Отзывы
                        </StyledCardHeader>
                        <StyledCardContent>
                            {reviews.length === 0 ? (
                                <span>Пока нет отзывов</span>
                            ) : (
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <StarIcon width={18} height={18} />
                                        <strong>
                                            {(
                                                reviews.reduce(
                                                    (sum, review) => sum + review.rating,
                                                    0,
                                                ) / reviews.length
                                            ).toFixed(1)}
                                        </strong>
                                        <span>
                                            {reviews.length} {reviews.length === 1 ? "отзыв" : "отзывов"}
                                        </span>
                                    </div>
                                    <div style={{ display: "grid", gap: 12 }}>
                                        {reviews.slice(0, 5).map((review) => (
                                            <div
                                                key={review.id}
                                                style={{
                                                    padding: 12,
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 14,
                                                    background: "#f8fafc",
                                                    boxShadow: "0 3px 12px rgba(30, 41, 59, 0.06)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <Avatar
                                                            src={review.from?.avatarUrl ?? undefined}
                                                            alt={getReviewAuthorName(review)}
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                flexShrink: 0,
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                backgroundColor: "#dbeafe",
                                                                color: "#1d4ed8",
                                                            }}
                                                        >
                                                            {getReviewAuthorInitials(getReviewAuthorName(review))}
                                                        </Avatar>
                                                        <strong
                                                            style={{
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {getReviewAuthorName(review)}
                                                        </strong>
                                                    </div>
                                                    <small style={{ color: "#9ca3af" }}>
                                                        {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                                                    </small>
                                                </div>
                                                <div style={{ marginTop: 6 }}>
                                                    <span style={{ color: "#f59e0b", letterSpacing: 1 }}>
                                                        {"★".repeat(review.rating)}
                                                        <span style={{ color: "#d1d5db" }}>
                                                            {"★".repeat(5 - review.rating)}
                                                        </span>
                                                    </span>
                                                </div>
                                                {review.comment && (
                                                    <div style={{ marginTop: 6, lineHeight: 1.45 }}>
                                                        {review.comment}
                                                    </div>
                                                )}
                                                {review.tags && review.tags.length > 0 && (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: 6,
                                                            marginTop: 8,
                                                        }}
                                                    >
                                                        {review.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                style={{
                                                                    padding: "3px 8px",
                                                                    borderRadius: 999,
                                                                    background: "#f1f5f9",
                                                                    color: "#475569",
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </StyledCardContent>
                    </Card>
                </BoxWrapper>
                <BoxWrapper>
                    <Card>
                        <StyledCardHeader>
                            <CameraIcon />
                            Фото работ
                        </StyledCardHeader>
                        <StyledCardContent>
                            <center>
                                <span>Скоро...</span>
                            </center>
                        </StyledCardContent>
                    </Card>
                </BoxWrapper>
            </Container>
        </AuthLayout>
    );
};
