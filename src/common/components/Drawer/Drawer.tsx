import {
    Drawer as DrawerBase,
    DrawerProps as DrawerBaseProps,
} from "@mui/material";

type DrawerProps = DrawerBaseProps;

export const Drawer = (props: DrawerProps) => {
    return <DrawerBase {...props} />;
};
