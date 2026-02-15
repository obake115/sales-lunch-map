import * as StoreReview from 'expo-store-review';

import { SETTING_KEYS } from '../constants';
import { getSetting, setSetting } from '../db/settingsRepo';
import { getDb } from '../db/sqlite';
import { runMigrations } from '../db/migrations';

const REVIEW_THRESHOLD = 5;

export async function maybeRequestReview(storeCount: number): Promise<void> {
  if (storeCount < REVIEW_THRESHOLD) return;

  const db = await getDb();
  await runMigrations(db);
  const prompted = await getSetting(db, SETTING_KEYS.reviewPrompted);
  if (prompted === '1') return;

  const available = await StoreReview.isAvailableAsync();
  if (!available) return;

  await setSetting(db, SETTING_KEYS.reviewPrompted, '1');
  await StoreReview.requestReview();
}
