import { IconButtonProps as IconButtonBaseProps } from "@mui/material";
import { StyledIconButton } from "./styles";

type IconButtonProps = IconButtonBaseProps & {
    className?: string;
};

export const IconButton = (props: IconButtonProps) => {
    return <StyledIconButton {...props} />;
};
