import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ThemeMode } from '../storage';
import { getThemeMode, setThemeMode as persistThemeMode } from '../storage';

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('warm');

  useEffect(() => {
    (async () => {
      const stored = await getThemeMode();
      setThemeMode(stored);
    })();
  }, []);

  const updateThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    await persistThemeMode(mode);
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode: updateThemeMode,
    }),
    [themeMode, updateThemeMode]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return ctx;
}

const WARM_COLORS = {
  bg: '#E9E4DA',
  card: '#E9E4DA',
  text: '#111827',
  subText: '#6B7280',
  shadowDark: '#C8C3B9',
  shadowLight: '#FFFFFF',
  chipBg: '#D5D0C6',
  inputBg: '#E9E4DA',
  dangerBg: '#FEF2F2',
};

const NAVY_COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  subText: '#94A3B8',
  shadowDark: '#020617',
  shadowLight: '#334155',
  chipBg: '#334155',
  inputBg: '#1E293B',
  dangerBg: '#450A0A',
};

export type ThemeColors = typeof WARM_COLORS;

export function useThemeColors(): ThemeColors {
  const { themeMode } = useThemeMode();
  return themeMode === 'navy' ? NAVY_COLORS : WARM_COLORS;
}
