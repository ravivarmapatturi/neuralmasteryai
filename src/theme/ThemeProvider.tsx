import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEMES, isDarkTheme, type ThemeId } from './themes';

export type { ThemeId };
export type ColorMode = ThemeId;

const STORAGE_KEY = 'neural-mastery-theme';

interface ThemeContextValue {
  theme: ThemeId;
  colorMode: ThemeId;
  setTheme: (theme: ThemeId) => void;
  setColorMode: (mode: ThemeId) => void;
  toggleColorMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The white notebook is the default; a theme the reader picks is kept.
const DEFAULT_THEME: ThemeId = 'pure-white';

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeId;
  } catch {
    // Storage can be blocked; the default still applies.
  }
  return DEFAULT_THEME;
}

/**
 * Manages the platform's theme across 5 background choices:
 * 'light', 'dark', 'pure-white', 'sepia', 'forest'.
 * Sets `data-theme` on <html> and remembers the choice in localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-page-theme', theme);
    document.documentElement.setAttribute('data-color-scheme', isDarkTheme(theme) ? 'dark' : 'light');
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  const setColorMode = setTheme;

  const toggleColorMode = useCallback(() => {
    setTheme(isDarkTheme(theme) ? DEFAULT_THEME : 'dark');
  }, [theme, setTheme]);

  const isDark = isDarkTheme(theme);

  const value = useMemo(
    () => ({
      theme,
      colorMode: theme,
      setTheme,
      setColorMode,
      toggleColorMode,
      isDark,
    }),
    [theme, setTheme, toggleColorMode, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColorMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useColorMode must be used within a ThemeProvider');
  return ctx;
}
