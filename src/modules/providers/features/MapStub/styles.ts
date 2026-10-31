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

export const Root = styled.div`
    position: absolute;

    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 1;
`;
