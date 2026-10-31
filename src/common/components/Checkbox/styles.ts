import { Checkbox } from "@mui/material";
import styled from "styled-components";

export const Root = styled(Checkbox)`
    border-radius: 4px !important;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
    &:disabled {
        opacity: 0.5 !important;
    }
    color: #030213 !important;
`;
