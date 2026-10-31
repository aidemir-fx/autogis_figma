import { Card } from "@common/components";
import { styled } from "styled-components";

export const BoxWrapper = styled.div`
    margin-top: 16px;
`;

export const StyledCardHeader = styled(Card.Header)`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    padding: 12px 12px 8px 12px;

    ${({ theme }) => theme.breakpoints.up("md")} {
        padding: 24px 24px 16px 24px;
    }
`;

export const StyledCardContent = styled(Card.Content)`
    font-size: 14px;
    color: #374151;
    margin: 0;
    padding: 0 12px 12px 12px;

    ${({ theme }) => theme.breakpoints.up("md")} {
        padding: 0 24px 24px 24px;
    }
`;

export const Container = styled.div`
    padding: 8px;

    ${({ theme }) => theme.breakpoints.up("md")} {
        padding: 16px;
    }
`;

export const MapWrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const MapHeaderWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const SpecializationSection = styled.div`
    margin-top: 8px;
`;

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
    background-color: #f1f5f9;
    color: #475569;
    padding: 2px 8px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
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
