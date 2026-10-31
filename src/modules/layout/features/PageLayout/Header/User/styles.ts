import { styled } from "styled-components";

export const Root = styled.div`
    display: grid;
    grid-template-columns: 64px 1fr;
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
    transition: transform 0.2s ease;
`;

export const AvatarFallback = styled.div`
    color: ${({ theme }) => theme.palette.blue.text};
    font-size: 18px;
    font-weight: 600;
`;

export const MasterDetails = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
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

export const DetailsHeader = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;
