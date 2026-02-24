/**
 * Firebase Analytics wrapper with Expo Go guard.
 *
 * In Expo Go the native module is unavailable, so every public function
 * silently no-ops. In development/production builds the real
 * @react-native-firebase/analytics SDK is used.
 */

// ---------------------------------------------------------------------------
// Internal: lazily resolved analytics module
// ---------------------------------------------------------------------------

type FirebaseAnalyticsModule = {
  default: () => {
    logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
    logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
    logLogin: (params: { method: string }) => Promise<void>;
    setUserId: (id: string | null) => Promise<void>;
  };
};

/**
 * Check whether the native Firebase module is available.
 * In Expo Go (or any build that lacks the native module) the
 * RNFBAppModule will be absent – we must bail out BEFORE requiring
 * @react-native-firebase/* because the require itself triggers
 * native-module resolution that throws a fatal (uncatchable) error.
 */
function hasNativeFirebase(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules } = require('react-native');
    return !!NativeModules?.RNFBAppModule;
  } catch {
    return false;
  }
}

let _analytics: FirebaseAnalyticsModule['default'] | null | undefined;

function getAnalytics(): FirebaseAnalyticsModule['default'] | null {
  if (_analytics !== undefined) return _analytics;
  if (!hasNativeFirebase()) {
    _analytics = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/analytics');
    _analytics = (mod?.default ?? mod) as FirebaseAnalyticsModule['default'];
    return _analytics;
  } catch {
    _analytics = null;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Screen view
// ---------------------------------------------------------------------------

export async function logScreenView(screenName: string): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function logLogin(params: { method: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logLogin({ method: params.method });
  } catch {
    // ignore
  }
}

export async function setAnalyticsUserId(uid: string | null): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().setUserId(uid);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export async function logStoreRegistered(params: { store_name: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('store_registered', params);
  } catch {
    // ignore
  }
}

export async function logStoreDeleted(params: { store_id: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('store_deleted', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export async function logPhotoAdded(params: { context: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('photo_added', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Shared map
// ---------------------------------------------------------------------------

export async function logSharedMapCreated(): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('shared_map_created');
  } catch {
    // ignore
  }
}

export async function logSharedMapJoined(params: { method: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('shared_map_joined', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Travel lunch
// ---------------------------------------------------------------------------

export async function logTravelLunchRecorded(params: {
  prefecture_id: string;
  genre: string;
  rating: number;
}): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('travel_lunch_recorded', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export async function logPremiumPurchased(): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('premium_purchased');
  } catch {
    // ignore
  }
}

export async function logPurchaseRestored(): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('purchase_restored');
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Reward ad
// ---------------------------------------------------------------------------

export async function logAdRewardWatched(params: { result: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('ad_reward_watched', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------

export async function logReminderSetup(params: {
  store_id: string;
  enabled: boolean;
}): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('reminder_setup', {
      store_id: params.store_id,
      enabled: params.enabled ? 'true' : 'false',
    });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export async function logThemeChanged(params: { theme: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('theme_changed', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export async function logBadgeEarned(params: { badge_id: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('badge_earned', params);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Account link
// ---------------------------------------------------------------------------

export async function logAccountLinked(params: { method: string }): Promise<void> {
  try {
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics().logEvent('account_linked', params);
  } catch {
    // ignore
  }
}
