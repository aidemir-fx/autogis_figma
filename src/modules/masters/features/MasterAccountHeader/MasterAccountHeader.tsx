import { useState } from "react";
import { Button, Card } from "@common/components";
import {
    CalendarIcon,
    MapPinIcon,
    PhoneIcon,
    StarIcon,
    WrenchIcon,
} from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
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
} from "./styles";
import { toast } from "react-toastify";
import { MakeAppointmentButton } from "./styles";
import { CreateOrderModal } from "../CreateOrderModal";
import { useAuth, useUserProfile } from "@common/hooks";
import { useNavigate } from "react-router-dom";
import { MasterStatus } from "@modules/masters/types";
import { StoryRing, StorySubscriptionButton } from "@modules/stories";

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
    const navigate = useNavigate();
    const statusInfo = statusConfig[master.currentStatus || master.status];
    const coverUrl = master.coverImageUrl || master.coverImage;
    const showCover = Boolean(coverUrl && master.activityType && master.activityType !== "master");
    const professionalAvatarUrl = showCover ? coverUrl : undefined;
    const isSelfProfile = Boolean(currentProfile?.id && currentProfile.id === master.userId);

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
                    <MasterInfo>
                        <StoryRing
                            authorId={master.userId}
                            size={64}
                            interactive
                            manage={Boolean(currentProfile?.id === master.userId)}
                        >
                            <Avatar>
                                {professionalAvatarUrl && !avatarFailed ? (
                                    <AvatarImage
                                        src={professionalAvatarUrl}
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
