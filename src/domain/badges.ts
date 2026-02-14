import { t } from '@/src/i18n';

export type ProfileStats = {
  storesCount: number;
  favoritesCount: number;
  nearbyShownCount: number;
  totalLoginDays: number;
  loginStreak: number;
};

export type Badge = {
  id: string;
  label: string;
  description: string;
  rank: number;
  minStores?: number;
  minFavorites?: number;
  minNearbyShown?: number;
  minLoginDays?: number;
  minStreak?: number;
};

const BADGES: Badge[] = [
  {
    id: 'login_1',
    label: t('badges.login_1.label'),
    description: t('badges.login_1.description'),
    rank: 0,
    minLoginDays: 1,
  },
  {
    id: 'store_5',
    label: t('badges.store_5.label'),
    description: t('badges.store_5.description'),
    rank: 1,
    minStores: 5,
  },
  {
    id: 'store_20',
    label: t('badges.store_20.label'),
    description: t('badges.store_20.description'),
    rank: 2,
    minStores: 20,
  },
  {
    id: 'favorite_5',
    label: t('badges.favorite_5.label'),
    description: t('badges.favorite_5.description'),
    rank: 3,
    minFavorites: 5,
  },
  {
    id: 'streak_7',
    label: t('badges.streak_7.label'),
    description: t('badges.streak_7.description'),
    rank: 4,
    minStreak: 7,
  },
  {
    id: 'nearby_10',
    label: t('badges.nearby_10.label'),
    description: t('badges.nearby_10.description'),
    rank: 5,
    minNearbyShown: 10,
  },
];

function isAchieved(badge: Badge, stats: ProfileStats): boolean {
  if (badge.minStores && stats.storesCount < badge.minStores) return false;
  if (badge.minFavorites && stats.favoritesCount < badge.minFavorites) return false;
  if (badge.minNearbyShown && stats.nearbyShownCount < badge.minNearbyShown) return false;
  if (badge.minLoginDays && stats.totalLoginDays < badge.minLoginDays) return false;
  if (badge.minStreak && stats.loginStreak < badge.minStreak) return false;
  return true;
}

export function getCurrentBadge(stats: ProfileStats): Badge {
  const achieved = BADGES.filter((b) => isAchieved(b, stats)).sort((a, b) => b.rank - a.rank);
  if (achieved.length > 0) return achieved[0];
  return {
    id: 'rookie',
    label: t('badges.rookie.label'),
    description: t('badges.rookie.description'),
    rank: 0,
  };
}

export function getNextBadge(stats: ProfileStats): Badge | null {
  const next = BADGES.filter((b) => !isAchieved(b, stats)).sort((a, b) => a.rank - b.rank);
  return next.length > 0 ? next[0] : null;
}

export function getAchievedBadges(stats: ProfileStats): Badge[] {
  return BADGES.filter((b) => isAchieved(b, stats)).sort((a, b) => b.rank - a.rank);
}
