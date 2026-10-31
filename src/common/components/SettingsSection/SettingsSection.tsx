import React from "react";
import { Paper } from "@mui/material";
import { SectionTitle } from "./styles";

interface SettingsSectionProps {
    icon?: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

const paperSx = {
    p: 2,
    width: "100%",
    borderRadius: "14px",
    marginBottom: "24px",
    boxShadow: "none",
    border: "1px solid #0000001a",
} as const;

export function SettingsSection({ icon, title, children }: SettingsSectionProps) {
    return (
        <Paper variant="outlined" sx={paperSx}>
            <SectionTitle>
                {icon}
                {title}
            </SectionTitle>
            {children}
        </Paper>
    );
}
