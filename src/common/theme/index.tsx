import React, { createContext, useContext, useMemo } from "react";
import { ThemeProvider as StyledThemeProvider, DefaultTheme } from "styled-components";
import { designTokens } from "./designTokens";

declare module "styled-components" {
    export interface DefaultTheme {
        palette: {
            blue: {
                primary: string;
                secondary: string;
                text: string;
                light: string;
                [key: string]: string;
            };
            background: {
                [key: string]: string;
                0: string;
                1: string;
                2: string;
                3: string;
            };
            border: {
                [key: string]: string;
            };
            text: {
                [key: string]: string;
            };
            [key: string]: any;
        };
        colors: {
            primary: string;
            secondary: string;
            background: string;
            card: string;
            text: string;
            textSecondary: string;
            border: string;
            success: string;
            danger: string;
            warning: string;
        };
    }
}

export const defaultTheme: DefaultTheme = {
    palette: {
        blue: {
            primary: designTokens.colors.blue500,
            secondary: designTokens.colors.gray300,
            text: designTokens.colors.blue500,
            light: designTokens.colors.gray100,
        },
        background: {
            "0": designTokens.colors.white,
            "1": designTokens.colors.white,
            "2": designTokens.colors.gray100,
            "3": designTokens.colors.gray300,
        },
        border: {
            "0": designTokens.colors.gray300,
            "1": designTokens.colors.gray500,
        },
        text: {
            "0": designTokens.colors.gray900,
            "1": designTokens.colors.gray500,
        },
    },
    colors: {
        primary: designTokens.colors.blue500,
        secondary: designTokens.colors.green500,
        background: designTokens.colors.gray100,
        card: designTokens.colors.white,
        text: designTokens.colors.gray900,
        textSecondary: designTokens.colors.gray500,
        border: designTokens.colors.gray300,
        success: designTokens.colors.green500,
        danger: designTokens.colors.red500,
        warning: designTokens.colors.gray500,
    },
};

const ThemeContext = createContext<DefaultTheme>(defaultTheme);

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme = useMemo(() => defaultTheme, []);

    return (
        <ThemeContext.Provider value={theme}>
            <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
        </ThemeContext.Provider>
    );
};
