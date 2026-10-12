// Same palette as src/styles/notebook.css's --nb-* custom properties,
// duplicated here as plain hex so SVG-based notebook components (rough.js
// illustrations) work correctly wherever they're mounted -- including
// inside a shared layout like DocLayout that doesn't wrap its content in
// `.nb-theme`, where CSS custom properties wouldn't resolve. Keep both in
// sync by hand; there are only 7 colors x 2 modes.

import { useColorMode } from './ThemeProvider';

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
  rule: '#d8c9a3',
  ink: '#1c2230',
  inkSoft: '#4a4f5c',
  cobalt: '#1d4fc4',
  teal: '#0f766e',
  // mint/amber/coral/green darkened to clear 4.5:1 against both light
  // backgrounds -- see notebook.css's matching comment for the measured
  // before/after.
  mint: '#1b7856',
  amber: '#935e06',
  coral: '#be3b2d',
  lavender: '#6d3fb8',
  green: '#1f793c',
};

export const NOTEBOOK_DARK: NotebookPalette = {
  paper: '#16181f',
  paperAlt: '#1d202a',
  rule: '#363b4a',
  ink: '#f1ede1',
  inkSoft: '#c2c6d4',
  cobalt: '#7ea2ff',
  teal: '#5fd6c7',
  mint: '#6fd79c',
  amber: '#ffc857',
  coral: '#ff8f7e',
  lavender: '#bb9bf7',
  green: '#7fd99a',
};

export function useNotebookPalette(): NotebookPalette {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? NOTEBOOK_DARK : NOTEBOOK_LIGHT;
}
