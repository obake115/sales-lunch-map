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
    id: 'store_5',
    label: 'ランチ探索家',
    description: 'ランチ候補を5件登録',
    rank: 1,
    minStores: 5,
  },
  {
    id: 'store_20',
    label: 'ランチマスター',
    description: 'ランチ候補を20件登録',
    rank: 2,
    minStores: 20,
  },
  {
    id: 'favorite_5',
    label: '推しランチ達成',
    description: '次回候補を5件登録',
    rank: 3,
    minFavorites: 5,
  },
  {
    id: 'streak_7',
    label: '1週間皆勤',
    description: '7日連続ログイン',
    rank: 4,
    minStreak: 7,
  },
  {
    id: 'nearby_10',
    label: '近場ハンター',
    description: '近くの候補表示を10回',
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
    label: '見習い',
    description: 'プロフィールを育てて称号を獲得しよう',
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
