import styled from "styled-components";

export const Root = styled.div`
    display: grid;
    gap: 12px;
`;

export const Guidance = styled.div`
    display: grid;
    gap: 4px;
`;

export const Title = styled.h3`
    margin: 0;
    color: #111827;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0;
`;

export const Description = styled.p`
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
`;

export const UploadFrame = styled.button<{ $hasImage: boolean }>`
    position: relative;
    width: min(100%, 520px);
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border: 1px dashed ${({ $hasImage }) => ($hasImage ? "#93c5fd" : "#cbd5e1")};
    border-radius: 12px;
    background: ${({ $hasImage }) =>
        $hasImage
            ? "#f8fafc"
            : "linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%)"};
    cursor: pointer;
    padding: 0;
    transition:
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.18s ease;

    &:hover {
        border-color: #3b82f6;
        box-shadow: 0 10px 24px -18px rgba(29, 78, 216, 0.55);
        transform: translateY(-1px);
    }

    &:disabled {
        cursor: wait;
        transform: none;
    }
`;

export const PreviewImage = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const EmptyState = styled.div`
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    color: #2563eb;
    text-align: center;

    svg {
        width: 34px;
        height: 34px;
        margin-bottom: 8px;
    }
`;

export const EmptyText = styled.span`
    display: block;
    color: #1f2937;
    font-size: 14px;
    font-weight: 700;
`;

export const EmptyHint = styled.span`
    display: block;
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.35;
`;

export const Overlay = styled.div<{ $visible: boolean }>`
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.5);
    color: #ffffff;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity 0.18s ease;

    ${UploadFrame}:hover & {
        opacity: 1;
    }
`;

export const OverlayText = styled.span`
    font-size: 13px;
    font-weight: 700;
`;

export const ProgressTrack = styled.div`
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.35);
`;

export const ProgressValue = styled.div<{ $percent: number }>`
    width: ${({ $percent }) => $percent}%;
    height: 100%;
    border-radius: inherit;
    background: #ffffff;
    transition: width 0.15s ease;
`;

export const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const ActionButton = styled.button<{ $variant?: "danger" }>`
    height: 36px;
    padding: 0 12px;
    border: 1px solid ${({ $variant }) => ($variant === "danger" ? "#fecaca" : "#dbeafe")};
    border-radius: 10px;
    background: ${({ $variant }) => ($variant === "danger" ? "#fff7f7" : "#eff6ff")};
    color: ${({ $variant }) => ($variant === "danger" ? "#b91c1c" : "#1d4ed8")};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
        cursor: wait;
        opacity: 0.7;
    }
`;

export const ErrorText = styled.div`
    color: #b91c1c;
    font-size: 12px;
    line-height: 1.35;
`;
