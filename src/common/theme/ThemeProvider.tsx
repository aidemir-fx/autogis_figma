import { type PropsWithChildren } from "react";
import { ThemeProvider as _ThemeProvider } from "styled-components";

import { theme } from "./theme";

export const ThemeProvider = (props: PropsWithChildren) => {
    const { children } = props;
    return <_ThemeProvider theme={theme}>{children}</_ThemeProvider>;
};

export default ThemeProvider;
