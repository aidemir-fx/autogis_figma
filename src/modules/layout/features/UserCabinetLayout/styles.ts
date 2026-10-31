import styled from "styled-components";
import { Box, AppBar } from "@mui/material";

export const Root = styled(Box)`
    min-height: 100vh;
    background-color: ${({ theme }) => theme.palette.background[2]};
`;

export const SidebarContainer = styled(Box)`
    width: 280px;
    background-color: #ffffff;
    border-left: 1px solid ${({ theme }) => theme.palette.text.genericAccent};
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    overflow-y: auto;
    z-index: 1000;

    @media (max-width: 1024px) {
        display: none;
    }
`;

export const Main = styled.div`
    flex: 1;
    margin-right: 280px;
    background-color: ${({ theme }) => theme.palette.background[2]};

    @media (max-width: 1024px) {
        margin-right: 0;
        padding: 0 16px;
    }
`;

export const SidebarHeader = styled(Box)`
    padding: 12px 16px;
    background-color: #ffffff;

    height: 56px;
    color: white;
    cursor: pointer;
    transition: opacity 0.2s ease;
    box-shadow: ${({ theme }) => theme.shadows.separator};
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 8px;
    &:hover {
        opacity: 0.9;
    }
`;

export const Logo = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    img {
        width: 120px;
    }
`;

export const UserSection = styled(Box)`
    display: flex;
    align-items: center;
    padding: 8px 16px;
    box-shadow: ${({ theme }) => theme.shadows.separator};
    border-bottom: 1px solid #e5e7eb;
    background-color: ${({ theme }) => theme.palette.background[2]};
`;

export const UserAvatar = styled(Box)`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #42a5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    margin-right: 12px;
`;

export const UserInfo = styled(Box)`
    flex: 1;
`;

export const UserName = styled(Box)`
    font-weight: 600;
    font-size: 14px;
    color: #333;
`;

export const UserStatus = styled(Box)`
    font-size: 12px;
    color: #42a5f5;
    margin-top: 2px;
`;

export const MenuSection = styled(Box)`
    padding: 8px 0;
    margin-top: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
    background-color: ${({ theme }) => theme.palette.background[2]};
`;

export const MenuItem = styled(Box)<{ active?: boolean }>`
    display: flex;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    background-color: ${(props) => (props.active ? "#e3f2fd" : "transparent")};
    color: ${(props) => (props.active ? "#42a5f5" : "#666")};
    border-left: ${(props) =>
        props.active ? "3px solid #42a5f5" : "3px solid transparent"};
    transition: all 0.2s ease;

    &:hover {
        background-color: ${({ theme }) => theme.palette.background[3]};
        color: #42a5f5;
    }
`;

export const MenuIcon = styled(Box)`
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;

    svg {
        width: 20px;
        height: 20px;
    }
`;

export const MenuText = styled(Box)`
    font-size: 14px;
    font-weight: 500;
`;

export const MobileHeader = styled(AppBar)`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1100;
    background-color: white !important;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1) !important;
    color: black;

    .MuiToolbar-root {
        min-height: 56px;
    }
`;

export const LogoutWrapper = styled.div`
    padding: 8px;
`;

export const Header = styled.div`
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border-bottom: 1px solid #e5e7eb;

    background-color: white;
    display: flex;
    align-items: center;
    gap: 16px;
    font-weight: 600;
    font-size: 18px;
    padding: 8px;
    height: 56px;
    color: #101828;
    position: sticky;
    top: 0;
    z-index: 10;
`;
export const Container = styled.div`
    padding: 16px 16px 0 16px;
`;
