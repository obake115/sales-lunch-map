import Constants from 'expo-constants';
import { PropsWithChildren, useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotifications, ensureAndroidDefaultChannel, registerPushToken } from './notifications';
import { identifyUser, syncPurchasedState } from './purchases';
import { AuthProvider, useAuth } from './state/AuthContext';
import { usePremium, PremiumProvider } from './state/PremiumContext';
import { StoresProvider } from './state/StoresContext';

function PurchaseIdentifier() {
  const { user, authMethod } = useAuth();
  const { refreshPremium } = usePremium();

  useEffect(() => {
    if (!user) return;
    // RevenueCat 同期の成否にかかわらず refreshPremium を必ず呼ぶ。
    // isDevUser() は firebaseAuth.currentUser を参照するため、
    // ユーザー確定後に再評価しないとプレミアム判定が反映されない。
    const sync = authMethod !== 'anonymous'
      ? identifyUser(user.uid).then(() => syncPurchasedState()).catch(() => {})
      : Promise.resolve();
    sync.then(() => refreshPremium());
  }, [user?.uid, authMethod, refreshPremium]);

  // Register push token when user is available
  useEffect(() => {
    if (!user) return;
    registerPushToken(user.uid).catch(() => {});
  }, [user?.uid]);

  return null;
}

function AppProvidersInner({ children }: PropsWithChildren) {
  const { refreshPremium } = usePremium();

  useEffect(() => {
    // 通知設定（Expo Go / iOSシミュレータでは内部で no-op）
    configureNotifications();
    ensureAndroidDefaultChannel().catch(() => {});

    if (Constants.appOwnership === 'expo') return;

    // ATT (App Tracking Transparency) を AdMob 初期化前にリクエスト
    const initAds = async () => {
      if (Platform.OS === 'ios') {
        try {
          const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
          await requestTrackingPermissionsAsync();
        } catch {
          // ATT モジュール未搭載時は無視
        }
      }
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
    };
    initAds();

    // Sync purchase entitlement on app start (no-op in Expo Go).
    syncPurchasedState().then(() => refreshPremium()).catch(() => {});
  }, [refreshPremium]);

  return (
    <AuthProvider>
      <StoresProvider>
        <PurchaseIdentifier />
        {children}
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
