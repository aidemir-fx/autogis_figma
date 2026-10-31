import { ReactNode } from "react";
import { Root } from "./styles";

type CardContentProps = {
    children: ReactNode;
    className?: string;
};

export const CardContent = (props: CardContentProps) => {
    const { children, className } = props;

    return <Root className={className}>{children}</Root>;
};
