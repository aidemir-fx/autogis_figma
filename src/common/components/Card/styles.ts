import { styled } from "styled-components";

export const Root = styled.div`
    box-sizing: border-box;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &:hover {
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -2px rgb(0 0 0 / 0.05);
    }
`;
