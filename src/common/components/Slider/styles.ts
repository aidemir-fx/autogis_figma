import { Slider } from "@mui/material";
import styled from "styled-components";

export const Root = styled(Slider)`
    color: #056fb6ff !important;
    height: 8px;

    & .MuiSlider-track {
        border: none;
    }

    & .MuiSlider-thumb {
        height: 24px;
        width: 24px;
        background-color: #fff;
        border: 2px solid currentColor;

        &:focus,
        &:hover,
        &.Mui-active,
        &.Mui-focusVisible {
            box-shadow: inherit;
        }

        &::before {
            display: none;
        }
    }

    & .MuiSlider-valueLabel {
        line-height: 1.2;
        font-size: 12px;
        background: unset;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        background-color: #11a3e6ff;
        transform-origin: bottom left;
        transform: translate(50%, -100%) rotate(-45deg) scale(0);

        &::before {
            display: none;
        }

        &.MuiSlider-valueLabelOpen {
            transform: translate(50%, -100%) rotate(-45deg) scale(1);
        }

        & > * {
            transform: rotate(45deg);
        }
    }
`;
