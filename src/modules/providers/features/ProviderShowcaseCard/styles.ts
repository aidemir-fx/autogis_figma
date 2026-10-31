import styled, { css } from "styled-components";
import { ActivityType } from "../../types";

export const CARD_WIDTH = 280;
export const MASTER_CARD_WIDTH = 260;

export const CardRoot = styled.article<{ $variant?: "master" | "organization"; $clickable?: boolean }>`
    width: ${({ $variant }) =>
        $variant === "master" ? MASTER_CARD_WIDTH : CARD_WIDTH}px;
    min-width: ${({ $variant }) =>
        $variant === "master" ? MASTER_CARD_WIDTH : CARD_WIDTH}px;
    background: ${({ theme }) => theme.palette.background[1]};
    border: 1px solid #e5e7eb;
    border-radius: ${({ $variant }) => ($variant === "master" ? "8px" : "16px")};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
    cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

    ${({ $variant }) =>
        $variant === "master" &&
        css`
            min-height: 280px;
        `}

    ${({ $variant }) =>
        $variant === "organization" &&
        css`
            min-height: 380px;
        `}
`;

export const MasterHead = styled.header`
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 12px 0;
    min-height: 58px;
`;

export const Avatar = styled.div`
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #c2dafe 0%, #3b82f6 100%);
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
`;

export const AvatarImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const LiveDot = styled.span<{ $status: "on" | "busy" | "off" }>`
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    background: ${({ $status }) =>
        $status === "on"
            ? "#10b981"
            : $status === "busy"
              ? "#ea580c"
              : "#9ca3af"};
`;

export const Identity = styled.div`
    min-width: 0;
`;

export const ProviderName = styled.h3<{ $master?: boolean }>`
    margin: 0;
    color: #111827;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.22;
    letter-spacing: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    ${({ $master }) => $master && "min-height: 34px;"}
`;

export const MetaRow = styled.div`
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 7px;
    margin-top: 5px;
    color: #6b7280;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 11px;
    white-space: nowrap;
`;

export const RatingPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #111827;
    font-weight: 700;

    svg {
        width: 11px;
        height: 11px;
        color: #9ca3af;
    }
`;

export const Reviews = styled.span`
    color: #6b7280;
    font-weight: 500;
`;

export const Dot = styled.span`
    width: 3px;
    height: 3px;
    flex: 0 0 3px;
    border-radius: 50%;
    background: #9ca3af;
`;

export const Distance = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #6b7280;
    font-weight: 700;
    white-space: nowrap;

    svg {
        width: 11px;
        height: 11px;
    }
`;

export const MapButton = styled.button`
    margin-top: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.88);
    color: #111827;
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 8px 18px -14px rgba(15, 23, 42, 0.56);
    backdrop-filter: blur(8px);
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        transform 160ms ease;

    svg {
        width: 10px;
        height: 10px;
        color: #1d4ed8;
    }

    &:hover {
        border-color: rgba(225, 237, 253, 0.95);
        background: rgba(239, 246, 255, 0.94);
        color: #1d4ed8;
        transform: translateY(-1px);
    }
`;

export const Cover = styled.div<{ $activityType?: ActivityType }>`
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: ${({ $activityType }) => {
        if ($activityType === ActivityType.auto_wash) {
            return "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 50%), linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #3b82f6 100%)";
        }

        if ($activityType === ActivityType.auto_shop) {
            return "radial-gradient(circle at 75% 25%, rgba(59,130,246,0.2), transparent 55%), linear-gradient(135deg, #1f2937 0%, #475569 60%, #64748b 100%)";
        }

        return "radial-gradient(circle at 75% 25%, rgba(59,130,246,0.32), transparent 55%), linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)";
    }};
`;

export const CoverImage = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const CoverScrim = styled.div`
    position: absolute;
    inset: 0;
    background:
        linear-gradient(0deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0) 45%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0) 35%);
`;

export const CoverOverlays = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
`;

export const CoverRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const pillBase = css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: fit-content;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
    white-space: nowrap;
`;

export const StatusPill = styled.span<{ $status: "on" | "busy" | "off" }>`
    ${pillBase};
    padding: 4px 8px;
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

    &::before {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: ${({ $status }) =>
            $status === "on"
                ? "#10b981"
                : $status === "busy"
                  ? "#ea580c"
                  : "#9ca3af"};
    }
`;

export const CoverStatusPill = styled(StatusPill)`
    backdrop-filter: blur(6px);
`;

export const OnlinePill = styled.span<{ $cover?: boolean }>`
    ${pillBase};
    padding: 4px 8px;
    border: 1px solid
        ${({ $cover }) =>
            $cover ? "rgba(232, 244, 227, 0.72)" : "rgba(100, 180, 65, 0.28)"};
    background: ${({ $cover }) =>
        $cover
            ? "linear-gradient(135deg, #64b441 0%, #4e992d 100%)"
            : "#e8f4e3"};
    color: ${({ $cover }) => ($cover ? "#ffffff" : "#2a8800")};
    box-shadow: ${({ $cover }) =>
        $cover ? "0 10px 18px -12px rgba(38, 65, 43, 0.72)" : "none"};
    backdrop-filter: ${({ $cover }) => ($cover ? "blur(8px)" : "none")};

    svg {
        width: 10px;
        height: 10px;
    }
`;

export const CoverBadge = styled.span`
    ${pillBase};
    margin-left: auto;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.95);
    color: #111827;
    backdrop-filter: blur(6px);
    font-family: ui-monospace, "SF Mono", Menlo, monospace;

    svg {
        width: 9px;
        height: 9px;
        color: #9ca3af;
    }
`;

export const CoverMapButton = styled.button`
    ${pillBase};
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.88);
    color: #111827;
    font-size: 10.5px;
    cursor: pointer;
    box-shadow: 0 8px 18px -14px rgba(15, 23, 42, 0.56);
    backdrop-filter: blur(8px);
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        transform 160ms ease;

    svg {
        width: 10px;
        height: 10px;
        color: #1d4ed8;
    }

    &:hover {
        border-color: rgba(225, 237, 253, 0.95);
        background: rgba(239, 246, 255, 0.94);
        color: #1d4ed8;
        transform: translateY(-1px);
    }
`;

export const OrgIdentity = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 14px 0;
`;

export const OrgMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: #6b7280;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 11px;
`;

export const OrgAddress = styled.span`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const Body = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 10px 12px 12px;
`;

export const StatusRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
`;

export const Block = styled.div``;

export const BlockTitle = styled.div<{ $compact?: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 7px;
    color: #6b7280;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: ${({ $compact }) => ($compact ? "10px" : "10.5px")};
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;

    svg {
        width: ${({ $compact }) => ($compact ? "10px" : "11px")};
        height: ${({ $compact }) => ($compact ? "10px" : "11px")};
    }
`;

export const Tags = styled.div<{ $compact?: boolean }>`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    & > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    ${({ $compact }) =>
        $compact &&
        css`
            min-height: 26px;
            max-height: none;
            overflow: visible;
        `}

    ${({ $compact }) =>
        !$compact &&
        css`
            min-height: 26px;
            max-height: 52px;
            overflow: hidden;
        `}
`;

export const PaymentIcons = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
`;

export const PaymentRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    ${BlockTitle} {
        margin-bottom: 0;
        flex: 0 0 auto;
    }
`;

export const PaymentIcon = styled.span`
    width: 26px;
    height: 24px;
    display: inline-grid;
    place-items: center;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    background: #f8fafc;
    color: #475569;

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const Tag = styled.span`
    max-width: 100%;
    box-sizing: border-box;
    padding: 4px 8px;
    border: 1px solid #f1f5f9;
    border-radius: 8px;
    background: #f8fafc;
    color: #374151;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.2;
    white-space: normal;
    overflow-wrap: anywhere;
`;

export const Days = styled.div<{ $compact?: boolean }>`
    display: inline-grid;
    grid-template-columns: repeat(7, ${({ $compact }) => ($compact ? "21px" : "26px")});
    gap: ${({ $compact }) => ($compact ? "3px" : "5px")};
    width: fit-content;
`;

export const Day = styled.span<{ $isActive: boolean; $compact?: boolean }>`
    display: grid;
    place-items: center;
    width: ${({ $compact }) => ($compact ? "21px" : "26px")};
    height: ${({ $compact }) => ($compact ? "23px" : "26px")};
    border-radius: 6px;
    background: ${({ $isActive }) => ($isActive ? "#ecfdf5" : "#f1f5f9")};
    color: ${({ $isActive }) => ($isActive ? "#10b981" : "#9ca3af")};
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: ${({ $compact }) => ($compact ? "9px" : "10.5px")};
    font-weight: 700;
    line-height: 1;
`;

export const ScheduleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    ${BlockTitle} {
        margin-bottom: 0;
        white-space: nowrap;
    }
`;

export const Actions = styled.div<{ $layout?: "default" | "booking" }>`
    display: grid;
    grid-template-columns: ${({ $layout }) =>
        $layout === "booking" ? "1fr 38px" : "1fr 1fr"};
    gap: 8px;
    margin-top: auto;
`;

export const ActionLink = styled.a<{
    $variant?: "primary" | "outline" | "booking" | "phoneIcon";
}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 38px;
    border-radius: 8px;
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
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    min-width: 0;
    width: ${({ $variant }) => ($variant === "phoneIcon" ? "38px" : "auto")};
    padding: ${({ $variant }) => ($variant === "phoneIcon" ? "0" : "0 10px")};
    box-shadow: ${({ $variant }) => {
        if ($variant === "primary") {
            return "0 4px 12px -4px rgba(59, 130, 246, 0.3)";
        }

        if ($variant === "booking") {
            return "0 4px 12px -4px rgba(100, 180, 65, 0.34)";
        }

        return "none";
    }};
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        transform 160ms ease;

    svg {
        width: 14px;
        height: 14px;
    }

    ${({ $variant }) =>
        $variant === "phoneIcon" &&
        css`
            svg {
                width: 15px;
                height: 15px;
            }
        `}

    &:hover {
        transform: translateY(-1px);
        background: ${({ $variant }) => {
            if ($variant === "primary") {
                return "#2563eb";
            }

            if ($variant === "booking") {
                return "#4e992d";
            }

            return "#eff6ff";
        }};
        border-color: ${({ $variant }) =>
            $variant === "booking" ? "#4e992d" : "rgba(225, 237, 253, 0.95)"};
    }
`;
