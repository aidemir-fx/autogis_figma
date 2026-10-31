import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { App } from "./app/App";

const queryClient = new QueryClient();

const theme = createTheme({
    palette: {
        mode: "light",
    },
    components: {
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: "8px",
                    "&:hover": {
                        backgroundColor: "#e9ebef",
                    },
                },
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
