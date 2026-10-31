import { createTheme } from '@mui/material/styles';

const fontFamily = `var(--default-font-family),
  ui-sans-serif,
  system-ui,
  sans-serif,
  "Apple Color Emoji",
  "Segoe UI Emoji",
  "Segoe UI Symbol",
  "Noto Color Emoji"`;

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#3b82f6',
      dark: '#2563eb',
      light: '#eff6ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64B441',
      dark: '#4E992D',
      light: '#E8F4E3',
      contrastText: '#ffffff',
    },
    error: {
      main: '#BD0935',
      light: '#FFD9E2',
    },
    warning: {
      main: '#BD5C0A',
      light: '#FFEBCE',
    },
    success: {
      main: '#2A8800',
      light: '#E8F4E3',
    },
    info: {
      main: '#3072B3',
      light: '#E1EFFD',
    },
    text: {
      primary: '#262626',
      secondary: '#808080',
      disabled: '#B2B2B2',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    divider: '#D9D9D9',
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
    borderRadius: 8,
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
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});
