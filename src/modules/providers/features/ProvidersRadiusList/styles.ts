import styled from "styled-components";

export const MastersListContainer = styled.div`
    padding: 0 16px;
    margin-top: 16px;
`;

export const GridList = styled.div`
    display: grid;
    grid-template-columns: 1fr;

    ${({ theme }) => theme.breakpoints.up("md")} {
        grid-template-columns: 1fr 1fr;
    }
    gap: 8px;
`;
