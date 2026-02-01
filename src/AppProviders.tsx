import { PropsWithChildren, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { configureNotifications, ensureAndroidDefaultChannel } from './notifications';
import { StoresProvider } from './state/StoresContext';

export function AppProviders({ children }: PropsWithChildren) {
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
  }, []);

  return (
    <SafeAreaProvider>
      <StoresProvider>{children}</StoresProvider>
    </SafeAreaProvider>
  );
}

