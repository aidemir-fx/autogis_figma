import { styled } from "styled-components";

export const StatsCard = styled.div`
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
    padding: 16px;
`;

export const StatsContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const StatItem = styled.div`
    text-align: center;
    flex: 1;
`;

export const StatNumber = styled.p`
    font-size: 18px;
    font-weight: 600;
    color: ${(props) => props.color || "#111827"};
    margin: 0;
`;

export const StatLabel = styled.p`
    font-size: 12px;
    color: #6b7280;
    margin: 0;
`;

export const DrawerContainer = styled.div`
    padding: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
`;
export const DrawerHeader = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
`;
export const DrawerContent = styled.div`
    width: 100%;
    padding-left: 8px;

    padding-right: 16px;
`;

export const SliderWrapper = styled.div`
    width: 100%;
    max-width: 700px;
    margin-top: 8px;
`;

export const ButtonWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: end;
`;

export const ContentWrapper = styled.div`
    width: 100%;
    max-width: 700px;
`;
