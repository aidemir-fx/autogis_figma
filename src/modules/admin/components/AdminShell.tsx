import React, { useState } from "react";
import {
    AppBar,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HistoryIcon from "@mui/icons-material/History";
import PeopleIcon from "@mui/icons-material/People";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useLocation } from "react-router-dom";

const DRAWER_WIDTH = 240;

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactElement;
    exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    {
        label: "Заявки на проф. кабинет",
        path: "/admin/moderation",
        icon: <AssignmentIcon />,
    },
    {
        label: "Журнал действий",
        path: "/admin/audit",
        icon: <HistoryIcon />,
    },
    {
        label: "Проф. аккаунты",
        path: "/admin/professionals",
        icon: <PeopleIcon />,
    },
];

function AdminSidebarContent({ onItemClick }: { onItemClick?: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ px: 2, py: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: 11 }}>
                    Модерация
                </Typography>
            </Box>
            <Divider />
            <List dense sx={{ flex: 1, px: 1, py: 1 }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <ListItemButton
                            key={item.path}
                            selected={isActive}
                            onClick={() => {
                                navigate(item.path);
                                onItemClick?.();
                            }}
                            sx={{ borderRadius: "8px", mb: 0.5 }}
                        >
                            <ListItemIcon sx={{ minWidth: 36, color: isActive ? "primary.main" : "inherit" }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{ variant: "body2", fontWeight: isActive ? 600 : 400 }}
                            />
                        </ListItemButton>
                    );
                })}
            </List>
            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
                <ListItemButton
                    onClick={() => {
                        navigate("/cabinet");
                        onItemClick?.();
                    }}
                    sx={{ borderRadius: "8px" }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <HomeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Выйти из админки"
                        primaryTypographyProps={{ variant: "body2" }}
                    />
                </ListItemButton>
            </Box>
        </Box>
    );
}

export function AdminShell({
    children,
    title,
}: {
    children: React.ReactNode;
    title?: string;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.50" }}>
            {/* Desktop sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", md: "block" },
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: DRAWER_WIDTH,
                        boxSizing: "border-box",
                        bgcolor: "background.paper",
                        borderRight: "1px solid",
                        borderColor: "divider",
                    },
                }}
            >
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                        Админ-панель
                    </Typography>
                </Box>
                <Divider />
                <AdminSidebarContent />
            </Drawer>

            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
                }}
            >
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                        Админ-панель
                    </Typography>
                </Box>
                <Divider />
                <AdminSidebarContent onItemClick={() => setMobileOpen(false)} />
            </Drawer>

            {/* Main content */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <AppBar
                    position="sticky"
                    color="default"
                    elevation={0}
                    sx={{
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                    }}
                >
                    <Toolbar variant="dense">
                        <IconButton
                            edge="start"
                            sx={{ mr: 1, display: { md: "none" } }}
                            onClick={() => setMobileOpen(true)}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
                                {title ?? "Модерация"}
                            </Typography>
                        </Stack>
                    </Toolbar>
                </AppBar>

                <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>{children}</Box>
            </Box>
        </Box>
    );
}
