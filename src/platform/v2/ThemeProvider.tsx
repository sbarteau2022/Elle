import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { DARK, LIGHT, FONTS, type Theme } from './tokens';

export const ThemeCtx = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children, initialAccent }: { children: React.ReactNode; initialAccent?: string }) {
  const [mode, setMode] = useState('dark');
  const [acc, setAcc] = useState(initialAccent ?? '#ff6a42');
  const [den, setDen] = useState('medium');

  useEffect(() => {
    document.body.style.background = mode === 'dark' ? DARK.bg : LIGHT.bg;
  }, [mode]);

  const base = mode === 'dark' ? DARK : LIGHT;
  const t = useMemo<Theme>(() => ({
    ...base,
    accent: acc,
    accentSoft: acc + '1f',
    accentTint: acc + '33',
    aiGrad: `linear-gradient(135deg,${acc} 0%,${acc}cc 50%,${acc}88 100%)`,
    fonts: FONTS,
    density: den,
    mode,
    setMode,
    setAccent: setAcc,
    setDensity: setDen,
  }), [base, acc, den, mode]);

  return <ThemeCtx.Provider value={t}>{children}</ThemeCtx.Provider>;
}
