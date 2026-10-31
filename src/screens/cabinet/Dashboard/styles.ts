import { Avatar, IconButton } from "@common/components";
import { Paper } from "@mui/material";
import styled from "styled-components";

export const Header = styled.div`
    display: flex;
    margin-bottom: 18px;
    gap: 8px;
    align-items: center;
`;

export const UserIconWrapper = styled.div`
    color: ${({ theme }) => theme.palette.blue.text};
    height: 16px;
    display: flex;
    align-items: center;
`;

export const StyledAvatar = styled(Avatar)`
    & svg {
        width: 32px;
        height: 32px;
    }
`;

export const AvatarWrapper = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
`;
export const AvatarHint = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 14px;
    justify-content: center;
`;

export const AvatarHintText = styled.div`
    font-size: 12px;
    color: #6a7282;
`;

export const UserDataWrapper = styled.div`
    display: flex;
    flex-direction: column;
`;

export const SubmitButtonWrapper = styled.div`
    margin-top: 16px;
`;

export const ActivityTypeIconWrapper = styled.div`
    border-radius: 10px;
    background-color: ${({ theme }) => theme.palette.blue.secondary};
    color: ${({ theme }) => theme.palette.blue.text};
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

export const StyledPaper = styled(Paper)`
    &:hover {
        box-shadow: ${({ theme }) => theme.shadows.hover} !important;
    }
`;

export const OrdersIconWrapper = styled.div`
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
    & img {
        width: 20px;
        height: 20px;
        object-fit: contain;
    }
`;

export const TitleWrapper = styled.div`
    min-height: 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
`;

export const BlockTitle = styled.h3`
    font-weight: 500;
    margin: 0;
    font-size: 16px;
`;

export const BlockSubtitle = styled.span`
    color: #4a5565;
    font-size: 14px;
`;
