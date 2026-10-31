import styled, { css, keyframes } from "styled-components";

export const GROUP_ACCENTS = {
    private_executor: {
        solid: "#2b5dad",
        soft: "rgba(43, 93, 173, 0.08)",
        softer: "rgba(43, 93, 173, 0.04)",
        ring: "rgba(43, 93, 173, 0.18)",
    },
    auto_service: {
        solid: "#d44a1c",
        soft: "rgba(212, 74, 28, 0.08)",
        softer: "rgba(212, 74, 28, 0.04)",
        ring: "rgba(212, 74, 28, 0.18)",
    },
    auto_wash: {
        solid: "#1d7a51",
        soft: "rgba(29, 122, 81, 0.08)",
        softer: "rgba(29, 122, 81, 0.04)",
        ring: "rgba(29, 122, 81, 0.18)",
    },
    auto_shop: {
        solid: "#7b3fa4",
        soft: "rgba(123, 63, 164, 0.08)",
        softer: "rgba(123, 63, 164, 0.04)",
        ring: "rgba(123, 63, 164, 0.18)",
    },
    neutral: {
        solid: "#1a1814",
        soft: "rgba(26, 24, 20, 0.06)",
        softer: "rgba(26, 24, 20, 0.03)",
        ring: "rgba(26, 24, 20, 0.12)",
    },
} as const;

export type AccentKey = keyof typeof GROUP_ACCENTS;

const fadeUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(14px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const Shell = styled.div`
    background: #f6f2ea;
    min-height: 100%;
    padding: 24px 20px 140px;
    position: relative;

    @media (min-width: 900px) {
        padding: 40px 48px 160px;
    }
`;

export const Container = styled.div`
    max-width: 1080px;
    margin: 0 auto;
`;

export const Header = styled.header`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(26, 24, 20, 0.1);
    margin-bottom: 28px;

    @media (min-width: 900px) {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 48px;
        align-items: end;
        padding-bottom: 28px;
        margin-bottom: 32px;
    }
`;

export const Eyebrow = styled.div`
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.5);
    font-weight: 500;
    margin-bottom: 10px;
`;

export const Title = styled.h1`
    font-size: clamp(26px, 5.5vw, 42px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.05;
    color: #1a1814;
    margin: 0;
    max-width: 18ch;

    em {
        font-style: italic;
        font-weight: 500;
        color: #d44a1c;
    }
`;

export const Subtitle = styled.p`
    margin: 12px 0 0;
    color: rgba(26, 24, 20, 0.62);
    font-size: 14.5px;
    line-height: 1.5;
    max-width: 52ch;
`;

export const MiniSteps = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.5);
    flex-wrap: wrap;

    b {
        color: #d44a1c;
        font-weight: 600;
    }

    i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(26, 24, 20, 0.18);
        display: inline-block;

        &.on {
            background: #d44a1c;
        }
    }

    @media (max-width: 899px) {
        font-size: 10.5px;
        gap: 6px;
    }
`;

export const CardsGrid = styled.div<{ $expanded: boolean }>`
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;

    @media (min-width: 760px) {
        grid-template-columns: ${({ $expanded }) =>
            $expanded ? "1fr" : "repeat(3, 1fr)"};
    }
`;

type CardProps = {
    $accent: AccentKey;
    $expanded: boolean;
    $dimmed: boolean;
    $selectable: boolean;
};

export const GroupCard = styled.button<CardProps>`
    --c: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    --c-soft: ${({ $accent }) => GROUP_ACCENTS[$accent].soft};
    --c-softer: ${({ $accent }) => GROUP_ACCENTS[$accent].softer};
    --c-ring: ${({ $accent }) => GROUP_ACCENTS[$accent].ring};

    appearance: none;
    text-align: left;
    cursor: ${({ $selectable }) => ($selectable ? "pointer" : "default")};
    background: #ffffff;
    border: 1px solid rgba(26, 24, 20, 0.08);
    border-radius: 18px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.25s ease,
        box-shadow 0.25s ease,
        border-color 0.25s ease,
        opacity 0.25s ease;
    width: 100%;
    color: inherit;
    font-family: inherit;
    animation: ${fadeUp} 0.35s ease both;

    &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 42%;
        height: 5px;
        background: var(--c);
        border-radius: 18px 0 18px 0;
    }

    ${({ $expanded }) =>
        $expanded &&
        css`
            grid-column: 1 / -1;
            padding: 26px;
            border-color: var(--c);
            box-shadow: 0 18px 48px rgba(26, 24, 20, 0.1);

            &::before {
                width: 100%;
                height: 4px;
                border-radius: 18px 18px 0 0;
            }
        `}

    ${({ $dimmed }) =>
        $dimmed &&
        css`
            opacity: 0.55;
        `}

    ${({ $selectable, $expanded }) =>
        $selectable &&
        !$expanded &&
        css`
            &:hover {
                transform: translateY(-3px);
                box-shadow: 0 16px 34px rgba(26, 24, 20, 0.08);
                opacity: 1;
            }

            &:focus-visible {
                outline: none;
                border-color: var(--c);
                box-shadow: 0 0 0 3px var(--c-ring);
            }
        `}

    @media (min-width: 900px) {
        padding: ${({ $expanded }) => ($expanded ? "32px" : "26px")};
    }
`;

export const CardTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 40px;
`;

export const CardIcon = styled.div<{ $accent: AccentKey }>`
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        filter: brightness(0) invert(1);
    }

    @media (min-width: 900px) {
        width: 56px;
        height: 56px;
        border-radius: 16px;
    }
`;

export const CardNum = styled.span<{ $accent: AccentKey }>`
    font-size: 36px;
    font-weight: 300;
    letter-spacing: -0.04em;
    -webkit-text-stroke: 1px ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    color: transparent;
    line-height: 1;

    @media (min-width: 900px) {
        font-size: 42px;
    }
`;

export const CardName = styled.h3`
    margin: 0 0 6px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: #1a1814;

    @media (min-width: 900px) {
        font-size: 22px;
    }
`;

export const CardDesc = styled.p`
    margin: 0 0 16px;
    font-size: 13.5px;
    color: rgba(26, 24, 20, 0.6);
    line-height: 1.5;
    max-width: 42ch;
`;

export const CardMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px dashed rgba(26, 24, 20, 0.12);
    flex-wrap: wrap;
`;

export const CardChip = styled.span`
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.55);
    padding: 4px 10px;
    border: 1px solid rgba(26, 24, 20, 0.12);
    border-radius: 999px;
    font-weight: 500;
    background: transparent;
    white-space: nowrap;
`;

export const CardCount = styled.span<{ $accent: AccentKey }>`
    margin-left: auto;
    font-size: 11.5px;
    color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    font-weight: 600;
`;

export const ExpandGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 28px;
    align-items: start;

    @media (min-width: 900px) {
        grid-template-columns: 1fr 1.25fr;
        gap: 40px;
    }
`;

export const ExpandHead = styled.div`
    animation: ${fadeUp} 0.35s ease both;
`;

export const ExpandName = styled.h3`
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: #1a1814;

    @media (min-width: 900px) {
        font-size: 28px;
    }
`;

export const ExpandDesc = styled.p`
    margin: 0;
    font-size: 14.5px;
    color: rgba(26, 24, 20, 0.6);
    line-height: 1.55;
    max-width: 42ch;
`;

export const ChangeTypeBtn = styled.button<{ $accent: AccentKey }>`
    margin-top: 18px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    padding: 6px 0;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 1px solid currentColor;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.7;
    }

    svg {
        width: 12px;
        height: 12px;
    }
`;

export const SubtypesBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: ${fadeUp} 0.35s ease both;
    animation-delay: 0.05s;
`;

export const SubtypesLabel = styled.div`
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.5);
    font-weight: 600;
    margin-bottom: 6px;
`;

export const SubtypeRow = styled.button<{ $accent: AccentKey; $selected: boolean }>`
    appearance: none;
    text-align: left;
    width: 100%;
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 14px;
    align-items: center;
    padding: 14px 16px;
    background: ${({ $selected }) => ($selected ? "#fff" : "#fafaf5")};
    border: 1px solid
        ${({ $selected, $accent }) =>
            $selected ? GROUP_ACCENTS[$accent].solid : "rgba(26, 24, 20, 0.08)"};
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition:
        border-color 0.2s ease,
        background 0.2s ease,
        transform 0.2s ease,
        box-shadow 0.2s ease;

    ${({ $selected, $accent }) =>
        $selected &&
        css`
            box-shadow: 0 0 0 4px ${GROUP_ACCENTS[$accent].soft};
        `}

    &:hover {
        border-color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
        background: #fff;
        transform: translateX(3px);
    }

    &:focus-visible {
        outline: none;
        border-color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
        box-shadow: 0 0 0 3px ${({ $accent }) => GROUP_ACCENTS[$accent].ring};
    }
`;

export const SubtypeRadio = styled.span<{ $accent: AccentKey; $selected: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid
        ${({ $selected, $accent }) =>
            $selected ? GROUP_ACCENTS[$accent].solid : "rgba(26, 24, 20, 0.22)"};
    position: relative;
    flex-shrink: 0;
    justify-self: center;
    transition: border-color 0.2s ease;

    &::after {
        content: "";
        position: absolute;
        inset: 4px;
        background: ${({ $selected, $accent }) =>
            $selected ? GROUP_ACCENTS[$accent].solid : "transparent"};
        border-radius: 50%;
        transition: background 0.2s ease;
    }
`;

export const SubtypeText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    b {
        font-size: 14.5px;
        font-weight: 600;
        color: #1a1814;
    }

    span {
        font-size: 12.5px;
        color: rgba(26, 24, 20, 0.55);
        line-height: 1.4;
    }
`;

export const FieldsReveal = styled.div`
    margin-top: 32px;
    padding-top: 28px;
    border-top: 1px solid rgba(26, 24, 20, 0.1);
    animation: ${fadeUp} 0.4s ease both;
`;

export const FieldsHead = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 6px;
`;

export const FieldsTitle = styled.h4<{ $accent: AccentKey }>`
    margin: 0;
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #1a1814;

    em {
        font-style: italic;
        font-weight: 500;
        color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    }
`;

export const FieldsHint = styled.small`
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.45);
    font-weight: 600;
`;

export const FieldsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @media (min-width: 700px) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const FieldCell = styled.div<{ $wide?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;

    @media (min-width: 700px) {
        grid-column: ${({ $wide }) => ($wide ? "1 / -1" : "auto")};
    }
`;

export const FieldLabel = styled.label`
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 24, 20, 0.55);
    font-weight: 600;
`;

export const FieldInput = styled.input<{ $accent: AccentKey; $invalid?: boolean }>`
    background: #fff;
    border: 1px solid
        ${({ $invalid }) => ($invalid ? "#d32f2f" : "rgba(26, 24, 20, 0.12)")};
    border-radius: 10px;
    padding: 13px 14px;
    font-family: inherit;
    font-size: 14.5px;
    color: #1a1814;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    width: 100%;

    &::placeholder {
        color: rgba(26, 24, 20, 0.32);
    }

    &:focus {
        outline: none;
        border-color: ${({ $accent, $invalid }) =>
            $invalid ? "#d32f2f" : GROUP_ACCENTS[$accent].solid};
        box-shadow: 0 0 0 4px
            ${({ $accent, $invalid }) =>
                $invalid ? "rgba(211, 47, 47, 0.12)" : GROUP_ACCENTS[$accent].soft};
    }

    &:disabled {
        background: #faf7f1;
        color: rgba(26, 24, 20, 0.55);
    }
`;

export const FieldTextarea = styled.textarea<{ $accent: AccentKey }>`
    background: #fff;
    border: 1px solid rgba(26, 24, 20, 0.12);
    border-radius: 10px;
    padding: 13px 14px;
    font-family: inherit;
    font-size: 14.5px;
    color: #1a1814;
    resize: vertical;
    min-height: 72px;
    width: 100%;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

    &::placeholder {
        color: rgba(26, 24, 20, 0.32);
    }

    &:focus {
        outline: none;
        border-color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
        box-shadow: 0 0 0 4px ${({ $accent }) => GROUP_ACCENTS[$accent].soft};
    }
`;

export const FieldError = styled.div`
    font-size: 12px;
    color: #d32f2f;
    margin-top: 2px;
`;

export const FieldHelper = styled.div`
    font-size: 12px;
    color: rgba(26, 24, 20, 0.5);
    line-height: 1.4;
    margin-top: 2px;
`;

export const ProfileNote = styled.div<{ $accent: AccentKey }>`
    padding: 12px 14px;
    background: ${({ $accent }) => GROUP_ACCENTS[$accent].soft};
    border: 1px solid ${({ $accent }) => GROUP_ACCENTS[$accent].ring};
    border-radius: 10px;
    font-size: 13px;
    color: rgba(26, 24, 20, 0.82);
    line-height: 1.4;

    b {
        color: #1a1814;
        font-weight: 600;
    }
`;

export const AgreementRow = styled.label<{ $accent: AccentKey }>`
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid rgba(26, 24, 20, 0.1);
    border-radius: 12px;
    margin-top: 20px;
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
        border-color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    }

    span {
        font-size: 13.5px;
        color: rgba(26, 24, 20, 0.75);
        line-height: 1.45;
    }
`;

export const AgreementBox = styled.span<{ $accent: AccentKey; $checked: boolean }>`
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1.5px solid
        ${({ $checked, $accent }) =>
            $checked ? GROUP_ACCENTS[$accent].solid : "rgba(26, 24, 20, 0.22)"};
    background: ${({ $checked, $accent }) =>
        $checked ? GROUP_ACCENTS[$accent].solid : "#fff"};
    position: relative;
    flex-shrink: 0;
    transition:
        border-color 0.2s ease,
        background 0.2s ease;

    &::after {
        content: "";
        position: absolute;
        left: 7px;
        top: 3px;
        width: 5px;
        height: 10px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        opacity: ${({ $checked }) => ($checked ? 1 : 0)};
        transition: opacity 0.15s ease;
    }
`;

export const AgreementError = styled.div`
    font-size: 12px;
    color: #d32f2f;
    margin-top: 6px;
    padding-left: 2px;
`;

/* ------- Sticky summary ------- */

export const SummaryBar = styled.div<{ $accent: AccentKey; $visible: boolean }>`
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 30;
    background: #1a1814;
    color: #f5f1ea;
    border-radius: 16px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 20px 50px rgba(26, 24, 20, 0.28);
    transform: ${({ $visible }) => ($visible ? "translateY(0)" : "translateY(140%)")};
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition:
        transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
        opacity 0.25s ease;

    @media (min-width: 900px) {
        left: 50%;
        transform: ${({ $visible }) =>
            $visible ? "translate(-50%, 0)" : "translate(-50%, 150%)"};
        right: auto;
        max-width: 980px;
        width: calc(100% - 64px);
        bottom: 20px;
        padding: 14px 18px;
        border-radius: 18px;
    }
`;

export const SummaryChips = styled.div`
    flex: 1;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    min-width: 0;
`;

export const SummaryChip = styled.span<{ $accent: AccentKey }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(245, 241, 234, 0.06);
    border: 1px solid rgba(245, 241, 234, 0.1);
    border-radius: 999px;
    font-size: 12.5px;
    color: #f5f1ea;
    max-width: 100%;

    i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
        flex-shrink: 0;
    }

    span {
        color: rgba(245, 241, 234, 0.52);
        font-size: 10.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 500;
    }

    b {
        color: #fff;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

export const SummaryProgressChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(214, 255, 61, 0.1);
    border: 1px solid rgba(214, 255, 61, 0.18);
    border-radius: 999px;
    font-size: 12.5px;
    color: #d6ff3d;
    font-weight: 500;

    span {
        color: rgba(214, 255, 61, 0.7);
        font-size: 10.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }
`;

export const SummarySend = styled.button<{ $accent: AccentKey }>`
    appearance: none;
    border: none;
    background: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    color: #fff;
    font-weight: 600;
    font-size: 13.5px;
    padding: 12px 18px;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-family: inherit;
    transition:
        transform 0.25s ease,
        opacity 0.25s ease,
        box-shadow 0.25s ease;

    &:hover:not(:disabled) {
        transform: translateX(3px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    &:disabled {
        opacity: 0.55;
        cursor: default;
    }

    svg {
        width: 14px;
        height: 14px;
        transition: transform 0.25s ease;
    }

    &:hover:not(:disabled) svg {
        transform: translateX(3px);
    }

    @media (max-width: 479px) {
        padding: 12px 14px;
        font-size: 13px;
    }
`;

/* ------- Status card ------- */

export const StatusShell = styled.div`
    padding: 32px 20px 120px;
    background: #f6f2ea;
    min-height: 100%;

    @media (min-width: 900px) {
        padding: 56px 48px 120px;
    }
`;

export const StatusCard = styled.div<{ $accent: AccentKey }>`
    --c: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    --c-soft: ${({ $accent }) => GROUP_ACCENTS[$accent].soft};
    max-width: 620px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid rgba(26, 24, 20, 0.08);
    border-radius: 20px;
    padding: 32px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;

    &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--c);
    }

    @media (min-width: 700px) {
        padding: 44px 36px;
    }
`;

export const StatusIconWrap = styled.div<{ $accent: AccentKey }>`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: ${({ $accent }) => GROUP_ACCENTS[$accent].soft};
    color: ${({ $accent }) => GROUP_ACCENTS[$accent].solid};
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
`;

export const StatusTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #1a1814;

    @media (min-width: 700px) {
        font-size: 26px;
    }
`;

export const StatusText = styled.p`
    margin: 0 auto;
    max-width: 46ch;
    color: rgba(26, 24, 20, 0.65);
    font-size: 14.5px;
    line-height: 1.55;
`;

export const StatusMeta = styled.div`
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px dashed rgba(26, 24, 20, 0.12);
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;

    @media (min-width: 500px) {
        max-width: 360px;
        margin-left: auto;
        margin-right: auto;
    }
`;

export const StatusMetaRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 13.5px;

    span {
        color: rgba(26, 24, 20, 0.55);
    }

    b {
        color: #1a1814;
        font-weight: 600;
        text-align: right;
    }
`;

export const StatusAlert = styled.div<{ $kind: "warning" | "error" }>`
    margin-top: 20px;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 13.5px;
    line-height: 1.45;
    text-align: left;
    background: ${({ $kind }) =>
        $kind === "warning" ? "rgba(234, 151, 30, 0.08)" : "rgba(211, 47, 47, 0.06)"};
    border: 1px solid
        ${({ $kind }) =>
            $kind === "warning" ? "rgba(234, 151, 30, 0.28)" : "rgba(211, 47, 47, 0.24)"};
    color: ${({ $kind }) => ($kind === "warning" ? "#a05e13" : "#a02020")};
`;

export const StatusActions = styled.div`
    margin-top: 24px;
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
`;

/* ------- Shared small helpers ------- */

export const VisuallyHidden = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;
