import { Button } from "@common/components";
import { Paper } from "@mui/material";
import { styled } from "styled-components";

const ACTIViTY_NAME_COLORS = {
    master: {},
};

export const StyledPaper = styled(Paper)``;

export const IconWrapper = styled.div`
    border-radius: 10px;
    background-color: #dcfce7;
    color: #00a63e;
    width: 44px;
    height: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
    & svg {
        width: 20px;
        height: 20px;
    }
`;

export const SettingsButton = styled(Button)`
    border: 1px solid #bedbff;
    padding: 0 10px;
    line-height: 1.42857;
    height: 32px;
`;
