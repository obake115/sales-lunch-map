import { SETTING_KEYS } from '../constants';
import { getSetting, setSetting } from '../db/settingsRepo';
import { getDb } from '../db/sqlite';
import { runMigrations } from '../db/migrations';

// Apple allows up to 3 review prompts per year per user
const REVIEW_MILESTONES = [5, 15, 30];

export async function maybeRequestReview(storeCount: number): Promise<void> {
  const db = await getDb();
  await runMigrations(db);

  const promptedCountStr = await getSetting(db, SETTING_KEYS.reviewPromptedCount);
  const promptedCount = parseInt(promptedCountStr ?? '0', 10) || 0;

  if (promptedCount >= REVIEW_MILESTONES.length) return;

  const nextMilestone = REVIEW_MILESTONES[promptedCount];
  if (!nextMilestone || storeCount < nextMilestone) return;

  try {
    const StoreReview = await import('expo-store-review');
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    await setSetting(db, SETTING_KEYS.reviewPromptedCount, String(promptedCount + 1));
    // Keep legacy key for backwards compatibility
    await setSetting(db, SETTING_KEYS.reviewPrompted, '1');
    await StoreReview.requestReview();
  } catch {
    // Native module not available (e.g. Expo Go), skip silently
  }
}
