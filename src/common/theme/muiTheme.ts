import { createTheme } from '@mui/material/styles';
import { designTokens } from './designTokens';

const { colors, radius } = designTokens;
const fontFamily = `var(--default-font-family, ${designTokens.fontFamily})`;

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: colors.blue500,
      dark: colors.blue500,
      light: colors.gray100,
      contrastText: colors.white,
    },
    secondary: {
      main: colors.green500,
      dark: colors.green500,
      light: colors.gray100,
      contrastText: colors.white,
    },
    error: {
      main: colors.red500,
      light: colors.gray100,
    },
    warning: {
      main: colors.gray500,
      light: colors.gray100,
    },
    success: {
      main: colors.green500,
      light: colors.gray100,
    },
    info: {
      main: colors.blue500,
      light: colors.gray100,
    },
    text: {
      primary: colors.gray900,
      secondary: colors.gray500,
      disabled: colors.gray500,
    },
    background: {
      default: colors.gray100,
      paper: colors.white,
    },
    divider: colors.gray300,
  },
  typography: {
    fontFamily,
    h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
    h4: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.75rem', lineHeight: 1.5 },
    caption: { fontSize: '0.6875rem', lineHeight: 1.4 },
    button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },
  },
  shape: {
    borderRadius: Number.parseInt(radius.r8, 10),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: radius.r8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: radius.r12,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.r8,
          '&:hover': {
            backgroundColor: colors.gray100,
          },
        },
      },
    },
  },
});
