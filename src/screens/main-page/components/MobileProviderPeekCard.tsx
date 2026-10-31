import { styled } from "styled-components";
import { useUserProfile } from "@common/hooks";
import { ActivityType, Provider } from "@modules/providers";
import { MasterStatus } from "@modules/masters";
import {
    CalendarIcon,
    ClockIcon,
    CrossIcon,
    MapPinIcon,
    PhoneIcon,
    StarIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";

interface MobileProviderPeekCardProps {
    provider: Provider;
    onClose: () => void;
    onDetailsClick?: (provider: Provider) => void;
}

function getProviderType(provider: Provider): ActivityType {
    return provider.activityType || ActivityType.master;
}

function getCategoryLabel(type: ActivityType): string {
    switch (type) {
        case ActivityType.master:
            return "Частный мастер";
        case ActivityType.auto_service:
            return "Автосервис";
        case ActivityType.auto_wash:
            return "Автомойка";
        case ActivityType.auto_shop:
            return "Автомагазин";
        default:
            return "Специалист";
    }
}

function getStatusBadge(status?: MasterStatus) {
    if (status === MasterStatus.AVAILABLE) {
        return { label: "Свободен сейчас", color: "#16a34a", bg: "#f0fdf4" };
    }
    if (status === MasterStatus.SCHEDULE) {
        return { label: "По расписанию", color: "#d97706", bg: "#fffbeb" };
    }
    return { label: "Не работает", color: "#6b7280", bg: "#f3f4f6" };
}

const CardOverlay = styled.div`
    position: fixed;
    bottom: max(24px, env(safe-area-inset-bottom, 24px));
    left: 12px;
    right: 12px;
    max-width: 480px;
    margin: 0 auto;
    z-index: 100000;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;
    padding: 16px;
    animation: peek-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;

    @keyframes peek-slide-up {
        from {
            transform: translateY(24px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;

const DragBar = styled.div`
    width: 36px;
    height: 4px;
    background: #e2e8f0;
    border-radius: 999px;
    margin: -6px auto 10px;
`;

const CloseButton = styled.button`
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f1f5f9;
    border: none;
    display: grid;
    place-items: center;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: #e2e8f0;
        color: #1e293b;
    }
`;

const MainInfoRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-start;
`;

const AvatarBox = styled.div`
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 14px;
    overflow: hidden;
    background: #f1f5f9;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 1px solid #e2e8f0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    span {
        font-size: 18px;
        font-weight: 800;
        color: #3b82f6;
    }
`;

const StatusDot = styled.span<{ $color: string }>`
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    border: 2px solid #ffffff;
`;

const MetaCol = styled.div`
    flex: 1;
    min-width: 0;
    padding-right: 28px;
`;

const CategoryTag = styled.span`
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
`;

const NameTitle = styled.h3`
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const RatingDistanceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #475569;
`;

const RatingPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-weight: 700;
    color: #b45309;

    svg {
        width: 13px;
        height: 13px;
        fill: #f59e0b;
        color: #f59e0b;
    }
`;

const DistanceText = styled.span`
    font-weight: 600;
    color: #2563eb;
    background: #eff6ff;
    padding: 2px 6px;
    border-radius: 6px;
`;

const StatusPillBadge = styled.span<{ $color: string; $bg: string }>`
    font-size: 11px;
    font-weight: 700;
    color: ${({ $color }) => $color};
    background: ${({ $bg }) => $bg};
    padding: 2px 7px;
    border-radius: 6px;
`;

const AddressRow = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 10px;
    font-size: 12px;
    color: #64748b;
    line-height: 1.3;

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: #94a3b8;
    }

    span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const TagsRow = styled.div`
    display: flex;
    gap: 5px;
    overflow-x: auto;
    margin-top: 8px;
    padding-bottom: 2px;
    scrollbar-width: none;
    &::-webkit-scrollbar {
        display: none;
    }
`;

const TagChip = styled.span`
    font-size: 11px;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 2px 8px;
    border-radius: 6px;
    white-space: nowrap;
`;

const ActionRow = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
`;

const PrimaryLink = styled.button`
    flex: 1;
    height: 42px;
    border-radius: 12px;
    background: #1e293b;
    color: #ffffff !important;
    font-size: 13.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
        background: #0f172a;
    }
`;

const BookingLink = styled.button`
    flex: 1;
    height: 42px;
    border-radius: 12px;
    background: #2563eb;
    color: #ffffff !important;
    font-size: 13.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
        background: #1d4ed8;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const PhoneButton = styled.a`
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    color: #16a34a;
    display: grid;
    place-items: center;
    text-decoration: none;
    flex-shrink: 0;
    transition: all 0.15s ease;

    &:hover {
        background: #dcfce7;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

export const MobileProviderPeekCard = ({
    provider,
    onClose,
    onDetailsClick,
}: MobileProviderPeekCardProps) => {
    const { profile: currentProfile } = useUserProfile();
    const type = getProviderType(provider);
    const categoryLabel = getCategoryLabel(type);
    const displayName =
        provider.fullName ||
        provider.businessName ||
        provider.name ||
        "Специалист";
    const status = provider.currentStatus || provider.status;
    const statusInfo = getStatusBadge(status);
    const rating = provider.rating || 0;
    const reviewsCount = provider.reviewsCount || 0;
    const detailsUrl = `/provider?id=${provider.id}&type=${type}`;
    const phone = provider.workingPhone || provider.phone;
    const distance = formatDistanceFromUser(provider.distance);
    const tags = [
        ...(provider.professions || []),
        ...(provider.services || []),
        ...(provider.autoMarks || []),
    ].slice(0, 4);
    const isSelfProvider = Boolean(currentProfile?.id && currentProfile.id === provider.userId);
    const professionalAvatarUrl = provider.avatarUrl || provider.coverImageUrl || provider.coverImage;

    return (
        <CardOverlay>
            <DragBar />
            <CloseButton onClick={onClose} aria-label="Закрыть">
                <CrossIcon style={{ width: 12, height: 12 }} />
            </CloseButton>

            <MainInfoRow>
                <AvatarBox>
                    {professionalAvatarUrl ? (
                        <img
                            src={professionalAvatarUrl}
                            alt={displayName}
                        />
                    ) : (
                        <span>{displayName[0]?.toUpperCase() || "A"}</span>
                    )}
                    <StatusDot $color={statusInfo.color} />
                </AvatarBox>

                <MetaCol>
                    <CategoryTag>{categoryLabel}</CategoryTag>
                    <NameTitle title={displayName}>{displayName}</NameTitle>
                    <RatingDistanceRow>
                        <RatingPill>
                            <StarIcon />
                            <span>{rating > 0 ? rating.toFixed(1) : "0.0"}</span>
                            {reviewsCount > 0 && <span>({reviewsCount})</span>}
                        </RatingPill>
                        {distance && <DistanceText>{distance}</DistanceText>}
                        <StatusPillBadge
                            $color={statusInfo.color}
                            $bg={statusInfo.bg}
                        >
                            {statusInfo.label}
                        </StatusPillBadge>
                    </RatingDistanceRow>
                </MetaCol>
            </MainInfoRow>

            {provider.address && (
                <AddressRow>
                    <MapPinIcon />
                    <span>{provider.address}</span>
                </AddressRow>
            )}

            {tags.length > 0 && (
                <TagsRow>
                    {tags.map((tag) => (
                        <TagChip key={tag}>{tag}</TagChip>
                    ))}
                </TagsRow>
            )}

            <ActionRow>
                {isSelfProvider ? (
                    <PrimaryLink as="button" onClick={(e) => { e.preventDefault(); if (onDetailsClick) { onDetailsClick(provider); } else { window.location.href = detailsUrl; } }}>Подробнее</PrimaryLink>
                ) : provider.liveQueueEnabled ? (
                    <BookingLink as="button" onClick={(e) => { e.preventDefault(); if (onDetailsClick) { onDetailsClick(provider); } else { window.location.href = detailsUrl; } }}>
                        <ClockIcon />
                        Живая очередь
                    </BookingLink>
				) : provider.onlineBookingEnabled && getProviderType(provider) !== ActivityType.auto_wash ? (
                    <BookingLink as="button" onClick={(e) => { e.preventDefault(); if (onDetailsClick) { onDetailsClick(provider); } else { window.location.href = detailsUrl; } }}>
                        <CalendarIcon />
                        Записаться
                    </BookingLink>
                ) : (
                    <PrimaryLink as="button" onClick={(e) => { e.preventDefault(); if (onDetailsClick) { onDetailsClick(provider); } else { window.location.href = detailsUrl; } }}>Подробнее</PrimaryLink>
                )}

                {phone && (
                    <PhoneButton href={`tel:${phone}`} aria-label="Позвонить">
                        <PhoneIcon />
                    </PhoneButton>
                )}
            </ActionRow>
        </CardOverlay>
    );
};
