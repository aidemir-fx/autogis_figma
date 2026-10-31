import { ReactNode } from "react";
import { AvatarFallback, Root } from "./styles";

type AvatarProps = {
    children: ReactNode;
    className?: string;
};

export const Avatar = (props: AvatarProps) => {
    const { children, className } = props;
    return (
        <Root className={className}>
            <AvatarFallback>{children}</AvatarFallback>
        </Root>
    );
};
