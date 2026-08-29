import { createTheme } from '@mui/material/styles';

/**
 * ሰላም — Verdant manuscript design token set.
 *
 * The aesthetic pairs a warm parchment canvas with a deep evergreen ink, and
 * reserves a gold "rubrication" accent (like a monastic scribe's illuminated
 * capitals) for the active conversation, reasoning disclosures, and the
 * ሰላም mark. Type is set in Inter (UI), Noto Serif Ethiopic (display/brand),
 * and IBM Plex Mono (utility), exactly like the Phase 4 findings.
 *
 * @module theme/index
 */

/**
 * Light-mode palette tokens.
 *
 * @type {Readonly<Record<'canvas'|'surface'|'ink'|'evergreen'|'gold'|'oxblood'|'veil', string>>}
 */
export const LIGHT_TOKENS = Object.freeze({
  canvas: '#EFEEE6',
  surface: '#FBFAF4',
  ink: '#233228',
  evergreen: '#2F6B4E',
  gold: '#C1912F',
  oxblood: '#9E3B32',
  veil: '#6B6F5E',
});

/**
 * Dark-mode palette tokens.
 *
 * @type {Readonly<Record<'canvas'|'surface'|'ink'|'evergreen'|'gold'|'oxblood'|'veil', string>>}
 */
export const DARK_TOKENS = Object.freeze({
  canvas: '#0F1511',
  surface: '#161E18',
  ink: '#E5E7DC',
  evergreen: '#7CB894',
  gold: '#D9AE4A',
  oxblood: '#D06A5E',
  veil: '#9DA393',
});

/**
 * Builds the palette object for one color scheme from the token set.
 *
 * @param {Readonly<Record<'canvas'|'surface'|'ink'|'evergreen'|'gold'|'oxblood'|'veil', string>>} tokens - The mode tokens.
 * @returns {object} A MUI palette partial.
 */
const buildPalette = (tokens) => ({
  primary: { main: tokens.evergreen, contrastText: '#FFFFFF' },
  secondary: { main: tokens.gold, contrastText: tokens.canvas },
  error: { main: tokens.oxblood, contrastText: '#FFFFFF' },
  warning: { main: tokens.gold, contrastText: tokens.canvas },
  success: { main: tokens.evergreen, contrastText: '#FFFFFF' },
  info: { main: tokens.evergreen, contrastText: '#FFFFFF' },
  text: { primary: tokens.ink, secondary: tokens.veil, disabled: `${tokens.ink}66` },
  divider: `${tokens.ink}1F`,
  background: { default: tokens.canvas, paper: tokens.surface },
  action: {
    active: tokens.ink,
    hover: `${tokens.evergreen}14`,
    selected: `${tokens.evergreen}22`,
    focus: `${tokens.evergreen}2E`,
    disabled: `${tokens.ink}40`,
    disabledBackground: `${tokens.ink}14`,
  },
});

/**
 * The shared typography stack (font families are imported in `main.jsx`).
 *
 * @type {Readonly<Record<'display'|'body'|'mono', string>>}
 */
export const FONT_STACKS = Object.freeze({
  display: '"Noto Serif Ethiopic", "Times New Roman", serif',
  body: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  mono: '"IBM Plex Mono", "Cascadia Code", Consolas, monospace',
});

const base = {
  typography: {
    fontFamily: FONT_STACKS.body,
    h1: { fontFamily: FONT_STACKS.display, fontWeight: 700 },
    h2: { fontFamily: FONT_STACKS.display, fontWeight: 700 },
    h3: { fontFamily: FONT_STACKS.display, fontWeight: 700 },
    h4: { fontFamily: FONT_STACKS.display, fontWeight: 700 },
    h5: { fontFamily: FONT_STACKS.body, fontWeight: 600 },
    h6: { fontFamily: FONT_STACKS.body, fontWeight: 600 },
    subtitle1: { fontFamily: FONT_STACKS.body, fontWeight: 500 },
    subtitle2: { fontFamily: FONT_STACKS.body, fontWeight: 600 },
    body1: { fontFamily: FONT_STACKS.body },
    body2: { fontFamily: FONT_STACKS.body },
    button: { fontFamily: FONT_STACKS.body, textTransform: 'none', fontWeight: 600 },
    caption: { fontFamily: FONT_STACKS.body },
    overline: { fontFamily: FONT_STACKS.mono, fontWeight: 600, letterSpacing: '0.08em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: () => ({
        html: { height: '100%', overflow: 'hidden' },
        body: { height: '100%', margin: 0, overflow: 'hidden' },
        '#root': { height: '100%', overflow: 'hidden' },
      }),
    },
    MuiPaper: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          fontSize: 12,
          borderRadius: 8,
          backgroundColor: theme.palette.text.primary,
          color: theme.palette.background.default,
        }),
      },
    },
  },
};

/**
 * The ሰላም theme with full (light/dark) color schemes. The mode still follows
 * the OS/system preference at runtime (`ThemeProvider` + `InitColorSchemeScript`
 * default to `'system'`); `'light'` is only the pre-script fallback, since MUI
 * v9 no longer accepts `'system'` as a `defaultColorScheme` scheme key.
 *
 * @type {import('@mui/material').Theme}
 */
export const theme = createTheme({
  ...base,
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: buildPalette(LIGHT_TOKENS) },
    dark: { palette: buildPalette(DARK_TOKENS) },
  },
  defaultColorScheme: 'light',
});