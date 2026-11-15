import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@common/components";
import {
    CalendarIcon,
    MapPinIcon,
    PhoneIcon,
    StarIcon,
    WrenchIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { formatRegistrationDate } from "@common/lib/formatRegistrationDate";
import { Master } from "@modules/masters/types";
import { MasterInfo, MasterName } from "./styles";
import {
    AvatarImage,
    AvatarFallback,
    MasterDetails,
    RatingContainer,
    RatingText,
    ReviewCount,
    DistanceContainer,
    DistanceText,
    StatusBadge,
    StatusDot,
    ContentContainer,
    SpecializationSection,
    SpecializationHeader,
    SpecializationLabel,
    SpecializationTags,
    SpecializationTag,
    Avatar,
    CoverHero,
    CoverHeroImage,
    DetailsHeader,
    DescriptionWrapper,
    RegistrationDate,
} from "./styles";
import { toast } from "react-toastify";
import { MakeAppointmentButton } from "./styles";
import { CreateOrderModal } from "../CreateOrderModal";
import { useAuth, useUserProfile } from "@common/hooks";
import { useNavigate } from "react-router-dom";
import { MasterStatus } from "@modules/masters/types";
import { StoryRing, StorySubscriptionButton } from "@modules/stories";
import { getAccountAvatarUrl } from "@modules/media/api";

const statusConfig: Record<
    MasterStatus,
    {
        label: string;
        color: string;
        textColor: string;
        bgColor: string;
    }
> = {
    [MasterStatus.AVAILABLE]: {
        label: "Открыто",
        color: "#10b981",
        textColor: "#047857",
        bgColor: "#ecfdf5",
    },
    [MasterStatus.SCHEDULE]: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
    [MasterStatus.UNAVAILABLE]: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
};

// Components
export const MasterAccountHeader = ({ master }: { master: Master }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [avatarFailed, setAvatarFailed] = useState(false);
    const { isAuthenticated } = useAuth();
    const { profile: currentProfile } = useUserProfile({ enabled: isAuthenticated });
    const accountAvatarQuery = useQuery({
        queryKey: ["account-avatar", master.userId],
        queryFn: () => getAccountAvatarUrl(master.userId),
        enabled: Boolean(master.userId),
        staleTime: 5 * 60_000,
    });
    const navigate = useNavigate();
    const statusInfo = statusConfig[master.currentStatus || master.status];
    const coverUrl = master.coverImageUrl || master.coverImage;
    const isMasterProfile = (master.activityType ?? master.providerType ?? "master") === "master";
    const showCover = Boolean(coverUrl && !isMasterProfile);
    const profileAvatarUrl = isMasterProfile ? accountAvatarQuery.data ?? undefined : undefined;
    const isSelfProfile = Boolean(currentProfile?.id && currentProfile.id === master.userId);
    const registrationDate = formatRegistrationDate(master.createdAt);

    const specs = [
        ...master.professions,
        ...master.services,
        ...master.autoMarks,
    ];

    const handleMakeAppointment = () => {
        if (isSelfProfile) {
            toast.info("Нельзя оставить заявку самому себе");
            return;
        }
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        setIsModalOpen(true);
    };

    return (
        <>
            <Card>
                {showCover && (
                    <CoverHero>
                        <CoverHeroImage src={coverUrl} alt={master.fullName} />
                    </CoverHero>
                )}
                <Card.Header>
                    <MasterInfo $hasAvatar={isMasterProfile}>
                        {isMasterProfile && (
                            <StoryRing
                                authorId={master.userId}
                                size={64}
                                interactive
                                manage={Boolean(currentProfile?.id === master.userId)}
                            >
                                <Avatar>
                                    {profileAvatarUrl && !avatarFailed ? (
                                        <AvatarImage
                                            src={profileAvatarUrl}
                                            alt={master.fullName}
                                            onError={() => setAvatarFailed(true)}
                                        />
                                    ) : (
                                        <AvatarFallback>
                                            {master.fullName
                                                ?.split(" ")
                                                .map((n: string) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                            </StoryRing>
                        )}
                        <MasterDetails>
                            <DetailsHeader>
                                <MasterName>{master.fullName}</MasterName>
                                <StorySubscriptionButton authorId={master.userId} />
                                <RatingContainer>
                                    <StarIcon />
                                    <RatingText>
                                        {master.rating > 0 ? master.rating.toFixed(1) : "—"}
                                    </RatingText>
                                    <ReviewCount>({master.reviewsCount || 0})</ReviewCount>
                                </RatingContainer>
                            </DetailsHeader>
                            {registrationDate && <RegistrationDate>На АвтоГис с {registrationDate}</RegistrationDate>}
                            <DistanceContainer>
                                <MapPinIcon color="#3b82f6" />

                                <DistanceText>
                                    {formatDistanceFromUser(master.distance)}
                                </DistanceText>
                            </DistanceContainer>
                            <StatusBadge
                                bgColor={statusInfo.bgColor}
                                textColor={statusInfo.textColor}
                            >
                                <StatusDot color={statusInfo.color} />
                                {statusInfo.label}
                            </StatusBadge>
                        </MasterDetails>
                    </MasterInfo>
                </Card.Header>

                <Card.Content>
                    <ContentContainer>
                        <DescriptionWrapper>
                            {master.description}
                        </DescriptionWrapper>
                        <SpecializationSection>
                            <SpecializationHeader>
                                <WrenchIcon color="#64748b" />
                                <SpecializationLabel>
                                    Специализация:
                                </SpecializationLabel>
                            </SpecializationHeader>
                            <SpecializationTags>
                                {specs.length > 0 ? (
                                    specs.map((spec, index) => (
                                        <>
                                            <SpecializationTag key={index}>
                                                {spec}
                                            </SpecializationTag>
                                        </>
                                    ))
                                ) : (
                                    <SpecializationTag>
                                        Нет специализаций
                                    </SpecializationTag>
                                )}
                            </SpecializationTags>
                        </SpecializationSection>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "8px",
                            }}
                        >
                            <Button
                                icon={<PhoneIcon />}
                                isFullWidth
                                onClick={() => {
                                    if (master.workingPhone) {
                                        window.location.href = `tel:${master.workingPhone}`;
                                    }
                                }}
                            >
                                Позвонить
                            </Button>

                            <MakeAppointmentButton
                                icon={<CalendarIcon />}
                                variant="outlined"
                                isFullWidth
                                onClick={handleMakeAppointment}
                                disabled={isSelfProfile}
                            >
                                Оставить заявку
                            </MakeAppointmentButton>
                        </div>
                    </ContentContainer>
                </Card.Content>
            </Card>

            <CreateOrderModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                providers={[master]}
            />
        </>
    );
};
