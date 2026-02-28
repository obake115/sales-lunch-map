import { formatYmd } from './domain/date';
import {
  getLastPaywallShownAt,
  getPaywallDismissedAt,
  setLastPaywallShownAt,
  setPaywallDismissedAt,
} from './storage';

let sessionShown = false;

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function canShowPaywall(): Promise<boolean> {
  if (sessionShown) return false;

  // 1日1回チェック
  const today = formatYmd(new Date());
  const lastShown = await getLastPaywallShownAt();
  if (lastShown === today) return false;

  // 48時間クールダウン
  const dismissedAt = await getPaywallDismissedAt();
  if (dismissedAt) {
    const dismissedTime = new Date(dismissedAt).getTime();
    if (!Number.isNaN(dismissedTime) && Date.now() - dismissedTime < COOLDOWN_MS) {
      return false;
    }
  }

  return true;
}

export async function recordPaywallShown(): Promise<void> {
  sessionShown = true;
  await setLastPaywallShownAt(formatYmd(new Date()));
}

export async function recordPaywallDismissed(): Promise<void> {
  await setPaywallDismissedAt(new Date().toISOString());
}
