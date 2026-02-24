import Constants from 'expo-constants';
import { PropsWithChildren, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoginBonusModal } from './components/LoginBonusModal';
import { configureNotifications, ensureAndroidDefaultChannel, registerPushToken } from './notifications';
import { identifyUser, syncPurchasedState } from './purchases';
import { AuthProvider, useAuth } from './state/AuthContext';
import { usePremium, PremiumProvider } from './state/PremiumContext';
import { StoresProvider } from './state/StoresContext';
import { useAppBootstrap } from './state/useAppBootstrap';

function PurchaseIdentifier() {
  const { user, authMethod } = useAuth();
  const { refreshPremium } = usePremium();

  useEffect(() => {
    if (!user) return;
    if (authMethod !== 'anonymous') {
      identifyUser(user.uid).then(() => syncPurchasedState().then(() => refreshPremium()));
    }
  }, [user?.uid, authMethod, refreshPremium]);

  // Register push token when user is available
  useEffect(() => {
    if (!user) return;
    registerPushToken(user.uid).catch(() => {});
  }, [user?.uid]);

  return null;
}

function AppProvidersInner({ children }: PropsWithChildren) {
  const { loginBonus, dismissLoginBonus } = useAppBootstrap();
  const { refreshPremium } = usePremium();

  useEffect(() => {
    configureNotifications();
    ensureAndroidDefaultChannel();
    // Expo Go では AdMob が入っていないので絶対に読み込まない
    if (Constants.appOwnership === 'expo') return;
    // Expo Go には AdMob ネイティブモジュールが入っていないため、動的に読み込む
    // (Development Build / 本番ビルドでは有効)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-google-mobile-ads');
      const mobileAds = mod?.default;
      if (typeof mobileAds === 'function') {
        mobileAds().initialize();
      }
    } catch {
      // ignore: Expo Go などで未搭載の場合
    }

    // Sync purchase entitlement on app start (no-op in Expo Go).
    syncPurchasedState().then(() => refreshPremium());
  }, [refreshPremium]);

  return (
    <AuthProvider>
      <StoresProvider>
        <PurchaseIdentifier />
        {children}
        <LoginBonusModal
          visible={!!loginBonus?.awarded}
          streak={loginBonus?.state.streak ?? 0}
          totalDays={loginBonus?.state.totalDays ?? 0}
          onClose={dismissLoginBonus}
        />
      </StoresProvider>
    </AuthProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <PremiumProvider>
        <AppProvidersInner>{children}</AppProvidersInner>
      </PremiumProvider>
    </SafeAreaProvider>
  );
}
