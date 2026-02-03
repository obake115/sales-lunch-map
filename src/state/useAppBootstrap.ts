import { useEffect, useState } from 'react';

import { claimLoginBonusIfNeeded, type LoginBonusState } from '../storage';

type LoginBonusPayload = {
  awarded: boolean;
  state: LoginBonusState;
};

export function useAppBootstrap() {
  const [loginBonus, setLoginBonus] = useState<LoginBonusPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await claimLoginBonusIfNeeded();
        if (mounted) setLoginBonus(result);
      } catch {
        if (mounted) {
          setLoginBonus({
            awarded: false,
            state: { lastClaimedDate: undefined, streak: 0, totalDays: 0 },
          });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dismissLoginBonus = () => {
    setLoginBonus((current) => (current ? { ...current, awarded: false } : current));
  };

  return {
    loginBonus,
    dismissLoginBonus,
  };
}
