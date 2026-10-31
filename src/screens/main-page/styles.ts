import { ActivityType } from "@modules/providers";
import { styled } from "styled-components";

export const PageRoot = styled.div`
    min-height: 100vh;
    background: #fafafa;
    color: #111827;
`;

export const HomeShell = styled.div`
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    padding: 18px 40px 118px;

    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 0 0 96px;
    }
`;

export const TopBar = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 4px 18px;

    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 14px 18px 10px;
    }
`;

export const BrandMark = styled.a`
    display: inline-flex;
    align-items: center;
    min-height: 40px;
`;

export const BrandLogo = styled.img`
    display: block;
    width: 120px;
    height: auto;
`;

export const TopActions = styled.div`
    display: flex;
    align-items: center;
    width: max-content;
    max-width: max-content;
    flex: 0 0 auto;
    gap: 10px;
`;

export const TopActionTile = styled.div<{ $profile?: boolean }>`
    width: ${({ $profile }) => ($profile ? "52px" : "44px")};
    height: ${({ $profile }) => ($profile ? "52px" : "44px")};
    box-sizing: border-box;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid #dbe3ef;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

    &:hover {
        border-color: #93c5fd;
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.14);
        transform: translateY(-1px);
    }
`;

export const ProfileButton = styled.button<{ $hasAvatar?: boolean; $square?: boolean }>`
    width: ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "40px" : "auto")};
    min-width: ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "40px" : "40px")};
    max-width: ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "40px" : "none")};
    height: 40px;
    max-height: 40px;
    aspect-ratio: ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "1 / 1" : "auto")};
    padding: ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "0" : "0 12px")};
    box-sizing: border-box;
    flex: 0 0 ${({ $square, $hasAvatar }) => ($square || $hasAvatar ? "40px" : "auto")};
    flex-shrink: 0;
    border-radius: 12px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #111827;
    color: #3b82f6;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 800;
`;

export const HeroGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 24px;
    align-items: stretch;
    margin-bottom: 18px;

    ${({ theme }) => theme.breakpoints.down("lg")} {
        grid-template-columns: 1fr;
    }

    ${({ theme }) => theme.breakpoints.down("md")} {
        display: block;
        margin-bottom: 0;
    }
`;

export const HeroCopy = styled.section`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
    min-height: 380px;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    background: #ffffff;

    ${({ theme }) => theme.breakpoints.down("md")} {
        min-height: auto;
        padding: 4px 20px 14px;
        border: 0;
        border-radius: 0;
        background: transparent;
    }
`;

export const SearchPanel = styled.div`
    width: 100%;
    max-width: 620px;

    .MuiAutocomplete-root {
        width: 100%;
    }

    input {
        font-size: 14px;
    }
`;

export const HeroMapCard = styled.section`
    position: relative;
    min-height: 418px;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    background: #eef2f7;
    overflow: hidden;

    ${({ theme }) => theme.breakpoints.down("md")} {
        min-height: 418px;
        margin: 0 18px 18px;
    }
`;

export const MapWrapper = styled.div`
    position: absolute;
    inset: 0;

    .ymaps-2-1-79-inner-panes,
    .ymaps-2-1-79-map {
        border-radius: 18px;
    }
`;

export const MapAttentionMarker = styled.div`
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 4;
    width: 74px;
    height: 74px;
    pointer-events: none;
    transform: translate(-50%, calc(-50% - 24px));
    animation: map-attention-bob 1280ms cubic-bezier(0.2, 0.75, 0.22, 1) both;

    &::before,
    &::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 999px;
    }

    &::before {
        border: 2px solid rgba(59, 130, 246, 0.76);
        background: rgba(59, 130, 246, 0.08);
        box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.88),
            0 14px 34px rgba(37, 99, 235, 0.24);
        animation: map-attention-ring 1280ms cubic-bezier(0.16, 1, 0.3, 1)
            both;
    }

    &::after {
        inset: 26px;
        background: #3b82f6;
        box-shadow:
            0 0 0 6px rgba(59, 130, 246, 0.18),
            0 0 0 10px rgba(255, 255, 255, 0.52);
        animation: map-attention-core 1280ms ease-out both;
    }

    @keyframes map-attention-bob {
        0% {
            transform: translate(-50%, calc(-50% - 24px)) scale(0.9);
            opacity: 0;
        }
        14% {
            opacity: 1;
        }
        34% {
            transform: translate(calc(-50% - 4px), calc(-50% - 30px))
                scale(1.02);
        }
        56% {
            transform: translate(calc(-50% + 3px), calc(-50% - 27px))
                scale(1);
        }
        100% {
            transform: translate(-50%, calc(-50% - 24px)) scale(0.96);
            opacity: 0;
        }
    }

    @keyframes map-attention-ring {
        0% {
            transform: scale(0.48);
            opacity: 0;
        }
        18% {
            opacity: 0.94;
        }
        100% {
            transform: scale(1.52);
            opacity: 0;
        }
    }

    @keyframes map-attention-core {
        0% {
            transform: scale(0.6);
            opacity: 0;
        }
        18%,
        68% {
            opacity: 1;
        }
        100% {
            transform: scale(0.78);
            opacity: 0;
        }
    }
`;

export const FiltersStrip = styled.div`
    display: flex;
    gap: 8px;
    padding: 0 4px 14px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
        display: none;
    }

    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 0 18px 14px;
    }
`;

export const ActivityChip = styled.button<{ $isActive: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    padding: 9px 14px;
    border: 1px solid ${({ $isActive }) => ($isActive ? "#111827" : "#e5e7eb")};
    border-radius: 999px;
    background: ${({ $isActive }) => ($isActive ? "#111827" : "#ffffff")};
    color: ${({ $isActive }) => ($isActive ? "#ffffff" : "#111827")};
    font-size: 12.5px;
    font-weight: 750;
    white-space: nowrap;

    span {
        color: ${({ $isActive }) =>
            $isActive ? "rgba(255,255,255,0.62)" : "#6b7280"};
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 11px;
    }
`;

export const AvailableToggle = styled.button<{ $isActive: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0 10px 0 13px;
    border: 1px solid ${({ $isActive }) => ($isActive ? "#bbf7d0" : "#e5e7eb")};
    border-radius: 12px;
    background: ${({ $isActive }) => ($isActive ? "#f0fdf4" : "#ffffff")};
    color: #111827;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    position: relative;
    transition: border-color 0.15s ease, background 0.15s ease;

    &::before {
        content: "";
        order: 2;
        width: 34px;
        height: 20px;
        border-radius: 999px;
        background: ${({ $isActive }) => ($isActive ? "#22c55e" : "#cbd5e1")};
        transition: background 0.15s ease;
    }

    &::after {
        content: "";
        position: absolute;
        right: ${({ $isActive }) => ($isActive ? "11px" : "25px")};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
        transition: right 0.15s ease;
    }

    &:focus-visible {
        outline: 3px solid rgba(37, 99, 235, 0.24);
        outline-offset: 2px;
    }
`;

export const RadiusFilterButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    flex: 0 0 auto;
    padding: 0 13px;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        border-color: #93c5fd;
        background: #dbeafe;
    }

    &:focus-visible {
        outline: 3px solid rgba(37, 99, 235, 0.24);
        outline-offset: 2px;
    }
`;

export const ContentFlow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 26px;
`;

export const CarouselSection = styled.section``;

export const CarouselHead = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 0 4px 12px;

    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 0 20px 12px;
    }
`;

export const CarouselTitle = styled.h2`
    margin: 0;
    color: #111827;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0;
`;

export const CarouselMeta = styled.span`
    color: #6b7280;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 11px;

    &::before {
        content: "·";
        margin: 0 6px;
        color: #9ca3af;
    }
`;

export const CarouselTrack = styled.div`
    --carousel-gutter: 4px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    overflow-x: auto;
    padding: 4px var(--carousel-gutter) 12px;
    scroll-padding-inline-start: var(--carousel-gutter);
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
        display: none;
    }

    > * {
        flex: 0 0 auto;
        margin-inline: 0;
        scroll-snap-align: start;
    }

    ${({ theme }) => theme.breakpoints.down("md")} {
        --carousel-gutter: 18px;
    }
`;

export const EmptyCard = styled.div`
    width: 280px;
    min-width: 280px;
    min-height: 220px;
    border: 1px dashed #cbd5e1;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #ffffff;
    color: #6b7280;
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
`;

export const AvailableSection = styled.section`
    padding: 2px 4px 0;

    ${({ theme }) => theme.breakpoints.down("md")} {
        padding: 0 18px;
    }
`;

export const AvailableGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    align-items: start;
    gap: 12px;

    > article {
        justify-self: start;
    }
`;

export const LoadingPanel = styled.div`
    display: grid;
    place-items: center;
    min-height: 220px;
    color: #6b7280;
    font-size: 14px;
`;

export const ErrorWrapper = styled.div`
    padding: 24px 18px;
`;

export const TypeAccent = styled.span<{ $type: ActivityType }>`
    color: ${({ $type }) =>
        $type === ActivityType.master
            ? "#1d4ed8"
            : $type === ActivityType.auto_wash
              ? "#0891b2"
              : $type === ActivityType.auto_shop
                ? "#475569"
                : "#111827"};
`;

export const TenderFloatingBar = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1350;
    width: calc(100% - 32px);
    max-width: 620px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(14px);
    border-radius: 18px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08);
    padding: 12px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    @media (max-width: 1024px) {
        bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 12px);
        width: calc(100% - 24px);
        padding: 12px 14px;
    }

    @media (max-width: 540px) {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px 14px;
    }
`;

export const TenderBarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

export const TenderBarInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const TenderBarBadge = styled.div`
    background: #2563eb;
    color: #ffffff;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
    flex-shrink: 0;
`;

export const TenderBarActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: 540px) {
        width: 100%;
        & > button {
            flex: 1;
        }
    }
`;

export const TenderCloseButtonDesktop = styled.button`
    border: none;
    background: #f1f5f9;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }

    @media (max-width: 540px) {
        display: none;
    }
`;

export const TenderCloseButtonMobile = styled.button`
    border: none;
    background: #f1f5f9;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
    }

    @media (max-width: 540px) {
        display: flex;
    }
`;
