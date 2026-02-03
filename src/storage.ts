import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { SETTING_KEYS, STORAGE_KEYS } from './constants';
import { runMigrations } from './db/migrations';
import { deletePlace, getAllPlaces, getPlaceById, insertPlace, updatePlace } from './db/placesRepo';
import { getSetting, setSetting } from './db/settingsRepo';
import { getDb } from './db/sqlite';
import { addDays, formatYmd } from './domain/date';
import { createId } from './id';
import type { Memo, Store } from './models';

type MemoRow = {
  id: string;
  storeId: string;
  text: string;
  checked: number;
  reminderAt: number | null;
  reminderNotificationId: string | null;
  createdAt: number;
};

export type ReminderListItem = {
  storeId: string;
  storeName: string;
  memoId: string;
  text: string;
  reminderAt: number;
};

export type LoginBonusState = {
  lastClaimedDate?: string;
  streak: number;
  totalDays: number;
};

export type ThemeMode = 'warm' | 'navy';

const DEFAULT_LOGIN_BONUS_STATE: LoginBonusState = {
  lastClaimedDate: undefined,
  streak: 0,
  totalDays: 0,
};

let dbReadyPromise: Promise<SQLiteDatabase> | null = null;

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const rowToMemo = (row: MemoRow): Memo => ({
  id: row.id,
  storeId: row.storeId,
  text: row.text ?? '',
  checked: row.checked === 1,
  reminderAt: typeof row.reminderAt === 'number' ? row.reminderAt : undefined,
  reminderNotificationId: row.reminderNotificationId ?? undefined,
  createdAt: row.createdAt,
});

async function getReadyDb(): Promise<SQLiteDatabase> {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      const db = await getDb();
      await runMigrations(db);
      await migrateFromAsyncStorageIfNeeded(db);
      return db;
    })();
  }
  return dbReadyPromise;
}

async function insertMemoRow(db: SQLiteDatabase, memo: Memo) {
  await db.runAsync(
    `INSERT INTO memos (id, storeId, text, checked, reminderAt, reminderNotificationId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      memo.id,
      memo.storeId,
      memo.text,
      memo.checked ? 1 : 0,
      memo.reminderAt ?? null,
      memo.reminderNotificationId ?? null,
      memo.createdAt,
    ]
  );
}

async function migrateFromAsyncStorageIfNeeded(db: SQLiteDatabase) {
  const migrated = await getSetting(db, SETTING_KEYS.migrationV1);
  if (migrated) return;

  const rawStores = await AsyncStorage.getItem(STORAGE_KEYS.stores);
  const stores = safeJsonParse<Store[]>(rawStores) ?? [];

  for (const store of stores) {
    const rawMemos = await AsyncStorage.getItem(STORAGE_KEYS.memos(store.id));
    const memos = safeJsonParse<Memo[]>(rawMemos) ?? [];
    const note = memos.find((m) => m.text?.trim())?.text?.trim() || undefined;

    await insertPlace(db, {
      id: store.id,
      name: store.name,
      placeId: store.placeId,
      latitude: store.latitude,
      longitude: store.longitude,
      enabled: store.enabled,
      note,
      remindEnabled: store.enabled,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      lastNotifiedAt: store.lastNotifiedAt,
    });

    for (const memo of memos) {
      const text = memo.text?.trim() ?? '';
      if (!text) continue;
      await insertMemoRow(db, {
        id: memo.id ?? createId('memo'),
        storeId: store.id,
        text,
        checked: memo.checked ?? false,
        reminderAt: memo.reminderAt,
        reminderNotificationId: memo.reminderNotificationId,
        createdAt: memo.createdAt ?? Date.now(),
      });
    }
  }

  const rawLoginBonus = await AsyncStorage.getItem(STORAGE_KEYS.loginBonus);
  const loginState = safeJsonParse<LoginBonusState>(rawLoginBonus);
  if (loginState) {
    if (loginState.lastClaimedDate) {
      await setSetting(db, SETTING_KEYS.lastLoginDate, loginState.lastClaimedDate);
    }
    await setSetting(db, SETTING_KEYS.streakDays, String(loginState.streak ?? 0));
    await setSetting(db, SETTING_KEYS.totalLoginDays, String(loginState.totalDays ?? 0));
    await setSetting(db, SETTING_KEYS.maxStreakDays, String(loginState.streak ?? 0));
  }

  const existingRadius = await getSetting(db, SETTING_KEYS.nearbyRadiusM);
  if (!existingRadius) {
    await setSetting(db, SETTING_KEYS.nearbyRadiusM, '300');
  }

  const existingTheme = await getSetting(db, SETTING_KEYS.themeMode);
  if (!existingTheme) {
    await setSetting(db, SETTING_KEYS.themeMode, 'warm');
  }

  await setSetting(db, SETTING_KEYS.migrationV1, '1');
}

async function cancelScheduledIfNeeded(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

async function getMemoById(db: SQLiteDatabase, memoId: string): Promise<Memo | null> {
  const row = await db.getFirstAsync<MemoRow>('SELECT * FROM memos WHERE id = ?', memoId);
  return row ? rowToMemo(row) : null;
}

export async function getStores(): Promise<Store[]> {
  const db = await getReadyDb();
  return getAllPlaces(db);
}

export async function getStore(storeId: string): Promise<Store | null> {
  const db = await getReadyDb();
  return getPlaceById(db, storeId);
}

export async function addStore(input: {
  name: string;
  placeId?: string;
  latitude: number;
  longitude: number;
  note?: string;
}): Promise<Store> {
  const now = Date.now();
  const store: Store = {
    id: createId('store'),
    name: input.name.trim(),
    placeId: input.placeId?.trim() || undefined,
    latitude: input.latitude,
    longitude: input.longitude,
    enabled: true,
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getReadyDb();
  await insertPlace(db, store);
  return store;
}

export async function updateStore(
  storeId: string,
  patch: Partial<Omit<Store, 'id' | 'createdAt'>>
): Promise<Store | null> {
  const db = await getReadyDb();
  return updatePlace(db, storeId, patch);
}

export async function setStoreEnabled(storeId: string, enabled: boolean) {
  return updateStore(storeId, { enabled });
}

export async function setStoreLastNotifiedAt(storeId: string, at: number) {
  return updateStore(storeId, { lastNotifiedAt: at });
}

export async function deleteStore(storeId: string): Promise<void> {
  const db = await getReadyDb();
  await deletePlace(db, storeId);
}

export async function getMemos(storeId: string): Promise<Memo[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<MemoRow>(
    'SELECT * FROM memos WHERE storeId = ? ORDER BY createdAt DESC',
    storeId
  );
  return rows.map(rowToMemo);
}

export async function addMemo(storeId: string, text: string): Promise<Memo> {
  const memo: Memo = {
    id: createId('memo'),
    storeId,
    text: text.trim(),
    checked: false,
    reminderAt: undefined,
    reminderNotificationId: undefined,
    createdAt: Date.now(),
  };
  const db = await getReadyDb();
  await insertMemoRow(db, memo);
  return memo;
}

export async function updateMemoText(storeId: string, memoId: string, text: string) {
  const nextText = text.trim();
  if (!nextText) throw new Error('メモが空です');

  const db = await getReadyDb();
  const current = await getMemoById(db, memoId);
  if (!current || current.storeId !== storeId) return null;
  if (current.text === nextText) return current;

  const hasFutureReminder =
    !!current.reminderAt && current.reminderAt > Date.now() + 5_000 && !!current.reminderNotificationId && !current.checked;

  if (hasFutureReminder) {
    await cancelScheduledIfNeeded(current.reminderNotificationId);
  }

  let reminderNotificationId = current.reminderNotificationId;
  if (hasFutureReminder) {
    const store = await getStore(storeId);
    const title = store ? `${store.name}のリマインド` : '買い物メモのリマインド';
    const when = new Date(current.reminderAt as number);
    reminderNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: nextText,
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  }

  await db.runAsync('UPDATE memos SET text = ?, reminderNotificationId = ? WHERE id = ?', [
    nextText,
    reminderNotificationId ?? null,
    memoId,
  ]);

  return { ...current, text: nextText, reminderNotificationId: reminderNotificationId ?? undefined };
}

export async function setMemoReminder(storeId: string, memoId: string, reminderAt: number | null) {
  const db = await getReadyDb();
  const current = await getMemoById(db, memoId);
  if (!current || current.storeId !== storeId) return null;

  await cancelScheduledIfNeeded(current.reminderNotificationId);

  if (!reminderAt) {
    await db.runAsync('UPDATE memos SET reminderAt = NULL, reminderNotificationId = NULL WHERE id = ?', memoId);
    return { ...current, reminderAt: undefined, reminderNotificationId: undefined };
  }

  const when = new Date(reminderAt);
  if (Number.isNaN(when.getTime())) {
    throw new Error('日時が不正です');
  }
  if (when.getTime() < Date.now() + 5_000) {
    throw new Error('未来の日時を指定してください');
  }

  const store = await getStore(storeId);
  const title = store ? `${store.name}のリマインド` : '買い物メモのリマインド';
  const body = current.text;

  const newId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });

  await db.runAsync('UPDATE memos SET reminderAt = ?, reminderNotificationId = ? WHERE id = ?', [
    when.getTime(),
    newId,
    memoId,
  ]);

  return { ...current, reminderAt: when.getTime(), reminderNotificationId: newId };
}

export async function clearCheckedMemos(storeId: string) {
  const db = await getReadyDb();
  const checked = await db.getAllAsync<MemoRow>('SELECT * FROM memos WHERE storeId = ? AND checked = 1', storeId);
  for (const m of checked) {
    // eslint-disable-next-line no-await-in-loop
    await cancelScheduledIfNeeded(m.reminderNotificationId ?? undefined);
  }
  await db.runAsync('DELETE FROM memos WHERE storeId = ? AND checked = 1', storeId);
}

export async function getAllActiveReminders(): Promise<ReminderListItem[]> {
  const db = await getReadyDb();
  const now = Date.now() - 60_000;
  const rows = await db.getAllAsync<{
    storeId: string;
    storeName: string;
    memoId: string;
    text: string;
    reminderAt: number;
  }>(
    `SELECT m.storeId as storeId, p.name as storeName, m.id as memoId, m.text as text, m.reminderAt as reminderAt
     FROM memos m
     JOIN places p ON p.id = m.storeId
     WHERE m.checked = 0 AND m.reminderAt IS NOT NULL AND m.reminderAt > ?
     ORDER BY m.reminderAt ASC`,
    now
  );
  return rows;
}

export async function getTotalMemosCount(): Promise<number> {
  const db = await getReadyDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM memos');
  return row?.count ?? 0;
}

export async function toggleMemoChecked(storeId: string, memoId: string) {
  const db = await getReadyDb();
  const current = await getMemoById(db, memoId);
  if (!current || current.storeId !== storeId) return null;

  const nextChecked = !current.checked;
  if (nextChecked) {
    await cancelScheduledIfNeeded(current.reminderNotificationId);
    await db.runAsync(
      'UPDATE memos SET checked = 1, reminderAt = NULL, reminderNotificationId = NULL WHERE id = ?',
      memoId
    );
    return { ...current, checked: true, reminderAt: undefined, reminderNotificationId: undefined };
  }

  await db.runAsync('UPDATE memos SET checked = 0 WHERE id = ?', memoId);
  return { ...current, checked: false };
}

export async function deleteMemo(storeId: string, memoId: string) {
  const db = await getReadyDb();
  const target = await getMemoById(db, memoId);
  if (target && target.storeId === storeId) {
    await cancelScheduledIfNeeded(target.reminderNotificationId);
  }
  await db.runAsync('DELETE FROM memos WHERE id = ?', memoId);
}

export async function ensureSampleStore(): Promise<Store | null> {
  const db = await getReadyDb();
  const seeded = await getSetting(db, SETTING_KEYS.seeded);
  if (seeded) return null;

  const stores = await getAllPlaces(db);
  if (stores.length > 0) {
    await setSetting(db, SETTING_KEYS.seeded, '1');
    return null;
  }

  const created = await addStore({
    name: 'サンプル店舗（東京駅）',
    latitude: 35.681236,
    longitude: 139.767125,
  });
  await setSetting(db, SETTING_KEYS.seeded, '1');
  return created;
}

export async function getNearbyRadiusM(): Promise<number> {
  const db = await getReadyDb();
  const raw = await getSetting(db, SETTING_KEYS.nearbyRadiusM);
  const parsed = Number(raw);
  if ([100, 200, 300, 400, 500].includes(parsed)) return parsed;
  return 300;
}

export async function setNearbyRadiusM(value: number): Promise<void> {
  const db = await getReadyDb();
  const next = [100, 200, 300, 400, 500].includes(value) ? value : 300;
  await setSetting(db, SETTING_KEYS.nearbyRadiusM, String(next));
}

export async function getThemeMode(): Promise<ThemeMode> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.themeMode);
  return stored === 'navy' ? 'navy' : 'warm';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.themeMode, mode);
}

export async function recordNearbyShownIfNeeded(hasCandidates: boolean): Promise<void> {
  if (!hasCandidates) return;
  const db = await getReadyDb();
  const today = formatYmd(new Date());
  const lastDate = await getSetting(db, SETTING_KEYS.nearbyShownDate);
  if (lastDate === today) return;
  const count = Number(await getSetting(db, SETTING_KEYS.nearbyShownCount)) || 0;
  await setSetting(db, SETTING_KEYS.nearbyShownCount, String(count + 1));
  await setSetting(db, SETTING_KEYS.nearbyShownDate, today);
}

export async function getNearbyShownCount(): Promise<number> {
  const db = await getReadyDb();
  return Number(await getSetting(db, SETTING_KEYS.nearbyShownCount)) || 0;
}

export async function getLoginBonusState(): Promise<LoginBonusState> {
  const db = await getReadyDb();
  const lastClaimedDate = await getSetting(db, SETTING_KEYS.lastLoginDate);
  const streak = Number(await getSetting(db, SETTING_KEYS.streakDays)) || 0;
  const totalDays = Number(await getSetting(db, SETTING_KEYS.totalLoginDays)) || 0;
  return {
    lastClaimedDate: lastClaimedDate ?? undefined,
    streak,
    totalDays,
  };
}

export async function claimLoginBonusIfNeeded(): Promise<{ state: LoginBonusState; awarded: boolean }> {
  const db = await getReadyDb();
  const today = formatYmd(new Date());
  const current = await getLoginBonusState();
  if (current.lastClaimedDate === today) {
    return { state: current, awarded: false };
  }

  const yesterday = addDays(today, -1);
  const nextStreak = current.lastClaimedDate && current.lastClaimedDate === yesterday ? current.streak + 1 : 1;
  const nextTotal = current.totalDays + 1;
  const nextMax = Math.max(Number(await getSetting(db, SETTING_KEYS.maxStreakDays)) || 0, nextStreak);

  await setSetting(db, SETTING_KEYS.lastLoginDate, today);
  await setSetting(db, SETTING_KEYS.streakDays, String(nextStreak));
  await setSetting(db, SETTING_KEYS.totalLoginDays, String(nextTotal));
  await setSetting(db, SETTING_KEYS.maxStreakDays, String(nextMax));

  return {
    state: {
      lastClaimedDate: today,
      streak: nextStreak,
      totalDays: nextTotal,
    },
    awarded: true,
  };
}
