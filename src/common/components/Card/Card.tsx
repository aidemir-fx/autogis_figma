import { ReactNode } from "react";
import { Root } from "./styles";
import { CardHeader } from "./Header";
import { CardContent } from "./Content";

type CardProps = {
    children: ReactNode;
    className?: string;
};

export const Card = (props: CardProps) => {
    const { children, className } = props;

    return <Root className={className}>{children}</Root>;
};

Card.Header = CardHeader;
Card.Content = CardContent;
