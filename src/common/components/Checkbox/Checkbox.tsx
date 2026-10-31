import { type CheckboxProps as CheckboxPropsMUI } from "@mui/material";
import { Root } from "./styles";

type CheckboxProps = CheckboxPropsMUI;

export const Checkbox = (props: CheckboxProps) => {
    return <Root {...props} color="warning" />;
};
