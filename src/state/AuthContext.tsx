import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { t } from '@/src/i18n';
import { firebaseAuth } from '../firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  retrySignIn: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      signInAnonymously(firebaseAuth).catch((e) => {
        const message =
          e?.code === 'auth/operation-not-allowed'
            ? t('auth.anonymousDisabled')
            : t('auth.loginFailed');
        setError(message);
      });
    } else {
      setError(null);
    }
  }, [loading, user]);

  const retrySignIn = async () => {
    setError(null);
    try {
      const result = await signInAnonymously(firebaseAuth);
      return result.user ?? null;
    } catch (e: any) {
      const message =
        e?.code === 'auth/operation-not-allowed'
          ? t('auth.anonymousDisabled')
          : t('auth.loginFailed');
      setError(message);
      return null;
    }
  };

  const value = useMemo(
    () => ({ user, loading, error, retrySignIn }),
    [user, loading, error]
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
