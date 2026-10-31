import styled, { css } from "styled-components";

export const PRIMARY_BLUE = "#3b82f6";
export const BALLOON_CARD_WIDTH = 256;
export const BALLOON_MAX_HEIGHT = 332;

type MapContainerProps = {
    $isReady: boolean;
};

export const MapContainer = styled.div<MapContainerProps>`
    position: relative;
    opacity: ${({ $isReady }) => ($isReady ? 1 : 0)};
    width: 100%;

    .ymaps-2-1-79-balloon {
        width: ${BALLOON_CARD_WIDTH}px !important;
        max-width: calc(100vw - 40px) !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14) !important;
        margin: 0;
    }

    .ymaps-2-1-79-balloon__layout {
        width: 100% !important;
        max-height: ${BALLOON_MAX_HEIGHT}px !important;
        border-radius: 12px !important;
        overflow: hidden !important;
    }

    .ymaps-2-1-79-balloon__content {
        width: 100% !important;
        max-width: calc(100vw - 40px) !important;
        max-height: ${BALLOON_MAX_HEIGHT}px !important;
        padding: 0 !important;
        margin-right: 0 !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        box-sizing: border-box !important;
        scrollbar-width: thin;
    }

    .ymaps-2-1-79-balloon .ymaps-2-1-79-balloon__content ymaps {
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
        overflow: visible !important;
    }

    .ymaps-2-1-79-balloon:first-child {
        height: auto !important;
        overflow: visible;
    }

    .ymaps-2-1-79-balloon__close {
        position: absolute !important;
        top: 6px !important;
        right: 6px !important;
        z-index: 3 !important;
        min-width: 28px;
        min-height: 28px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
    }

    .ymaps-2-1-79-balloon__close-button {
        width: 28px !important;
        height: 28px !important;
        opacity: 0.75;
    }

    .ymaps-2-1-79-balloon__close + .ymaps-2-1-79-balloon__content {
        margin-right: 0;
        padding: 0 !important;
    }

    .ymaps-2-1-79-balloon__tail {
        display: none !important;
    }

    .ymaps-2-1-79-inner-panes {
        border-radius: 8px;
    }
`;

export const MastersListContainer = styled.div`
    padding: 0 16px;
    margin-top: 16px;
`;

export const GridList = styled.div`
    display: grid;
    grid-template-columns: 1fr;

    ${({ theme }) => theme.breakpoints.up("md")} {
        grid-template-columns: 1fr 1fr;
    }
    gap: 8px;
`;

export const ProviderCard = styled.article`
    width: 100%;
    max-width: calc(100vw - 40px);
    box-sizing: border-box;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #ffffff;
    color: #111827;
    overflow: hidden;
    box-shadow: none;
`;

export const BalloonCover = styled.div`
    position: relative;
    height: 92px;
    overflow: hidden;
    background: #eff6ff;
`;

export const BalloonCoverImage = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const BalloonHeader = styled.header`
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    padding: 10px 38px 7px 10px;
`;

export const BalloonAvatar = styled.div`
    position: relative;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: linear-gradient(135deg, #bfdbfe 0%, #3b82f6 100%);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
`;

export const BalloonAvatarImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const BalloonStatusDot = styled.span<{ $status: "on" | "busy" | "off" }>`
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 10px;
    height: 10px;
    border: 2px solid #ffffff;
    border-radius: 999px;
    background: ${({ $status }) =>
        $status === "on"
            ? "#10b981"
            : $status === "busy"
              ? "#ea580c"
              : "#9ca3af"};
`;

export const BalloonTitleGroup = styled.div`
    min-width: 0;
`;

export const BalloonName = styled.h3`
    margin: 0;
    color: #111827;
    font-size: 12.8px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

export const BalloonMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    color: #6b7280;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 10.5px;
    line-height: 1;
`;

export const BalloonMetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    font-weight: 700;

    svg {
        width: 11px;
        height: 11px;
    }
`;

export const BalloonDot = styled.span`
    width: 3px;
    height: 3px;
    flex: 0 0 3px;
    border-radius: 999px;
    background: #9ca3af;
`;

export const BalloonBody = styled.div`
    display: grid;
    gap: 7px;
    padding: 0 10px 10px;
`;

export const BalloonStatus = styled.div<{ $status: "on" | "busy" | "off" }>`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 999px;
    background: ${({ $status }) =>
        $status === "on"
            ? "#ecfdf5"
            : $status === "busy"
              ? "#fff7ed"
              : "#f1f5f9"};
    color: ${({ $status }) =>
        $status === "on"
            ? "#047857"
            : $status === "busy"
              ? "#9a3412"
              : "#374151"};
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1.1;

    &::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: ${({ $status }) =>
            $status === "on"
                ? "#10b981"
                : $status === "busy"
                  ? "#ea580c"
                  : "#9ca3af"};
    }
`;

export const BalloonPills = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
`;

export const BalloonBookingPill = styled.div`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    gap: 5px;
    padding: 4px 8px;
    border: 1px solid rgba(100, 180, 65, 0.28);
    border-radius: 999px;
    background: #e8f4e3;
    color: #2a8800;
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1.1;

    svg {
        width: 11px;
        height: 11px;
    }
`;

export const BalloonScheduleTag = styled.span`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 4px 8px;
    border: 1px solid #f1f5f9;
    border-radius: 7px;
    background: #f8fafc;
    color: #374151;
    font-size: 10.5px;
    font-weight: 650;
    line-height: 1.1;
    white-space: nowrap;
`;

export const BalloonAddress = styled.div`
    display: grid;
    grid-template-columns: 13px minmax(0, 1fr);
    gap: 5px;
    align-items: start;
    color: #4b5563;
    font-size: 11.5px;
    line-height: 1.28;

    svg {
        width: 12px;
        height: 12px;
        color: #3b82f6;
        margin-top: 1px;
    }

    span {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;

export const BalloonTags = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    max-height: 42px;
    overflow: hidden;
`;

export const BalloonTag = styled.span`
    max-width: 126px;
    padding: 4px 7px;
    border: 1px solid #edf2f7;
    border-radius: 7px;
    background: #f8fafc;
    color: #374151;
    font-size: 10.5px;
    font-weight: 650;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const BalloonActions = styled.div<{ $layout?: "default" | "booking" }>`
    display: grid;
    grid-template-columns: ${({ $layout }) =>
        $layout === "booking" ? "1fr 34px" : "1fr 1fr"};
    gap: 7px;
    padding-top: 2px;
`;

export const BalloonAction = styled.a<{
    $variant?: "primary" | "outline" | "booking" | "phoneIcon";
}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 34px;
    border: 1px solid
        ${({ $variant }) => {
            if ($variant === "primary") {
                return "#1d4ed8";
            }

            if ($variant === "booking") {
                return "#4e992d";
            }

            return "#e5e7eb";
        }};
    border-radius: 9px;
    background: ${({ $variant }) =>
        $variant === "primary"
            ? "#3b82f6"
            : $variant === "booking"
              ? "#64b441"
              : "#ffffff"};
    color: ${({ $variant }) =>
        $variant === "primary" || $variant === "booking"
            ? "#ffffff"
            : $variant === "phoneIcon"
              ? "#1d4ed8"
              : "#111827"};
    font-size: 11.5px;
    font-weight: 700;
    text-decoration: none;
    min-width: 0;
    width: ${({ $variant }) => ($variant === "phoneIcon" ? "34px" : "auto")};
    padding: ${({ $variant }) => ($variant === "phoneIcon" ? "0" : "0 8px")};

    svg {
        width: 12px;
        height: 12px;
    }

    ${({ $variant }) =>
        $variant === "phoneIcon" &&
        css`
            svg {
                width: 14px;
                height: 14px;
            }
        `}
`;
