import {
    ButtonHTMLAttributes,
    DetailedHTMLProps,
    ReactNode,
    useMemo,
} from "react";
import {
    ChildrenWrapper,
    ConteinedButton,
    OutlinedButton,
    SpinWrapper,
    StyledSkeleton,
    TextButton,
} from "./styles";
import { Colors } from "./types";
import { CircularProgress, Skeleton } from "@mui/material";

export type ButtonProps = DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
> & {
    children: ReactNode;
    icon?: ReactNode;
    variant?: "contained" | "text" | "outlined";
    isFullWidth?: boolean;
    color?: Colors;
    isLoading?: boolean;
};

export const Button = (props: ButtonProps) => {
    const {
        children,
        icon,
        variant = "contained",
        isFullWidth,
        color,
        isLoading,
        ...restProps
    } = props;
    const Component = useMemo(() => {
        if (variant === "contained") {
            return ConteinedButton;
        }

        if (variant === "text") {
            return TextButton;
        }

        if (variant === "outlined") {
            return OutlinedButton;
        }

        return ConteinedButton;
    }, [variant]);

    return (
        <Component
            {...restProps}
            $isFullWidth={isFullWidth ?? false}
            type={restProps.type || "button"}
        >
            {isLoading && <StyledSkeleton variant="rectangular" height={36} />}
            <>
                {icon && icon}
                {children}
            </>
        </Component>
    );
};
