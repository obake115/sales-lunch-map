export const GEOFENCE_TASK_NAME = 'GEOFENCE_TASK';

export const GEOFENCE_RADIUS_METERS = 200;
export const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export const STORAGE_KEYS = {
  stores: 'stores:v1',
  memos: (storeId: string) => `memos:v1:${storeId}`,
  seeded: 'seeded:v1',
  loginBonus: 'loginBonus:v1',
};

export const SETTING_KEYS = {
  migrationV1: 'migrationV1',
  nearbyRadiusM: 'nearbyRadiusM',
  lastLoginDate: 'lastLoginDate',
  streakDays: 'streakDays',
  maxStreakDays: 'maxStreakDays',
  totalLoginDays: 'totalLoginDays',
  badgesUnlocked: 'badgesUnlocked',
  nearbyShownCount: 'nearbyShownCount',
  nearbyShownDate: 'nearbyShownDate',
  seeded: 'seeded',
  themeMode: 'themeMode',
  profileAvatarUri: 'profileAvatarUri',
  profileName: 'profileName',
  selectedBadgeId: 'selectedBadgeId',
  postLimitPurchased: 'postLimitPurchased',
  postLimitBonusSlots: 'postLimitBonusSlots',
  postLimitRewardedDate: 'postLimitRewardedDate',
  hasSeenOnboarding: 'hasSeenOnboarding',
};

