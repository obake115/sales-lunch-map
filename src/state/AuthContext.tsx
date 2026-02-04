import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { firebaseAuth } from '../firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  retrySignIn: () => Promise<void>;
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
            ? '匿名ログインが無効です。FirebaseでAnonymousを有効化してください。'
            : 'ログインに失敗しました。';
        setError(message);
      });
    } else {
      setError(null);
    }
  }, [loading, user]);

  const retrySignIn = async () => {
    setError(null);
    await signInAnonymously(firebaseAuth).catch((e) => {
      const message =
        e?.code === 'auth/operation-not-allowed'
          ? '匿名ログインが無効です。FirebaseでAnonymousを有効化してください。'
          : 'ログインに失敗しました。';
      setError(message);
    });
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
