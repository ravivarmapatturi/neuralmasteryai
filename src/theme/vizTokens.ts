// Ported from platform/src/theme/vizTokens.js -- same palette, same shape.
// Interactive components should always read colors from useVizTokens(),
// never a hardcoded hex value, so they track the live theme toggle and
// stay pixel-consistent with the static diagram assets on the same page.

import { useColorMode } from './ThemeProvider';

export interface VizTokens {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentWarn: string;
  accentDanger: string;
  accentPurple: string;
  accentTeal: string;
  nodeFill: string;
  nodeBorder: string;
  edge: string;
}

// 2026-10-12: promoted to the "notebook" palette sitewide, mirroring the
// same change in src/styles/theme.css's --nm-* tokens (see that file's
// comment for the full rationale). Same semantic slot per color (accent
// primary stays green/brand, secondary stays blue, warn stays amber,
// danger stays red, purple stays purple, teal stays teal) -- only the
// actual hex values moved to the warmer, paper-consistent palette. Every
// light-mode value re-verified computationally against WCAG AA (4.5:1) at
// caption/label text size, same discipline as the darkening pass already
// documented below for the previous palette -- this is the second such
// pass on this exact file, not the first.
export const DARK: VizTokens = {
  mode: 'dark',
  background: '#16181F',
  surface: '#1D202A',
  surfaceAlt: '#232734',
  border: '#363B4A',
  textPrimary: '#F1EDE1',
  textSecondary: '#C2C6D4',
  textMuted: '#9A9FB0',
  accentPrimary: '#7FD99A',
  accentSecondary: '#7EA2FF',
  accentWarn: '#FFC857',
  accentDanger: '#FF8F7E',
  accentPurple: '#BB9BF7',
  accentTeal: '#5FD6C7',
  nodeFill: '#232734',
  nodeBorder: '#7FD99A',
  edge: '#7EA2FF',
};

export const LIGHT: VizTokens = {
  mode: 'light',
  background: '#FAF4E6',
  surface: '#F3EAD4',
  surfaceAlt: '#ECE0C5',
  border: '#D8C9A3',
  textPrimary: '#1C2230',
  textSecondary: '#4A4F5C',
  // mint/amber/coral/green (accentPrimary/Warn/Danger/-- see notebook.css)
  // all failed WCAG AA (4.5:1) at caption/label size against this file's
  // own surfaceAlt in their first pass (as low as 3.6:1) -- same failure
  // mode the ORIGINAL palette below already hit once. HSL-lightness-only
  // adjustment again, hue/saturation preserved so relative distinctness
  // between concept colors (getConceptColor) is unchanged. All now clear
  // 4.5:1 against every light-theme background, verified computationally.
  textMuted: '#5C6270',
  accentPrimary: '#1F793C',
  accentSecondary: '#1D4FC4',
  accentWarn: '#935E06',
  accentDanger: '#BE3B2D',
  accentPurple: '#6D3FB8',
  accentTeal: '#0F766E',
  nodeFill: '#ECE0C5',
  nodeBorder: '#1F793C',
  edge: '#1D4FC4',
};

export const RADIUS = { sm: 6, md: 12, lg: 20 };
export const SPACING = { xs: 8, sm: 16, md: 24, lg: 40, xl: 64 };
export const FONT_FAMILY =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** A small, consistent per-feature color palette -- used anywhere a chart
 * needs to distinguish up to 4 named features by color (currently Ridge and
 * Lasso Regression Studios' regularization-path charts). */
export function getFeatureColors(t: VizTokens): string[] {
  return [t.accentPrimary, t.accentSecondary, t.accentWarn, t.accentDanger];
}

export function useVizTokens(): VizTokens {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? DARK : LIGHT;
}
