import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, DarkColors, LightColors, setGlobalThemeColors } from '../constants/theme';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  colors: typeof DarkColors;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
  colors: DarkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('roadwatch_theme') as Theme;
      if (saved && ['dark', 'light', 'system'].includes(saved)) {
        return saved;
      }
    }
    return 'dark';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;
  const colors = resolvedTheme === 'light' ? LightColors : DarkColors;

  useEffect(() => {
    // Update React Native Colors object
    setGlobalThemeColors(colors);

    // Update Web document root if applicable
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (resolvedTheme === 'light') {
        root.classList.add('light');
        document.body.classList.add('light');
        root.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('light');
        document.body.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('roadwatch_theme', theme);
    }
  }, [theme, resolvedTheme, colors]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
