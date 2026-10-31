import React from "react";
import styled, { keyframes } from "styled-components";

const fadeInKf = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideUpKf = keyframes`
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
`;

const FadeInDiv = styled.div`
    animation: ${fadeInKf} 0.25s ease forwards;
`;

const SlideUpDiv = styled.div`
    animation: ${slideUpKf} 0.3s ease forwards;
`;

interface AnimatedProps {
    children: React.ReactNode;
    className?: string;
}

export const FadeIn: React.FC<AnimatedProps> = ({ children, className }) => (
    <FadeInDiv className={className}>{children}</FadeInDiv>
);

export const SlideUp: React.FC<AnimatedProps> = ({ children, className }) => (
    <SlideUpDiv className={className}>{children}</SlideUpDiv>
);

export const StaggerList: React.FC<AnimatedProps> = ({ children, className }) => (
    <div className={className}>{children}</div>
);

export const StaggerItem: React.FC<AnimatedProps> = ({ children, className }) => (
    <SlideUpDiv className={className}>{children}</SlideUpDiv>
);
