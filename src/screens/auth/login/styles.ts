import { styled } from "styled-components";
import { Link } from "react-router-dom";

export const Title = styled.h2`
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    text-align: center;
    margin: 0 0 8px 0;
`;

export const LoginIconWrapper = styled.div`
    width: 48px;
    height: 48px;
    background-color: ${({ theme }) => theme.palette.blue.secondary};
    color: ${({ theme }) => theme.palette.blue.text};
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px auto;

    & svg {
        width: 24px;
        height: 24px;
    }
`;

export const ButtonWrapper = styled.div`
    margin-top: 24px;
    width: 100%;
`;

export const HintWrapper = styled.div`
    font-size: 14px;
    color: #4a5565;
    margin-top: 24px;
    display: flex;
    justify-content: center;
`;

export const HintTitle = styled.p`
    display: inline-block;
    fontsize: 14px;
    margin: 0;
    color: #4a5565;
`;

export const LoginWrapper = styled.div`
    margin-bottom: 16px;
`;

export const RegisterTitleWrapper = styled.div`
    font-size: 14px;
    color: #4a5565;
    margin-top: 4px;
    display: flex;
    justify-content: center;
`;

export const RegisterTitle = styled(Link)`
    text-decoration: none;
    display: inline-block;
    fontsize: 14px;
    margin: 0;
    color: #2563eb;
`;

export const LogoWrapper = styled.div`
    margin-top: 24px;
    margin-bottom: 16px;
    width: 100%;
    display: flex;
    justify-content: center;
`;

export const AboutWrapper = styled.div`
    margin-bottom: 16px;
    width: 100%;
    display: flex;
    justify-content: center;
`;

export const AboutTitle = styled.span`
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 4px 0;
`;
