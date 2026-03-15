/**
 * Determines which food badges are visible to the user.
 * Free users: first 5 earned badges visible.
 * Purchased users: all earned badges visible.
 */

const FREE_BADGE_LIMIT = 5;

export function getVisibleFoodBadges(
  earnedBadges: string[],
  isPurchased: boolean,
): { visible: Set<string>; locked: Set<string> } {
  if (isPurchased) {
    return {
      visible: new Set(earnedBadges),
      locked: new Set<string>(),
    };
  }

  const visible = new Set(earnedBadges.slice(0, FREE_BADGE_LIMIT));
  const locked = new Set(earnedBadges.slice(FREE_BADGE_LIMIT));
  return { visible, locked };
}

export { FREE_BADGE_LIMIT };
