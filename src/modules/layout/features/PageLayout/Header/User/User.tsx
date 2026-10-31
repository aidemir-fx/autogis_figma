import { StarIcon } from "@common/icons";
import { Master } from "@common/types";
import { useNavigate } from "react-router-dom";
import {
    Root,
    MasterName,
    AvatarFallback,
    MasterDetails,
    RatingContainer,
    RatingText,
    ReviewCount,
    StatusBadge,
    StatusDot,
    Avatar,
    DetailsHeader,
} from "./styles";
import { UserRole, User as UserType } from "@common/types/user";
import { getUserFirstName } from "@common/lib/userAccess";

const statusConfig: Record<
    string,
    {
        label: string;
        color: string;
        textColor: string;
        bgColor: string;
    }
> = {
    available: {
        label: "Открыто",
        color: "#10b981",
        textColor: "#047857",
        bgColor: "#ecfdf5",
    },
    busy: {
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

export const User = ({
    user,
}: {
    user: UserType;
    onShowOnMap?: (master: Master) => void;
}) => {
    const navigate = useNavigate();
    const isProvider = user.role !== UserRole.CUSTOMER;
    const statusInfo = statusConfig.available;
    const displayName = getUserFirstName(user.name) || "Не указано";

    const handleClick = () => {
        navigate("/cabinet");
    };

    return (
        <Root onClick={handleClick}>
            <Avatar>
                <AvatarFallback>{displayName[0]}</AvatarFallback>
            </Avatar>
            <MasterDetails>
                <DetailsHeader>
                    <MasterName>{displayName}</MasterName>
                    <RatingContainer>
                        <StarIcon />
                        <RatingText>0</RatingText>
                        <ReviewCount>(0)</ReviewCount>
                    </RatingContainer>
                </DetailsHeader>

                <StatusBadge
                    bgColor={statusInfo.bgColor}
                    textColor={statusInfo.textColor}
                >
                    <StatusDot color={statusInfo.color} />
                    {statusInfo.label}
                </StatusBadge>
            </MasterDetails>
        </Root>
    );
};
