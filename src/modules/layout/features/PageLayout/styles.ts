import { styled } from "styled-components";

export const HeaderWrapper = styled.div`
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: white;
`;
export const FiltersWrapper = styled.div`
    padding: 12px 16px;
    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 6px 8px;
    }
`;

export const Main = styled.main``;

export const Root = styled.div`
    min-height: 100vh;
    background-color: #f8fafc;
`;
