import { styled } from "styled-components";

export const HeroWrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px 28px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
`;

export const LogoImg = styled.img`
    width: 72px;
    height: 72px;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
`;

export const FeatureItem = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
`;

export const FeatureIconWrapper = styled.div`
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background-color: #eff6ff;
    color: #2563eb;

    svg {
        width: 22px;
        height: 22px;
    }
`;

export const Actions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
`;
