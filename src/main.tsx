import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { App } from "./app/App";
import { muiTheme } from "./common/theme/muiTheme";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
