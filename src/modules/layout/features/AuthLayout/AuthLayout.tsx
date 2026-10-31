import { Header } from "./Header";
import { ReactNode } from "react";
import { HeaderWrapper, Main, Root } from "./styles";

type AuthLayoutProps = {
    children: ReactNode;
    title?: string;
};

export const AuthLayout = (props: AuthLayoutProps) => {
    const { children, title } = props;
    return (
        <Root>
            <HeaderWrapper>
                <Header title={title} />
            </HeaderWrapper>
            <Main>{children}</Main>
        </Root>
    );
};
