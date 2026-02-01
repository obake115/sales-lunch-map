import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { getAdMobBannerUnitId } from '../admob';

export function BottomAdBanner() {
  const insets = useSafeAreaInsets();
  const unitId = useMemo(() => getAdMobBannerUnitId(), []);

  // Expo Go は AdMob 非対応
  if (Constants.appOwnership === 'expo') return null;

  // Expo Go ではネイティブモジュールが無いため、表示しない
  let BannerAd: any | null = null;
  let BannerAdSize: any | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-google-mobile-ads');
    BannerAd = mod?.BannerAd ?? null;
    BannerAdSize = mod?.BannerAdSize ?? null;
  } catch {
    BannerAd = null;
    BannerAdSize = null;
  }

  if (!BannerAd || !BannerAdSize) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        alignItems: 'center',
        backgroundColor: 'transparent',
      }}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

