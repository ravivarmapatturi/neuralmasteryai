export type ThemeId = 'light' | 'dark' | 'pure-white' | 'sepia' | 'forest';

export interface ThemeTokens {
  // CSS custom properties (site tokens)
  nmBg: string;
  nmSurface: string;
  nmSurfaceAlt: string;
  nmBorder: string;
  nmTextPrimary: string;
  nmTextSecondary: string;
  nmTextMuted: string;
  nmHeading1: string;
  nmHeading2: string;
  nmHeading3: string;
  nmAccentPrimary: string;
  nmAccentSecondary: string;
  nmAccentWarn: string;
  nmAccentDanger: string;
  nmAccentPurple: string;
  nmAccentTeal: string;

  // Short-form tokens (used by interview room, graph, simpleInterview, diagrams)
  bg: string;
  fg: string;
  soft: string;
  line: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentFill: string;
  accentText: string;
  accentHover: string;
  onAccent: string;
  good: string;
  goodFill: string;
  warn: string;
  warnFill: string;
  bad: string;
  badFill: string;
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  shortLabel: string;
  isDark: boolean;
  swatch: string;
  border?: string;
  tokens: ThemeTokens;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  light: {
    id: 'light',
    name: 'Light',
    shortLabel: 'Light',
    isDark: false,
    swatch: '#faf4e6',
    border: '#948663',
    tokens: {
      nmBg: '#faf4e6',
      nmSurface: '#f3ead4',
      nmSurfaceAlt: '#ece0c5',
      nmBorder: '#948663',
      nmTextPrimary: '#17305f',
      nmTextSecondary: '#3d5570',
      nmTextMuted: '#4e5f72',
      nmHeading1: '#17305f',
      nmHeading2: '#0f5f55',
      nmHeading3: '#5b2f9a',
      nmAccentPrimary: '#1a6e36',
      nmAccentSecondary: '#1d4fc4',
      nmAccentWarn: '#865505',
      nmAccentDanger: '#ad3427',
      nmAccentPurple: '#6d3fb8',
      nmAccentTeal: '#0d6b63',

      bg: '#faf4e6',
      fg: '#17305f',
      soft: '#3d5570',
      line: '#948663',
      surface: '#f3ead4',
      surfaceAlt: '#ece0c5',
      accent: '#1d4fc4',
      accentFill: '#e3ebfd',
      accentText: '#1d4fc4',
      accentHover: '#153ea3',
      onAccent: '#ffffff',
      good: '#1a6e36',
      goodFill: '#e2f3e6',
      warn: '#865505',
      warnFill: '#fbecce',
      bad: '#ad3427',
      badFill: '#fbe4e0',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    shortLabel: 'Dark',
    isDark: true,
    swatch: '#16181f',
    border: '#5b657e',
    tokens: {
      nmBg: '#16181f',
      nmSurface: '#1d202a',
      nmSurfaceAlt: '#232734',
      nmBorder: '#5b657e',
      nmTextPrimary: '#e8eefc',
      nmTextSecondary: '#bccadf',
      nmTextMuted: '#9fb0c8',
      nmHeading1: '#b7ccff',
      nmHeading2: '#7fdcc4',
      nmHeading3: '#d4b8ff',
      nmAccentPrimary: '#7fd99a',
      nmAccentSecondary: '#7ea2ff',
      nmAccentWarn: '#ffc857',
      nmAccentDanger: '#ff8f7e',
      nmAccentPurple: '#bb9bf7',
      nmAccentTeal: '#5fd6c7',

      bg: '#16181f',
      fg: '#e8eefc',
      soft: '#bccadf',
      line: '#5b657e',
      surface: '#1d202a',
      surfaceAlt: '#232734',
      accent: '#7ea2ff',
      accentFill: '#1e293b',
      accentText: '#7ea2ff',
      accentHover: '#9bb8ff',
      onAccent: '#ffffff',
      good: '#7fd99a',
      goodFill: '#16301f',
      warn: '#ffc857',
      warnFill: '#3a2c10',
      bad: '#ff8f7e',
      badFill: '#3a1d17',
    },
  },
  'pure-white': {
    id: 'pure-white',
    name: 'Pure White Notebook',
    shortLabel: 'Notebook',
    isDark: false,
    swatch: '#ffffff',
    border: '#c7d2fe',
    tokens: {
      nmBg: '#ffffff',
      nmSurface: '#ffffff',
      nmSurfaceAlt: '#ffffff',
      nmBorder: '#a5b4fc',
      nmTextPrimary: '#1b1f3b',
      nmTextSecondary: '#334155',
      nmTextMuted: '#475569',
      nmHeading1: '#3730a3',
      nmHeading2: '#0e7490',
      nmHeading3: '#a21caf',
      nmAccentPrimary: '#4338ca',
      nmAccentSecondary: '#1d4ed8',
      nmAccentWarn: '#c2410c',
      nmAccentDanger: '#be123c',
      nmAccentPurple: '#a21caf',
      nmAccentTeal: '#0f766e',

      bg: '#ffffff',
      fg: '#1b1f3b',
      soft: '#475569',
      line: '#a5b4fc',
      surface: '#ffffff',
      surfaceAlt: '#ffffff',
      accent: '#4338ca',
      accentFill: '#eef2ff',
      accentText: '#4338ca',
      accentHover: '#3730a3',
      onAccent: '#ffffff',
      good: '#15803d',
      goodFill: '#e8f7ee',
      warn: '#c2410c',
      warnFill: '#fff2eb',
      bad: '#be123c',
      badFill: '#ffe4e6',
    },
  },
  sepia: {
    id: 'sepia',
    name: 'Warm Sepia',
    shortLabel: 'Sepia',
    isDark: false,
    swatch: '#f5ecd8',
    border: '#8c7653',
    tokens: {
      nmBg: '#f5ecd8',
      nmSurface: '#ebdcc0',
      nmSurfaceAlt: '#e2cfae',
      nmBorder: '#8c7653',
      nmTextPrimary: '#2c1f14',
      nmTextSecondary: '#4d3b2c',
      nmTextMuted: '#63503f',
      nmHeading1: '#3d1a0d',
      nmHeading2: '#1b4d3e',
      nmHeading3: '#59273c',
      nmAccentPrimary: '#1e6834',
      nmAccentSecondary: '#1c448e',
      nmAccentWarn: '#8a4908',
      nmAccentDanger: '#a82b20',
      nmAccentPurple: '#682c7d',
      nmAccentTeal: '#155a52',

      bg: '#f5ecd8',
      fg: '#2c1f14',
      soft: '#4d3b2c',
      line: '#8c7653',
      surface: '#ebdcc0',
      surfaceAlt: '#e2cfae',
      accent: '#1c448e',
      accentFill: '#dfd2bc',
      accentText: '#1c448e',
      accentHover: '#14336c',
      onAccent: '#ffffff',
      good: '#1e6834',
      goodFill: '#dbe7dc',
      warn: '#8a4908',
      warnFill: '#eddabf',
      bad: '#a82b20',
      badFill: '#edd4d2',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest Dark',
    shortLabel: 'Forest',
    isDark: true,
    swatch: '#0d1713',
    border: '#437863',
    tokens: {
      nmBg: '#0d1713',
      nmSurface: '#14231d',
      nmSurfaceAlt: '#1b3027',
      nmBorder: '#437863',
      nmTextPrimary: '#e6f4ed',
      nmTextSecondary: '#b2d3c2',
      nmTextMuted: '#84a996',
      nmHeading1: '#a7f3d0',
      nmHeading2: '#6ee7b7',
      nmHeading3: '#c4b5fd',
      nmAccentPrimary: '#4ade80',
      nmAccentSecondary: '#38bdf8',
      nmAccentWarn: '#fbbf24',
      nmAccentDanger: '#f87171',
      nmAccentPurple: '#c084fc',
      nmAccentTeal: '#2dd4bf',

      bg: '#0d1713',
      fg: '#e6f4ed',
      soft: '#b2d3c2',
      line: '#437863',
      surface: '#14231d',
      surfaceAlt: '#1b3027',
      accent: '#38bdf8',
      accentFill: '#153229',
      accentText: '#38bdf8',
      accentHover: '#7dd3fc',
      onAccent: '#0d1713',
      good: '#4ade80',
      goodFill: '#113322',
      warn: '#fbbf24',
      warnFill: '#35290e',
      bad: '#f87171',
      badFill: '#381616',
    },
  },
};

export const THEME_LIST = Object.values(THEMES);

export function isDarkTheme(themeId: string | null | undefined): boolean {
  if (!themeId) return false;
  return themeId === 'dark' || themeId === 'forest';
}

export function getThemeMeta(themeId: string | null | undefined): ThemeMeta {
  if (themeId && themeId in THEMES) {
    return THEMES[themeId as ThemeId];
  }
  return THEMES['pure-white'];
}

/**
 * Standard WCAG 2.1 relative luminance and contrast ratio calculation.
 */
export function getRelativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '').trim();
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
