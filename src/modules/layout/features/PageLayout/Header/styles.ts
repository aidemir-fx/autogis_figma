import { styled } from "styled-components";

export const StyledLogo = styled.img`
    width: 180px;
`;

export const StyledToolbar = styled.div`
    padding-left: 16px;
    padding-right: 16px;
    ${({ theme }) => theme.breakpoints.down("md")} {
        padding-left: 8px;
        padding-right: 8px;
    }
    display: flex;
    align-items: center;
    min-height: 56px;
    justify-content: space-between;
`;

export const RegisterButton = styled.div`
    margin-top: 8px;
`;

export const ButtonList = styled.div`
    padding: 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const UserPartWrpapper = styled.div`
    cursor: pointer;
    border-radius: 12px;
    padding: 8px 16px;
    transition: all 0.5s ease;

    &:hover {
        background: #f0f9fcff;
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(66, 165, 245, 0.1);
    }
`;
