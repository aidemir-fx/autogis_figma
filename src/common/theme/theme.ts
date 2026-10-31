import { breakpoints } from "./breakpoints";

export const theme = {
    palette: {
        blue: {
            primary: "#3b82f6",
            secondary: "#e1edfd",
            text: "#1d4ed8",
            light: "#eff6ff",
        },
        green: {
            primary: "#64B441",
            secondary: "#26412B0A",
            [800]: "#26412B0A",
        },
        white: "#FFFFFF",
        gray: {
            primary: "#000000B2",
        },
        text: {
            primary: "#262626",
            secondary: "#808080",
            compliment: "#4D4D4D",
            hint: "#B2B2B2",
            genericAccent: "#D9D9D9",
            white: "#FFFFFF",
        },
        background: {
            [1]: "#FFFFFF",
            [2]: "#FAFAFA",
            [3]: "#F7F7F7",
            chipsAndPagiantion: "#000000B2",
        },
        actions: {
            brand: "#64B441",
            brandHeavy: "#4E992D",
            negative: "#BD0935",
            inactive: "#D0E9C6",
            accent: "#49CB34",
        },
        info: {
            light: "#E1EFFD",
            heavy: "#3072B3",
        },
        success: {
            light: "#E8F4E3",
            heavy: "#2A8800",
        },
        warning: {
            light: "#FFBE5C4D",
            heavy: "#BD5C0A",
        },
        error: {
            light: "#FFD9E2",
            heavy: "#BD0935",
        },
        base: {
            generic: "#0000000D",
        },
        // TODO: Удалить, и поправить места использования. Не должно быть привязки к конкретным компонентам
        bage: {
            primary: {
                text: "#3697F1",
                background: "#3697F126",
            },
            gray: {
                text: "#4D4D4D",
                background: "#F2F2F2",
            },
            complementary: {
                text: "#000000",
                background: "#0000000D",
            },
            info: {
                text: "#3072B3",
                background: "#E1EFFD",
            },
            warning: {
                text: "#BD5C0A",
                background: "#FFEBCE",
            },
            success: {
                text: "#2A8800",
                background: "#E8F4E3",
            },
            pink: {
                text: "#BD0935",
                background: "#FFD9E2",
            },
        },
    },
    shape: {
        large: "10px",
        medium: "8px",
        small: "6px",
        round: "50%",
    },
    // TODO: Для теней использовать абстрактные значения: large, medium, small или цифровые индексы
    shadows: {
        separator: "0 1px 3px 0 rgb(0 0 0 / 0.1);",
        hover: "0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a",
    },
    breakpoints,
    fontFamily: `var(--default-font-family),
        ui-sans-serif,
        system-ui,
        sans-serif,
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji"`,
};

export type Theme = typeof theme;
