import styled from "styled-components";
import { TextField as MuiTextField } from "@mui/material";

export const Root = styled.div`
    width: 100%;
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 2.25rem; /* Высота 9, для соответствия Tailwind стилю */
    align-items: center;

    font-size: 0.875rem; /* Размер шрифта */
    border-radius: 0.375rem; /* Округление */
    border: 1px solid #e5e7eb; /* Цвет границы */
    background-color: #fbf9fa; /* Цвет фона */
    transition: color 0.2s, box-shadow 0.2s;
    display: flex;
    margin-top: 0 !important;
    /* Стили для фокуса */
    &:has(.MuiInput-root.Mui-focused) {
        border-color: rgba(97, 97, 97, 0.5);
        box-shadow: 0 0 0 3px rgba(153, 154, 155, 0.5);
    }
    & .MuiInputBase-input {
        padding-left: 10px !important;
    }
`;

export const StyledTextField = styled(MuiTextField)`
    height: 100%;
    width: 100%;

    & .MuiInput-root {
        height: 100%;
        width: 100%;
        padding: 0 !important;
        border: none;
        border-radius: 0.375rem; /* Округление */
        background-color: #fbf9fa; /* Цвет фона */
        font-size: 0.875rem;
    }

    & .MuiInputBase-input {
        padding: 0;
        padding-left: 10px; !important
    }

    & .MuiInputAdornment-root {
        margin: 0;
    }
`;

export const IconWrapper = styled.div`
    padding-left: 10px;
    display: flex;
    align-items: center;
    color: oklch(0.707 0.022 261.325);
    & svg {
        width: 16px;
        height: 16px;
    }
`;

export const Label = styled.label`
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px !important;
`;
