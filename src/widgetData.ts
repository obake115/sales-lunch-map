import { NativeModules, Platform } from 'react-native';

import type { Store } from './models';

const { WidgetDataBridge } = NativeModules;

function getDailyPickIndex(poolSize: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % poolSize;
}

export function pushWidgetData(stores: Store[]): void {
  if (Platform.OS !== 'ios' || !WidgetDataBridge) return;

  const favorites = stores.filter((s) => s.isFavorite);
  const pool = favorites.length > 0 ? favorites : stores;
  const pick = pool.length > 0 ? pool[getDailyPickIndex(pool.length)] : null;

  const data = {
    todayPickName: pick?.name ?? '',
    todayPickNote: pick?.note ?? '',
    totalStores: stores.length,
    favorites: favorites.length,
    reminders: stores.filter((s) => s.remindEnabled).length,
  };

  try {
    WidgetDataBridge.setData(JSON.stringify(data));
  } catch {
    // Widget bridge may not be available in development
  }
}
