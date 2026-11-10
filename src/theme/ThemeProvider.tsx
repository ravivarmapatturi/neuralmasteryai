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

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored in THEMES) return stored as ThemeId;
  // Fall back to dark / light preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
    // If dark or forest, toggle to light; if light, pure-white, or sepia, toggle to dark
    setTheme(isDarkTheme(theme) ? 'light' : 'dark');
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
