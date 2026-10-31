import styled from "styled-components";

type DotProps = {
    $isActive: boolean;
};

export const SuccessDot = styled.div<DotProps>`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: ${({ $isActive }) =>
        $isActive ? "#10b981;" : "#99a1af"};
    margin-right: 0.5rem;
`;
export const WarningDot = styled.div<DotProps>`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: ${({ $isActive }) =>
        $isActive ? "#ff6900;" : "#99a1af"};
    margin-right: 0.5rem;
`;
export const SecondaryDot = styled.div<DotProps>`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: ${({ $isActive }) =>
        $isActive ? "#ffffffff" : "#99a1af"};
    margin-right: 0.5rem;
`;
