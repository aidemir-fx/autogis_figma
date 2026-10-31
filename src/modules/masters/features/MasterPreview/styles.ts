import { styled } from "styled-components";

export const MasterInfo = styled.div<{ $isOnMap: boolean }>`
    display: grid;
    grid-template-columns: ${({ $isOnMap }) =>
        $isOnMap ? "64px 1fr" : "64px 1fr 0.5fr"};
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
    border: 1px solid ${({ theme }) => theme.palette.blue.secondary};
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
    gap: 4px;
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
    width: fit-content;
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
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 5px;
    color: #475569;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
`;

export const DetailsHeader = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
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
