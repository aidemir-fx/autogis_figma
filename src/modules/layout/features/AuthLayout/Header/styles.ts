import { styled } from "styled-components";

export const BackButton = styled.button`
    background: transparent;
    border: none;
    padding: 8px;
    margin-left: -8px;
    margin-right: 12px;
    border-radius: 6px;
    cursor: pointer;
    color: #4b5563;
    align-items: center;
    display: flex;
    & svg {
        width: 20px;
        height: 20px;
    }
    &:hover {
        background-color: #f3f4f6;
    }
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
`;

export const HeaderTitle = styled.h1`
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
`;
