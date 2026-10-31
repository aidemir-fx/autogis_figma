import React, { useState } from "react";
import { Box } from "@mui/material";
import styled from "styled-components";

const Overlay = styled.div<{ $expanded: boolean }>`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1200;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    min-height: 80px;
    transform: translateY(${({ $expanded }) => ($expanded ? "0" : "calc(100% - 80px)")});
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);

    @media (min-width: 768px) {
        display: none;
    }
`;

const Handle = styled.div`
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #d9d9d9;
    margin: 12px auto 8px;
    flex-shrink: 0;
    cursor: pointer;
`;

const Content = styled.div<{ $expanded: boolean }>`
    overflow-y: ${({ $expanded }) => ($expanded ? "auto" : "hidden")};
    flex: 1;
    padding: 0 0 80px 0;
`;

const PeekLabel = styled.div`
    text-align: center;
    font-size: 13px;
    color: #808080;
    padding: 4px 16px 12px;
    cursor: pointer;
`;

interface BottomSheetProps {
    children: React.ReactNode;
    peekLabel?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    children,
    peekLabel = "Показать список",
}) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <Overlay
            $expanded={expanded}
            onClick={() => !expanded && setExpanded(true)}
        >
            <Handle onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} />
            {!expanded && <PeekLabel>{peekLabel}</PeekLabel>}
            <Content $expanded={expanded}>
                <Box sx={{ display: expanded ? "block" : "none" }}>
                    {children}
                </Box>
            </Content>
        </Overlay>
    );
};
