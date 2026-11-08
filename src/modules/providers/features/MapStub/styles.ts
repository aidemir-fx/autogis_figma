import { styled } from "styled-components";

export const LocationIconContainer = styled.div`
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6 0%, #64748b 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 8px auto;
    border: 1px solid #60a5fa;
    color: white;
`;

export const MapStubTitle = styled.span`
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
`;

export const MapErrorCard = styled.div`
    width: min(320px, calc(100vw - 32px));
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid rgb(var(--ds-color-gray-900-rgb) / 0.08);
    border-radius: var(--ds-radius-12);
    background: var(--ds-color-white);
    box-shadow: var(--ds-shadow-list);
    text-align: left;
`;

export const MapErrorTitle = styled.div`
    color: var(--ds-color-gray-900);
    font-size: 15px;
    font-weight: 700;
`;

export const MapErrorDescription = styled.p`
    margin: 6px 0 0;
    color: var(--ds-color-gray-500);
    font-size: 13px;
    line-height: 1.45;
`;

export const MapErrorCode = styled.code`
    display: block;
    margin-top: 8px;
    color: var(--ds-color-gray-500);
    font-size: 11px;
`;

export const MapErrorActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
`;

export const MapRetryButton = styled.button`
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-blue-500);
    color: var(--ds-color-white);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
`;

export const MapCopyButton = styled.button`
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid var(--ds-color-gray-300);
    border-radius: var(--ds-radius-8);
    background: var(--ds-color-white);
    color: var(--ds-color-gray-900);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
`;

export const Root = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 1;
    pointer-events: auto;
`;
