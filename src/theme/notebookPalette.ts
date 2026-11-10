// Same palette as src/styles/notebook.css's --nb-* custom properties,
// duplicated here as plain hex so SVG-based notebook components (rough.js
// illustrations) work correctly wherever they're mounted -- including
// inside a shared layout like DocLayout that doesn't wrap its content in
// `.nb-theme`, where CSS custom properties wouldn't resolve.

import { useColorMode } from './ThemeProvider';
import type { ThemeId } from './themes';

export interface NotebookPalette {
  paper: string;
  paperAlt: string;
  rule: string;
  ink: string;
  inkSoft: string;
  cobalt: string;
  teal: string;
  mint: string;
  amber: string;
  coral: string;
  lavender: string;
  green: string;
}

export const NOTEBOOK_LIGHT: NotebookPalette = {
  paper: '#faf4e6',
  paperAlt: '#f3ead4',
  rule: '#948663',
  ink: '#17305f',
  inkSoft: '#3d5570',
  cobalt: '#1d4fc4',
  teal: '#0f766e',
  mint: '#1a6e36',
  amber: '#865505',
  coral: '#ad3427',
  lavender: '#6d3fb8',
  green: '#1a6e36',
};

export const NOTEBOOK_DARK: NotebookPalette = {
  paper: '#16181f',
  paperAlt: '#1d202a',
  rule: '#5b657e',
  ink: '#e8eefc',
  inkSoft: '#bccadf',
  cobalt: '#7ea2ff',
  teal: '#5fd6c7',
  mint: '#7fd99a',
  amber: '#ffc857',
  coral: '#ff8f7e',
  lavender: '#bb9bf7',
  green: '#7fd99a',
};

export const NOTEBOOK_PURE_WHITE: NotebookPalette = {
  paper: '#ffffff',
  paperAlt: '#f8f9fa',
  rule: '#71717a',
  ink: '#18181b',
  inkSoft: '#334155',
  cobalt: '#312e81',
  teal: '#0f766e',
  mint: '#15803d',
  amber: '#9a3412',
  coral: '#b91c1c',
  lavender: '#831843',
  green: '#15803d',
};

export const NOTEBOOK_SEPIA: NotebookPalette = {
  paper: '#f5ecd8',
  paperAlt: '#ebdcc0',
  rule: '#8c7653',
  ink: '#2c1f14',
  inkSoft: '#4d3b2c',
  cobalt: '#1c448e',
  teal: '#155a52',
  mint: '#1e6834',
  amber: '#8a4908',
  coral: '#a82b20',
  lavender: '#682c7d',
  green: '#1e6834',
};

export const NOTEBOOK_FOREST: NotebookPalette = {
  paper: '#0d1713',
  paperAlt: '#14231d',
  rule: '#437863',
  ink: '#e6f4ed',
  inkSoft: '#b2d3c2',
  cobalt: '#38bdf8',
  teal: '#2dd4bf',
  mint: '#4ade80',
  amber: '#fbbf24',
  coral: '#f87171',
  lavender: '#c084fc',
  green: '#4ade80',
};

export const NOTEBOOK_PALETTES: Record<ThemeId, NotebookPalette> = {
  light: NOTEBOOK_LIGHT,
  dark: NOTEBOOK_DARK,
  'pure-white': NOTEBOOK_PURE_WHITE,
  sepia: NOTEBOOK_SEPIA,
  forest: NOTEBOOK_FOREST,
};

export function useNotebookPalette(): NotebookPalette {
  const { theme } = useColorMode();
  return NOTEBOOK_PALETTES[theme] || NOTEBOOK_LIGHT;
}
