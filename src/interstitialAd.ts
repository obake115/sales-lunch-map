import Constants from 'expo-constants';

import { getAdMobInterstitialUnitId } from './admob';

/**
 * Interstitial ad manager with frequency limiting.
 * Shows an interstitial ad every FREQUENCY_INTERVAL actions.
 * Premium users never see interstitial ads.
 */

const FREQUENCY_INTERVAL = 3;

let actionCount = 0;
let adInstance: any = null;
let adLoaded = false;
let loading = false;

function getAdMod() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

export function preloadInterstitial(): void {
  if (Constants.appOwnership === 'expo') return;

  const mod = getAdMod();
  if (!mod?.InterstitialAd) return;
  if (loading || adLoaded) return;

  try {
    loading = true;
    const unitId = getAdMobInterstitialUnitId();
    const ad = mod.InterstitialAd.createForAdRequest(unitId);
    const AdEventType = mod.AdEventType;

    if (!ad || typeof ad.onAdEvent !== 'function') {
      loading = false;
      return;
    }

    const unsubscribe = ad.onAdEvent((type: string) => {
      if (type === AdEventType.LOADED) {
        adInstance = ad;
        adLoaded = true;
        loading = false;
        unsubscribe();
      }
      if (type === AdEventType.ERROR) {
        loading = false;
        unsubscribe();
      }
    });

    ad.load();
  } catch {
    loading = false;
  }
}

/**
 * Record an action and maybe show an interstitial ad.
 * Returns a Promise that resolves when the ad is dismissed (or immediately if not shown).
 */
export async function maybeShowInterstitial(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  if (Constants.appOwnership === 'expo') return;

  actionCount += 1;
  if (actionCount % FREQUENCY_INTERVAL !== 0) {
    // Preload for next time
    preloadInterstitial();
    return;
  }

  if (!adLoaded || !adInstance) {
    // Ad not ready — preload and skip
    preloadInterstitial();
    return;
  }

  const mod = getAdMod();
  if (!mod) return;

  const AdEventType = mod.AdEventType;
  const ad = adInstance;
  adInstance = null;
  adLoaded = false;

  return new Promise<void>((resolve) => {
    const unsubscribe = ad.onAdEvent((type: string) => {
      if (type === AdEventType.CLOSED) {
        unsubscribe();
        // Preload next ad
        preloadInterstitial();
        resolve();
      }
      if (type === AdEventType.ERROR) {
        unsubscribe();
        preloadInterstitial();
        resolve();
      }
    });

    try {
      ad.show();
    } catch {
      preloadInterstitial();
      resolve();
    }
  });
}
