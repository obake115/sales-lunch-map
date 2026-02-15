import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isPremiumUser } from '../storage';

type PremiumContextValue = {
  isPremium: boolean;
  refreshPremium: () => Promise<void>;
  setPremium: (value: boolean) => void;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: PropsWithChildren) {
  const [premium, setPremiumState] = useState(false);

  useEffect(() => {
    (async () => {
      const value = await isPremiumUser();
      setPremiumState(value);
    })();
  }, []);

  const refreshPremium = useCallback(async () => {
    const value = await isPremiumUser();
    setPremiumState(value);
  }, []);

  const value = useMemo(
    () => ({
      isPremium: premium,
      refreshPremium,
      setPremium: setPremiumState,
    }),
    [premium, refreshPremium]
  );

  return <PremiumContext value={value}>{children}</PremiumContext>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
