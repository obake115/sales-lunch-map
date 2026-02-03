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
