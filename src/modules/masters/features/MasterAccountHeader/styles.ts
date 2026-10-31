import { Button } from "@common/components";
import { styled } from "styled-components";

export const MasterInfo = styled.div`
    display: grid;
    grid-template-columns: 64px 1fr 0.5fr;
    gap: 12px;
`;

export const Avatar = styled.div`
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, ${({ theme }) => theme.palette.blue.secondary} 0%, ${({ theme }) => theme.palette.background[3]} 100%);
    border: none;
    align-self: start;
`;

export const AvatarImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const AvatarFallback = styled.div`
    color: ${({ theme }) => theme.palette.blue.text};
    font-size: 18px;
    font-weight: 600;
`;

export const MasterDetails = styled.div`
    min-width: 0;
`;

export const MasterName = styled.h3`
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 600;
    color: #111827;
    font-size: 14px;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const RatingContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;

    svg {
        width: 14px;
        height: 14px;
        flex: 0 0 14px;
    }
`;

export const RatingText = styled.span`
    font-size: 12px;
    font-weight: 500;
`;

export const ReviewCount = styled.span`
    font-size: 12px;
    color: #6b7280;
`;

export const DistanceContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
`;

export const DistanceText = styled.span`
    font-size: 12px;
    color: #4b5563;
`;

type StatusBadgeProps = {
    bgColor: string;
    textColor: string;
};

export const StatusBadge = styled.div<StatusBadgeProps>`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    margin-top: 8px;
    background-color: ${(props) => props.bgColor};
    color: ${(props) => props.textColor};
    font-weight: 500;
`;

export const StatusDot = styled.div`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
    background-color: ${(props) => props.color};
`;

export const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SpecializationSection = styled.div``;

export const SpecializationHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 6px;
`;

export const SpecializationLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: #374151;
`;

export const SpecializationTags = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

export const SpecializationTag = styled.span`
    font-size: 12px;
    background-color: ${({ theme }) => theme.palette.background[3]};
    color: #475569;
    padding: 2px 8px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-weight: 500;
`;

export const WorkingDay = styled.span`
    font-size: 10px;
    height: 20px;
    display: flex;
    align-items: center;
    color: #475569;
    padding: 2px 4px;
    border-radius: 4px;
`;

export const DetailsHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex-wrap: wrap;
    row-gap: 4px;
`;
export const DescriptionWrapper = styled.div`
    margin-top: 16px;
    font-size: 14px;
    word-break: break-all;
`;

export const ShowOnMapWrapper = styled.div`
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: end;
    align-items: start;
    white-space: nowrap;
    margin-right: -8px;
`;

export const MakeAppointmentButton = styled(Button)`
    &:hover {
        background-color: #ffedd4;
    }
    background-color: #ffedd4;
    color: #b44f17;
    border-color: #ff5c00;
`;

export const CoverHero = styled.div`
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: #eff6ff;
`;

export const CoverHeroImage = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;
