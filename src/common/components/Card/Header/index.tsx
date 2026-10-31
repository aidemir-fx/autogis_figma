import React, { ReactNode } from "react";
import styled from "styled-components";

const HeaderRoot = styled.div`
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
`;

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
    <HeaderRoot className={className}>{children}</HeaderRoot>
);
