import { Header } from "./Header";
import { ReactNode } from "react";
import { HeaderWrapper, FiltersWrapper, Main, Root } from "./styles";

type PageLayoutProps = {
    children: ReactNode;
    filters?: ReactNode;
};

export const PageLayout = (props: PageLayoutProps) => {
    const { children, filters } = props;
    return (
        <Root>
            <HeaderWrapper>
                <Header />
                <FiltersWrapper>{filters}</FiltersWrapper>
            </HeaderWrapper>
            <Main>{children}</Main>
        </Root>
    );
};
