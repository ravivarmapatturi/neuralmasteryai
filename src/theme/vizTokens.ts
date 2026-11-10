// Ported from platform/src/theme/vizTokens.js -- same palette, same shape.
// Interactive components should always read colors from useVizTokens(),
// never a hardcoded hex value, so they track the live theme toggle and
// stay pixel-consistent with the static diagram assets on the same page.

import { useColorMode } from './ThemeProvider';
import type { ThemeId } from './themes';

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

export const DARK: VizTokens = {
  mode: 'dark',
  background: '#16181F',
  surface: '#1D202A',
  surfaceAlt: '#232734',
  border: '#5B657E',
  textPrimary: '#E8EEFC',
  textSecondary: '#BCCADF',
  textMuted: '#9FB0C8',
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
  border: '#948663',
  textPrimary: '#17305F',
  textSecondary: '#3D5570',
  textMuted: '#4E5F72',
  accentPrimary: '#1A6E36',
  accentSecondary: '#1D4FC4',
  accentWarn: '#865505',
  accentDanger: '#AD3427',
  accentPurple: '#6D3FB8',
  accentTeal: '#0D6B63',
  nodeFill: '#ECE0C5',
  nodeBorder: '#1A6E36',
  edge: '#1D4FC4',
};

export const PURE_WHITE: VizTokens = {
  mode: 'light',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceAlt: '#F1F3F5',
  border: '#71717A',
  textPrimary: '#18181B',
  textSecondary: '#334155',
  textMuted: '#475569',
  accentPrimary: '#15803D',
  accentSecondary: '#0F766E',
  accentWarn: '#9A3412',
  accentDanger: '#B91C1C',
  accentPurple: '#831843',
  accentTeal: '#0F766E',
  nodeFill: '#F1F3F5',
  nodeBorder: '#15803D',
  edge: '#0F766E',
};

export const SEPIA: VizTokens = {
  mode: 'light',
  background: '#F5ECD8',
  surface: '#EBDCC0',
  surfaceAlt: '#E2CFAE',
  border: '#8C7653',
  textPrimary: '#2C1F14',
  textSecondary: '#4D3B2C',
  textMuted: '#63503F',
  accentPrimary: '#1E6834',
  accentSecondary: '#1C448E',
  accentWarn: '#8A4908',
  accentDanger: '#A82B20',
  accentPurple: '#682C7D',
  accentTeal: '#155A52',
  nodeFill: '#E2CFAE',
  nodeBorder: '#1E6834',
  edge: '#1C448E',
};

export const FOREST: VizTokens = {
  mode: 'dark',
  background: '#0D1713',
  surface: '#14231D',
  surfaceAlt: '#1B3027',
  border: '#437863',
  textPrimary: '#E6F4ED',
  textSecondary: '#B2D3C2',
  textMuted: '#84A996',
  accentPrimary: '#4ADE80',
  accentSecondary: '#38BDF8',
  accentWarn: '#FBBF24',
  accentDanger: '#F87171',
  accentPurple: '#C084FC',
  accentTeal: '#2DD4BF',
  nodeFill: '#1B3027',
  nodeBorder: '#4ADE80',
  edge: '#38BDF8',
};

export const VIZ_THEMES: Record<ThemeId, VizTokens> = {
  light: LIGHT,
  dark: DARK,
  'pure-white': PURE_WHITE,
  sepia: SEPIA,
  forest: FOREST,
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
  const { theme } = useColorMode();
  return VIZ_THEMES[theme] || LIGHT;
}
