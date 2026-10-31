import { ReactNode } from "react";
import { Root } from "./styles";

type CardHeaderProps = {
    children: ReactNode;
    className?: string;
};

export const CardHeader = (props: CardHeaderProps) => {
    const { children, className } = props;
    return <Root className={className}>{children}</Root>;
};
