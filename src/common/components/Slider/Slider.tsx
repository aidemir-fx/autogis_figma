import { SliderProps as SliderBaseProps } from "@mui/material";
import { Root } from "./styles";

type DrawerProps = SliderBaseProps;

export const Slider = (props: DrawerProps) => {
    return <Root {...props} />;
};
