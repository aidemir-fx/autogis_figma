import { styled } from "styled-components";
import { Colors } from "./types";
import { Skeleton } from "@mui/material";

type Props = {
    $isFullWidth: boolean;
    color?: Colors;
};

type WithLoading = {
    $isLoading?: boolean;
};

export const SpinWrapper = styled.div<WithLoading>`
    visibility: ${({ $isLoading }) => ($isLoading ? "visible" : "hidden")};
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
`;

export const ConteinedButton = styled.button<Props>`
    position: relative;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    height: 36px; /* h-9 */
    display: flex;
    justify-content: center;
    align-items: center;
    width: ${({ $isFullWidth }) => ($isFullWidth ? "100%" : "auto")};
    font-weight: 500;
    border: 1px solid #3b82f6;

    & svg {
        margin-right: 8px;
    }
    &:disabled {
        background-color: #6a93ecff;
        cursor: default;
    }

    &:hover:has(:not([disabled])) {
        background-color: #2563eb;
    }
    overflow: hidden;
`;

export const TextButton = styled.button<Props>`
    overflow: hidden;
    position: relative;
    width: ${({ $isFullWidth }) => ($isFullWidth ? "100%" : "auto")};
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.palette.blue.text};
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    background-color: white;
    font-weight: 500;
    display: flex;
    justify-content: center;
    align-items: center;
    &:hover {
        background-color: ${({ theme }) => theme.palette.blue.light};
    }
    &:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }
    gap: 8px;
`;

export const OutlinedButton = styled.button<Props>`
    position: relative;
    width: ${({ $isFullWidth }) => ($isFullWidth ? "100%" : "auto")};

    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    gap: 8px;
    white-space: nowrap;

    height: 36px;
    padding: 12px;

    font-weight: 500;
    font-size: 14px; /* text-sm */

    border-radius: 6px; /* rounded-md */
    border: 1px solid #d1d5db; /* border border-gray-300 */
    background-color: #f3f4f6; /* bg-gray-100 */
    color: #374151; /* text-gray-700 */

    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        color 0.2s ease;

    svg {
        pointer-events: none;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    &:hover {
        background-color: #e5e7eb; /* hover:bg-gray-200 */
    }

    &:focus-visible {
        outline: 2px solid transparent;
        border-color: #3b82f6; /* focus-visible:border-ring */
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); /* focus-visible:ring-ring/50 focus-visible:ring-[3px] */
    }

    &[aria-invalid="true"] {
        border-color: #ef4444; /* aria-invalid:border-destructive */
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); /* aria-invalid:ring-destructive/20 */
    }

    &:disabled {
        pointer-events: none; /* disabled:pointer-events-none */
        opacity: 0.5; /* disabled:opacity-50 */
    }

    /* Conditional padding when has SVG */
    &:has(> svg) {
        padding-left: 12px; /* has-[>svg]:px-3 */
        padding-right: 12px;
    }
    overflow: hidden;

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
        &[aria-invalid="true"] {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4); /* dark:aria-invalid:ring-destructive/40 */
        }
    }
`;

export const ChildrenWrapper = styled.div<WithLoading>`
    visibility: ${({ $isLoading }) => ($isLoading ? "hidden" : "visible")};
`;

export const StyledSkeleton = styled(Skeleton)`
    width: 100% !important;
    height: 36px !important;
    min-width: 0 !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 100 !important;
    background-color: #ffffff61 !important;
`;
