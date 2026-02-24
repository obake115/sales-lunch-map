import {
  deleteUser,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { setAnalyticsUserId } from '@/src/analytics';
import { getAppleCredential } from '@/src/auth/appleAuth';
import { getGoogleCredential } from '@/src/auth/googleAuth';
import { t } from '@/src/i18n';
import { firebaseAuth } from '../firebase';

export type AuthMethod = 'anonymous' | 'apple' | 'google';

export type LinkResult = {
  success: boolean;
  uidChanged: boolean;
  error?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  authMethod: AuthMethod;
  signInWithApple: () => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signInAsGuest: () => Promise<User | null>;
  linkAccount: (provider: 'apple' | 'google') => Promise<LinkResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

function getAuthMethod(user: User | null): AuthMethod {
  if (!user || user.isAnonymous) return 'anonymous';
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes('apple.com')) return 'apple';
  if (providers.includes('google.com')) return 'google';
  return 'anonymous';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (next) => {
      setUser(next);
      setLoading(false);
      setAnalyticsUserId(next?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      signInAnonymously(firebaseAuth).catch((e: any) => {
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

  const signInWithApple = useCallback(async (): Promise<User | null> => {
    setError(null);
    try {
      console.log('[Firebase] signInWithApple: getting credential...');
      const credential = await getAppleCredential();
      console.log('[Firebase] signInWithApple: calling signInWithCredential...');
      const result = await signInWithCredential(firebaseAuth, credential);
      console.log('[Firebase] signInWithCredential success', result.user?.uid);
      return result.user;
    } catch (e: any) {
      console.error('[Apple/Firebase] sign-in failed', {
        code: e?.code,
        message: e?.message,
        stack: e?.stack?.split('\n').slice(0, 3).join('\n'),
        platform: Platform.OS,
        osVersion: Platform.Version,
        isPad: Platform.OS === 'ios' && (Platform as any).isPad,
        currentUser: !!firebaseAuth.currentUser,
      });
      const isCancelled =
        e?.code === 'ERR_REQUEST_CANCELED' ||
        e?.code === 'ERR_CANCELED' ||
        e?.message?.includes('canceled') ||
        e?.message?.includes('cancelled');
      if (!isCancelled) {
        // 本番でも必ずエラー詳細を表示（審査対策）
        const msg = e?.code
          ? `${e.code}\n${e.message ?? ''}`
          : (e?.message ?? String(e));
        setError(msg);
      }
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setError(null);
    try {
      console.log('[AUTH] signInWithGoogle: getting credential...');
      const credential = await getGoogleCredential();
      console.log('[AUTH] signInWithGoogle: signing in with Firebase...');
      const result = await signInWithCredential(firebaseAuth, credential);
      console.log('[AUTH] signInWithGoogle: SUCCESS uid=', result.user?.uid?.slice(0, 8));
      return result.user;
    } catch (e: any) {
      console.error('[AUTH] signInWithGoogle FAILED', {
        code: e?.code,
        message: e?.message,
      });
      const isCancelled =
        e?.code === 'ERR_REQUEST_CANCELED' ||
        e?.code === 'SIGN_IN_CANCELLED' ||
        e?.message?.includes('canceled') ||
        e?.message?.includes('cancelled');
      if (!isCancelled) {
        const msg = e?.code
          ? `${e.code}\n${e.message ?? ''}`
          : (e?.message ?? String(e));
        setError(msg);
      }
      return null;
    }
  }, []);

  const signInAsGuest = useCallback(async (): Promise<User | null> => {
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
  }, []);

  const linkAccount = useCallback(
    async (provider: 'apple' | 'google'): Promise<LinkResult> => {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        return { success: false, uidChanged: false, error: t('auth.loginFailed') };
      }

      let credential: AuthCredential;
      try {
        console.log('[AUTH] linkAccount: getting credential for', provider);
        credential =
          provider === 'apple' ? await getAppleCredential() : await getGoogleCredential();
        console.log('[AUTH] linkAccount: credential obtained');
      } catch (e: any) {
        console.error('[AUTH] linkAccount: credential FAILED', { code: e?.code, message: e?.message });
        const isCancelled =
          e?.code === 'ERR_REQUEST_CANCELED' ||
          e?.code === 'SIGN_IN_CANCELLED' ||
          e?.code === 'ERR_CANCELED' ||
          e?.message?.includes('canceled') ||
          e?.message?.includes('cancelled');
        if (isCancelled) {
          return { success: false, uidChanged: false };
        }
        const detail = e?.message ? `\n(${e.message})` : '';
        return { success: false, uidChanged: false, error: t('auth.linkFailed') + detail };
      }

      try {
        console.log('[AUTH] linkAccount: linking with Firebase...');
        await linkWithCredential(currentUser, credential);
        console.log('[AUTH] linkAccount: link SUCCESS');
        return { success: true, uidChanged: false };
      } catch (linkError: any) {
        console.error('[AUTH] linkAccount: link FAILED', { code: linkError?.code, message: linkError?.message });
        if (linkError?.code === 'auth/credential-already-in-use') {
          try {
            console.log('[AUTH] linkAccount: credential-already-in-use, signing in instead...');
            await signInWithCredential(firebaseAuth, credential);
            console.log('[AUTH] linkAccount: signIn SUCCESS (uid changed)');
            return { success: true, uidChanged: true };
          } catch (signInError: any) {
            console.error('[AUTH] linkAccount: fallback signIn FAILED', { code: signInError?.code, message: signInError?.message });
            return { success: false, uidChanged: false, error: t('auth.linkFailed') };
          }
        }
        const msg = linkError?.code
          ? `${linkError.code}: ${linkError.message ?? ''}`
          : (linkError?.message ?? String(linkError));
        return { success: false, uidChanged: false, error: t('auth.linkFailed') + '\n(' + msg + ')' };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setError(null);
    await firebaseAuth.signOut();
    await signInAnonymously(firebaseAuth);
  }, []);

  const deleteAccount = useCallback(async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;
    // 1. Delete cloud data
    const { deleteAllCloudData } = await import('../sync/firestoreSync');
    await deleteAllCloudData(uid);
    // 2. Clear all local data
    const { clearAllLocalData } = await import('../storage');
    await clearAllLocalData();
    // 3. Clear AsyncStorage
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
    // 4. Delete Firebase user
    await deleteUser(currentUser);
    // 5. Re-sign in as anonymous
    await signInAnonymously(firebaseAuth);
  }, []);

  const authMethod = useMemo(() => getAuthMethod(user), [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      authMethod,
      signInWithApple,
      signInWithGoogle,
      signInAsGuest,
      linkAccount,
      signOut,
      deleteAccount,
    }),
    [user, loading, error, authMethod, signInWithApple, signInWithGoogle, signInAsGuest, linkAccount, signOut, deleteAccount]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
