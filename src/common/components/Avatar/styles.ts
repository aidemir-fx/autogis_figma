import { styled } from "styled-components";

export const Root = styled.div`
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

export const AvatarFallback = styled.div`
    color: ${({ theme }) => theme.palette.blue.text};
    font-size: 18px;
    font-weight: 600;
`;
