import { useState } from "react";
import { MapPinIcon, StarIcon } from "@common/icons";
import { formatDistanceFromUser } from "@common/lib/formatDistance";
import { Master } from "@common/types";
import { MasterInfo, MasterName, WorkingDay } from "./styles";
import {
    AvatarFallback,
    AvatarImage,
    MasterDetails,
    RatingContainer,
    RatingText,
    ReviewCount,
    DistanceContainer,
    DistanceText,
    StatusBadge,
    StatusDot,
    Avatar,
    DetailsHeader,
} from "./styles";

const statusConfig = {
    available: {
        label: "Открыто",
        color: "#10b981",
        textColor: "#047857",
        bgColor: "#ecfdf5",
    },
    schedule: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
    unavailable: {
        label: "Закрыто",
        color: "#9ca3af",
        textColor: "#374151",
        bgColor: "#f1f5f9",
    },
};

// Components
export const MasterPreview = ({
    master,
    size = "md",
    onShowOnMap,
}: {
    master: Master;
    size?: "bl" | "md" | "lg";
    onShowOnMap?: (master: Master) => void;
}) => {
    const [avatarFailed, setAvatarFailed] = useState(false);
    const statusInfo = statusConfig[master.currentStatus];
    const isOnMap = size === "bl";
    const fullName = master.fullName || "Не указано";
    const hasAvatar = Boolean(master.avatar && !avatarFailed);
    return (
        <MasterInfo $isOnMap={isOnMap}>
            <Avatar>
                {hasAvatar ? (
                    <AvatarImage
                        src={master.avatar}
                        alt={fullName}
                        onError={() => setAvatarFailed(true)}
                    />
                ) : (
                    <AvatarFallback>{fullName[0]}</AvatarFallback>
                )}
            </Avatar>
            <MasterDetails>
                <DetailsHeader>
                    <MasterName>{fullName}</MasterName>
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
                    bgColor={statusInfo?.bgColor}
                    textColor={statusInfo?.textColor}
                >
                    <StatusDot color={statusInfo?.color} />
                    {statusInfo?.label}
                </StatusBadge>
            </MasterDetails>
        </MasterInfo>
    );
};
