import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { firebaseAuth } from '../firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      signInAnonymously(firebaseAuth).catch(() => {
        // ignore: UI will show error where needed
      });
    }
  }, [loading, user]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
