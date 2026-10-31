import styled, { keyframes, css } from "styled-components";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
`;

// ─── Container ────────────────────────────────────────────────────────────────

export const Root = styled.div`
    position: relative;
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    cursor: pointer;
    align-self: flex-start;
`;

// ─── Avatar circle ────────────────────────────────────────────────────────────

export const AvatarCircle = styled.div<{ $hasImage: boolean; $isActive: boolean }>`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border: 2px solid
        ${({ theme, $isActive }) =>
            $isActive
                ? theme.palette.blue.text
                : theme.palette.blue.secondary};
    background: linear-gradient(
        135deg,
        ${({ theme }) => theme.palette.blue.secondary} 0%,
        ${({ theme }) => theme.palette.background[3]} 100%
    );
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    ${Root}:hover & {
        border-color: ${({ theme }) => theme.palette.blue.text};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.palette.blue.secondary};
    }
`;

export const AvatarImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

export const AvatarFallback = styled.div`
    color: ${({ theme }) => theme.palette.blue.text};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 32px;
        height: 32px;
    }
`;

// ─── Overlay shown on hover / during upload ───────────────────────────────────

export const Overlay = styled.div<{ $visible: boolean }>`
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity 0.2s ease;

    ${Root}:hover & {
        opacity: 1;
    }
`;

export const OverlayIcon = styled.div`
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 22px;
        height: 22px;
    }
`;

// ─── Spinner for processing state ─────────────────────────────────────────────

export const SpinnerRing = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

// ─── Progress bar ─────────────────────────────────────────────────────────────

export const ProgressBar = styled.div<{ $percent: number }>`
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: ${({ $percent }) => $percent}%;
    background: ${({ theme }) => theme.palette.blue.text};
    border-radius: 0 0 50% 50%;
    transition: width 0.15s ease;
`;

// ─── Badge — small camera icon below the circle ───────────────────────────────

export const EditBadge = styled.div`
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${({ theme }) => theme.palette.blue.text};
    border: 2px solid ${({ theme }) => theme.palette.background[1]};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    pointer-events: none;

    svg {
        width: 11px;
        height: 11px;
    }
`;

// ─── Error tooltip ────────────────────────────────────────────────────────────

export const ErrorText = styled.div`
    font-size: 11px;
    color: ${({ theme }) => theme.palette.error?.heavy ?? "#d32f2f"};
    margin-top: 4px;
    max-width: 120px;
    text-align: center;
    line-height: 1.3;
`;

// ─── Processing pulse on avatar while waiting ─────────────────────────────────

export const ProcessingPulse = styled.div`
    animation: ${pulse} 1.4s ease-in-out infinite;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;
