import { breakpoints } from "./breakpoints";
import { designTokens } from "./designTokens";

const { colors, radius, shadows } = designTokens;

export const theme = {
    palette: {
        blue: {
            primary: colors.blue500,
            secondary: colors.gray300,
            text: colors.blue500,
            light: colors.gray100,
        },
        green: {
            primary: colors.green500,
            secondary: "rgba(90, 138, 54, 0.08)",
            [800]: "rgba(90, 138, 54, 0.08)",
        },
        white: colors.white,
        gray: {
            primary: colors.gray500,
        },
        text: {
            primary: colors.gray900,
            secondary: colors.gray500,
            compliment: colors.gray900,
            hint: colors.gray500,
            genericAccent: colors.gray300,
            white: colors.white,
        },
        background: {
            [1]: colors.white,
            [2]: colors.gray100,
            [3]: colors.gray300,
            chipsAndPagiantion: colors.gray500,
        },
        actions: {
            brand: colors.green500,
            brandHeavy: colors.green500,
            negative: colors.red500,
            inactive: colors.gray300,
            accent: colors.green500,
        },
        info: {
            light: colors.gray100,
            heavy: colors.blue500,
        },
        success: {
            light: colors.gray100,
            heavy: colors.green500,
        },
        warning: {
            light: colors.gray100,
            heavy: colors.gray500,
        },
        error: {
            light: colors.gray100,
            heavy: colors.red500,
        },
        base: {
            generic: "rgba(33, 44, 63, 0.08)",
        },
        // TODO: Удалить, и поправить места использования. Не должно быть привязки к конкретным компонентам
        bage: {
            primary: {
                text: colors.blue500,
                background: "rgba(70, 115, 213, 0.12)",
            },
            gray: {
                text: colors.gray900,
                background: colors.gray100,
            },
            complementary: {
                text: colors.gray900,
                background: "rgba(33, 44, 63, 0.08)",
            },
            info: {
                text: colors.blue500,
                background: colors.gray100,
            },
            warning: {
                text: colors.gray500,
                background: colors.gray100,
            },
            success: {
                text: colors.green500,
                background: colors.gray100,
            },
            pink: {
                text: colors.red500,
                background: colors.gray100,
            },
        },
    },
    shape: {
        large: radius.r12,
        medium: radius.r8,
        small: radius.r4,
        round: radius.round,
    },
    shadows: {
        separator: shadows.list,
        hover: shadows.filter,
    },
    breakpoints,
    fontFamily: `var(--default-font-family, ${designTokens.fontFamily})`,
};

export type Theme = typeof theme;
