type AdMode = 'test' | 'prod';

// Expo Go でも落ちないように、ライブラリの TestIds は動的に参照する
// (Expo Go ではそもそも AdMob 非対応なので、固定のテストIDを返す)
const FALLBACK_TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
const FALLBACK_TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

function getTestBannerUnitId(): string {
  // Expo Go は AdMob 非対応なので require しない
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    if (Constants?.appOwnership === 'expo') return FALLBACK_TEST_BANNER_UNIT_ID;
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-google-mobile-ads');
    const TestIds = mod?.TestIds;
    return (TestIds?.BANNER as string | undefined) ?? FALLBACK_TEST_BANNER_UNIT_ID;
  } catch {
    return FALLBACK_TEST_BANNER_UNIT_ID;
  }
}

function getTestRewardedUnitId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    if (Constants?.appOwnership === 'expo') return FALLBACK_TEST_REWARDED_UNIT_ID;
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-google-mobile-ads');
    const TestIds = mod?.TestIds;
    return (TestIds?.REWARDED as string | undefined) ?? FALLBACK_TEST_REWARDED_UNIT_ID;
  } catch {
    return FALLBACK_TEST_REWARDED_UNIT_ID;
  }
}

export function getAdMobBannerUnitId() {
  const mode = (process.env.EXPO_PUBLIC_ADMOB_MODE as AdMode | undefined) ?? (__DEV__ ? 'test' : 'prod');

  if (mode === 'test') return getTestBannerUnitId();

  // Prefer per-platform unit IDs (recommended by AdMob)
  // Fallback to common env var if user only sets one.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Platform = require('react-native').Platform as { OS: 'ios' | 'android' | string };
  const prodId =
    Platform?.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS
      : Platform?.OS === 'android'
        ? process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID
        : undefined;

  const common = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;
  const picked = prodId && prodId.trim().length > 0 ? prodId.trim() : common && common.trim().length > 0 ? common.trim() : '';
  return picked ? picked : getTestBannerUnitId();
}

export function getAdMobRewardedUnitId() {
  const mode = (process.env.EXPO_PUBLIC_ADMOB_MODE as AdMode | undefined) ?? (__DEV__ ? 'test' : 'prod');

  if (mode === 'test') return getTestRewardedUnitId();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Platform = require('react-native').Platform as { OS: 'ios' | 'android' | string };
  const prodId =
    Platform?.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS
      : Platform?.OS === 'android'
        ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_ANDROID
        : undefined;

  const common = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;
  const picked = prodId && prodId.trim().length > 0 ? prodId.trim() : common && common.trim().length > 0 ? common.trim() : '';
  return picked ? picked : getTestRewardedUnitId();
}
