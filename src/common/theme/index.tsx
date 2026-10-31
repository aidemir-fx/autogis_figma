import React, { createContext, useContext, useMemo } from "react";
import { ThemeProvider as StyledThemeProvider, DefaultTheme } from "styled-components";

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
            primary: "#1e40af",
            secondary: "#3b82f6",
            text: "#1e3a8a",
            light: "#eff6ff",
        },
        background: {
            "0": "#ffffff",
            "1": "#f8fafc",
            "2": "#f1f5f9",
            "3": "#e2e8f0",
        },
        border: {
            "0": "#e2e8f0",
            "1": "#cbd5e1",
        },
        text: {
            "0": "#0f172a",
            "1": "#64748b",
        },
    },
    colors: {
        primary: "#1e40af",
        secondary: "#f59e0b",
        background: "#f8fafc",
        card: "#ffffff",
        text: "#0f172a",
        textSecondary: "#64748b",
        border: "#e2e8f0",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
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
