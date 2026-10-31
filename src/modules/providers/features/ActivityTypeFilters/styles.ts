import { styled } from "styled-components";

export const Root = styled.div`
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
    padding: 12px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;

    &::-webkit-scrollbar {
        display: none;
    }
`;

type ActivityTypeButtonProps = {
    $color: string;
    $isActive: boolean;
};

export const ActivityTypeButton = styled.button<ActivityTypeButtonProps>`
    display: flex;
    justify-content: center;
    white-space: nowrap;
    font-size: 0.75rem;
    cursor: pointer;
    line-height: 1.25rem;
    font-weight: 500;
    background-color: white;
    color: ${({ $color, $isActive }) => ($isActive ? $color : "#99a1af")};

    &:hover {
        background-color: #e9ebef;
    }
    &:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }
    & svg {
        width: 20px;
        height: 20px;
        color: ${({ $color, $isActive }) => ($isActive ? $color : "#99a1af")};
    }
    & img {
        width: 20px;
        height: 20px;
        object-fit: contain;
        opacity: ${({ $isActive }) => ($isActive ? 1 : 0.6)};
    }

    border-radius: 0.375rem;

    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    min-width: 92px;
    height: auto;
    border-width: 0;

    transition:
        background-color 200ms,
        color 200ms;
`;
