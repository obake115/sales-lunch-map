import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { SETTING_KEYS, STORAGE_KEYS } from './constants';
import { runMigrations } from './db/migrations';
import { deletePlace, getAllPlaces, getPlaceById, insertPlace, updatePlace } from './db/placesRepo';
import { getAllSettings, getSetting, setSetting } from './db/settingsRepo';
import { getDb } from './db/sqlite';
import { addDays, formatYmd } from './domain/date';
import { createId } from './id';
import type { AlbumPhoto, Memo, PrefecturePhoto, Store, TravelLunchEntry } from './models';
import { fireSyncDeleteMemo, fireSyncDeletePlace, fireSyncMemo, fireSyncPlace, fireSyncSetting, fireSyncTravelEntry } from './sync/syncHooks';
import { t } from './i18n';

type MemoRow = {
  id: string;
  storeId: string;
  text: string;
  checked: number;
  reminderAt: number | null;
  reminderNotificationId: string | null;
  createdAt: number;
};

type AlbumPhotoRow = {
  id: string;
  uri: string;
  storeId: string | null;
  createdAt: number;
  takenAt: number | null;
};

type PrefecturePhotoRow = {
  prefectureId: string;
  photoUri: string;
  updatedAt: number;
};

type TravelLunchEntryRow = {
  id: string;
  prefectureId: string;
  imageUri: string;
  restaurantName: string;
  genre: string;
  visitedAt: string;
  rating: number;
  memo: string | null;
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

const FREE_POST_LIMIT = 10;

function getReminderTitle(store: Store | null) {
  if (store?.name) {
    return t('storage.reminderTitleWithName', { name: store.name });
  }
  return t('storage.reminderTitleDefault');
}

function formatYmdJst(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

const rowToAlbumPhoto = (row: AlbumPhotoRow): AlbumPhoto => ({
  id: row.id,
  uri: row.uri,
  storeId: row.storeId ?? undefined,
  createdAt: row.createdAt,
  takenAt: typeof row.takenAt === 'number' ? row.takenAt : row.createdAt,
});

const rowToPrefecturePhoto = (row: PrefecturePhotoRow): PrefecturePhoto => ({
  prefectureId: row.prefectureId,
  photoUri: row.photoUri,
  updatedAt: row.updatedAt,
});

const rowToTravelLunchEntry = (row: TravelLunchEntryRow): TravelLunchEntry => ({
  id: row.id,
  prefectureId: row.prefectureId,
  imageUri: row.imageUri,
  restaurantName: row.restaurantName,
  genre: row.genre,
  visitedAt: row.visitedAt,
  rating: row.rating,
  memo: row.memo ?? undefined,
  createdAt: row.createdAt,
});

async function getReadyDb(): Promise<SQLiteDatabase> {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      const db = await getDb();
      await runMigrations(db);
      await migrateFromAsyncStorageIfNeeded(db);
      return db;
    })().catch((e) => {
      dbReadyPromise = null;
      throw e;
    });
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

async function getStoreCount(): Promise<number> {
  const db = await getReadyDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM places');
  return row?.count ?? 0;
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
  const currentCount = await getStoreCount();
  const limitState = await getPostLimitState(currentCount);
  if (!limitState.isUnlimited && currentCount >= limitState.freeLimit + limitState.extraSlotCount) {
    throw new Error(t('storage.postLimitReached'));
  }
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
  fireSyncPlace(store);
  return store;
}

/** Insert a store with a specific ID (used for data migration/download). Skips post limit check. */
export async function addStoreWithId(input: Store & { id: string }): Promise<void> {
  const store: Store = {
    ...input,
    enabled: input.enabled ?? true,
  };
  const db = await getReadyDb();
  await insertPlace(db, store);
}

export async function updateStore(
  storeId: string,
  patch: Partial<Omit<Store, 'id' | 'createdAt'>>
): Promise<Store | null> {
  const db = await getReadyDb();
  const updated = await updatePlace(db, storeId, patch);
  if (updated) fireSyncPlace(updated);
  return updated;
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
  fireSyncDeletePlace(storeId);
}

export async function getMemos(storeId: string): Promise<Memo[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<MemoRow>(
    'SELECT * FROM memos WHERE storeId = ? ORDER BY createdAt DESC',
    storeId
  );
  return rows.map(rowToMemo);
}

export async function getAlbumPhotos(): Promise<AlbumPhoto[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<AlbumPhotoRow>(
    'SELECT * FROM album_photos ORDER BY COALESCE(takenAt, createdAt) DESC, createdAt DESC'
  );
  return rows.map(rowToAlbumPhoto);
}

export async function addAlbumPhoto(
  uri: string,
  storeId?: string,
  takenAt?: number
): Promise<AlbumPhoto> {
  const db = await getReadyDb();
  const createdAt = Date.now();
  const safeTakenAt = typeof takenAt === 'number' ? takenAt : createdAt;
  const id = createId('photo');
  await db.runAsync(
    'INSERT INTO album_photos (id, uri, storeId, createdAt, takenAt) VALUES (?, ?, ?, ?, ?)',
    [id, uri, storeId ?? null, createdAt, safeTakenAt]
  );
  return { id, uri, storeId, createdAt, takenAt: safeTakenAt };
}

export async function deleteAlbumPhoto(photoId: string): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync('DELETE FROM album_photos WHERE id = ?', photoId);
}

export async function getPrefecturePhotos(): Promise<PrefecturePhoto[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<PrefecturePhotoRow>('SELECT * FROM prefecture_photos');
  return rows.map(rowToPrefecturePhoto);
}

export async function setPrefecturePhoto(prefectureId: string, photoUri: string): Promise<void> {
  const db = await getReadyDb();
  const updatedAt = Date.now();
  await db.runAsync(
    `INSERT INTO prefecture_photos (prefectureId, photoUri, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(prefectureId)
     DO UPDATE SET photoUri = excluded.photoUri, updatedAt = excluded.updatedAt`,
    [prefectureId, photoUri, updatedAt]
  );
}

export async function addTravelLunchEntry(input: {
  prefectureId: string;
  imageUri: string;
  restaurantName: string;
  genre: string;
  visitedAt: string;
  rating: number;
  memo?: string;
}): Promise<TravelLunchEntry> {
  const db = await getReadyDb();
  const createdAt = Date.now();
  const entry: TravelLunchEntry = {
    id: createId('travel'),
    prefectureId: input.prefectureId,
    imageUri: input.imageUri,
    restaurantName: input.restaurantName.trim(),
    genre: input.genre,
    visitedAt: input.visitedAt,
    rating: input.rating,
    memo: input.memo?.trim() || undefined,
    createdAt,
  };
  await db.runAsync(
    `INSERT INTO travel_lunch_entries
      (id, prefectureId, imageUri, restaurantName, genre, visitedAt, rating, memo, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.prefectureId,
      entry.imageUri,
      entry.restaurantName,
      entry.genre,
      entry.visitedAt,
      entry.rating,
      entry.memo ?? null,
      entry.createdAt,
    ]
  );
  fireSyncTravelEntry(entry);
  return entry;
}

/** Insert a travel entry with a specific ID (used for data migration/download). */
export async function addTravelLunchEntryWithId(entry: TravelLunchEntry): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync(
    `INSERT INTO travel_lunch_entries
      (id, prefectureId, imageUri, restaurantName, genre, visitedAt, rating, memo, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.prefectureId,
      entry.imageUri ?? '',
      entry.restaurantName,
      entry.genre,
      entry.visitedAt,
      entry.rating,
      entry.memo ?? null,
      entry.createdAt,
    ]
  );
}

export async function getTravelLunchEntries(): Promise<TravelLunchEntry[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<TravelLunchEntryRow>(
    'SELECT * FROM travel_lunch_entries ORDER BY createdAt DESC'
  );
  return rows.map(rowToTravelLunchEntry);
}

export async function deleteTravelLunchEntry(entryId: string): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync('DELETE FROM travel_lunch_entries WHERE id = ?', entryId);
}

export async function updateTravelLunchEntryImage(entryId: string, imageUri: string): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync('UPDATE travel_lunch_entries SET imageUri = ? WHERE id = ?', [imageUri, entryId]);
}

export async function getTravelLunchProgress(): Promise<number> {
  const db = await getReadyDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT prefectureId) as count FROM travel_lunch_entries'
  );
  return row?.count ?? 0;
}

export type PostLimitState = {
  isUnlimited: boolean;
  freeLimit: number;
  extraSlotCount: number;
  used: number;
  remaining: number;
  canWatchRewardAd: boolean;
  rewardedDate: string | null;
};

export async function getPostLimitState(usedCount?: number): Promise<PostLimitState> {
  const db = await getReadyDb();
  const purchased = (await getSetting(db, SETTING_KEYS.postLimitPurchased)) === '1';
  const used = typeof usedCount === 'number' ? usedCount : await getStoreCount();
  const today = formatYmdJst(new Date());
  const rewardedDate = await getSetting(db, SETTING_KEYS.postLimitRewardedDate);
  const extraSlotCount = Number(await getSetting(db, SETTING_KEYS.postLimitBonusSlots)) || 0;
  const canWatchRewardAd = rewardedDate !== today;
  const limit = FREE_POST_LIMIT + extraSlotCount;
  const remaining = purchased ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);
  return {
    isUnlimited: purchased,
    freeLimit: FREE_POST_LIMIT,
    extraSlotCount,
    used,
    remaining,
    canWatchRewardAd,
    rewardedDate: rewardedDate || null,
  };
}

export async function grantDailyRewardedSlot(): Promise<boolean> {
  const db = await getReadyDb();
  const purchased = (await getSetting(db, SETTING_KEYS.postLimitPurchased)) === '1';
  if (purchased) return false;
  const today = formatYmdJst(new Date());
  const rewardedDate = await getSetting(db, SETTING_KEYS.postLimitRewardedDate);
  if (rewardedDate === today) return false;
  const extraSlotCount = Number(await getSetting(db, SETTING_KEYS.postLimitBonusSlots)) || 0;
  await setSetting(db, SETTING_KEYS.postLimitBonusSlots, String(extraSlotCount + 1));
  await setSetting(db, SETTING_KEYS.postLimitRewardedDate, today);
  return true;
}

export async function setPostLimitPurchased(purchased: boolean): Promise<void> {
  const db = await getReadyDb();
  const val = purchased ? '1' : '0';
  await setSetting(db, SETTING_KEYS.postLimitPurchased, val);
  fireSyncSetting(SETTING_KEYS.postLimitPurchased, val);
}

export async function resetPostLimitState(): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.postLimitPurchased, '0');
  await setSetting(db, SETTING_KEYS.postLimitBonusSlots, '0');
  await setSetting(db, SETTING_KEYS.postLimitRewardedDate, '');
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
  fireSyncMemo(memo);
  return memo;
}

export async function updateMemoText(storeId: string, memoId: string, text: string) {
  const nextText = text.trim();
  if (!nextText) throw new Error(t('storage.memoEmpty'));

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
    const title = getReminderTitle(store);
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
    throw new Error(t('storage.invalidDate'));
  }
  if (when.getTime() < Date.now() + 5_000) {
    throw new Error(t('storage.futureDate'));
  }

  const store = await getStore(storeId);
  const title = getReminderTitle(store);
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
  fireSyncDeleteMemo(memoId);
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
    name: t('storage.sampleStoreName'),
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
  fireSyncSetting(SETTING_KEYS.nearbyRadiusM, String(next));
}

export async function getThemeMode(): Promise<ThemeMode> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.themeMode);
  return stored === 'navy' ? 'navy' : 'warm';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.themeMode, mode);
  fireSyncSetting(SETTING_KEYS.themeMode, mode);
}

export async function getProfileName(): Promise<string> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.profileName);
  return stored?.trim() ? stored.trim() : 'T.K.';
}

export async function setProfileName(name: string): Promise<void> {
  const db = await getReadyDb();
  const trimmed = name.trim();
  await setSetting(db, SETTING_KEYS.profileName, trimmed);
  fireSyncSetting(SETTING_KEYS.profileName, trimmed);
}

export async function getTravelEntryCountByPrefecture(prefId: string): Promise<number> {
  const db = await getReadyDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM travel_lunch_entries WHERE prefectureId = ?',
    prefId
  );
  return row?.count ?? 0;
}

export async function isPremiumUser(): Promise<boolean> {
  const db = await getReadyDb();
  return (await getSetting(db, SETTING_KEYS.postLimitPurchased)) === '1';
}

export async function getLastPaywallShownAt(): Promise<string | null> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.lastPaywallShownAt);
  return stored || null;
}

export async function setLastPaywallShownAt(date: string): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.lastPaywallShownAt, date);
}

export async function getHasSeenOnboarding(): Promise<boolean> {
  const db = await getReadyDb();
  return (await getSetting(db, SETTING_KEYS.hasSeenOnboarding)) === '1';
}

export async function setHasSeenOnboarding(value: boolean): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.hasSeenOnboarding, value ? '1' : '0');
}

export async function getHasSeenWelcome(): Promise<boolean> {
  const db = await getReadyDb();
  return (await getSetting(db, SETTING_KEYS.hasSeenWelcome)) === '1';
}

export async function setHasSeenWelcome(value: boolean): Promise<void> {
  const db = await getReadyDb();
  await setSetting(db, SETTING_KEYS.hasSeenWelcome, value ? '1' : '0');
}

export async function getProfileAvatarUri(): Promise<string | null> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.profileAvatarUri);
  return stored ? stored : null;
}

export async function setProfileAvatarUri(uri: string | null): Promise<void> {
  const db = await getReadyDb();
  if (!uri) {
    await setSetting(db, SETTING_KEYS.profileAvatarUri, '');
    return;
  }
  await setSetting(db, SETTING_KEYS.profileAvatarUri, uri);
}

export async function getSelectedBadgeId(): Promise<string | null> {
  const db = await getReadyDb();
  const stored = await getSetting(db, SETTING_KEYS.selectedBadgeId);
  return stored ? stored : null;
}

export async function setSelectedBadgeId(id: string | null): Promise<void> {
  const db = await getReadyDb();
  const val = id ?? '';
  await setSetting(db, SETTING_KEYS.selectedBadgeId, val);
  fireSyncSetting(SETTING_KEYS.selectedBadgeId, val);
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

export async function getAllSettingsRaw(): Promise<Record<string, string>> {
  const db = await getReadyDb();
  return getAllSettings(db);
}

export async function getAllMemos(): Promise<Memo[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<MemoRow>('SELECT * FROM memos ORDER BY createdAt DESC');
  return rows.map(rowToMemo);
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync('DELETE FROM places');
  await db.runAsync('DELETE FROM memos');
  await db.runAsync('DELETE FROM travel_lunch_entries');
  await db.runAsync('DELETE FROM album_photos');
  await db.runAsync('DELETE FROM prefecture_photos');
  await db.runAsync('DELETE FROM settings');
}

export { getStoreCount };
