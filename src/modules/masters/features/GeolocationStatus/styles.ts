import { styled } from "styled-components";

export const PromptContainer = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #ffffff;
    border-top: 1px solid #e5e7eb;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    padding: 16px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const HeaderContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const Title = styled.h3`
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0;
`;

export const CloseButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;

    &:hover {
        color: #374151;
    }
`;

export const Description = styled.p`
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    line-height: 1.4;
`;

export const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
`;
