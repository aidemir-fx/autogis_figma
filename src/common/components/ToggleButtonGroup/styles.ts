import styled from "styled-components";

export const ToggleButtonGroupContainer = styled.div`
    display: inline-flex;
    border-radius: 25px;
    padding: 4px;
    gap: 8px;
    width: 100%;
`;

interface ToggleButtonGroupItemProps {
    $isDisabled?: boolean;
    $isActive?: boolean;
}

export const ToggleButtonGroupItem = styled.button<ToggleButtonGroupItemProps>`
    width: 100%;
    font-size: 12px;
    border: none;
    border-radius: 8px;
    padding: 6px 12px;
    font-weight: 500;
    cursor: ${({ $isDisabled }) => ($isDisabled ? "not-allowed" : "pointer")};
    transition: all 0.2s ease;
    min-width: 80px;
    text-align: center;
    opacity: ${({ $isDisabled }) => ($isDisabled ? 0.5 : 1)};
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;

    border: 2px solid #ebe6e7;

    &:active {
        transform: ${({ $isDisabled }) =>
            !$isDisabled ? "scale(0.98)" : "none"};
    }
`;

export const SuccessItem = styled(
    ToggleButtonGroupItem
)<ToggleButtonGroupItemProps>`
    ${({ $isActive }) =>
        $isActive &&
        `
         border: 2px solid #b9f8cf;
        color: #008236;
        background: #f0fdf4 !important;
    `}
`;
export const WarningItem = styled(
    ToggleButtonGroupItem
)<ToggleButtonGroupItemProps>`
    ${({ $isActive }) =>
        $isActive &&
        `
        border: 2px solid #ffd7a8;
        color: #ca3500;
        background: #fff7ed;
    `}
`;

export const SecondaryItem = styled(
    ToggleButtonGroupItem
)<ToggleButtonGroupItemProps>`
    ${({ $isActive }) =>
        $isActive &&
        `
        border: 2px solid #555555ff;
        color: #fffdfdff;
        background: #8a8a8aff;
    `}
`;
