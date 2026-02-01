import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Memo, Store } from './models';
import { STORAGE_KEYS } from './constants';
import { createId } from './id';

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getStores(): Promise<Store[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.stores);
  return safeJsonParse<Store[]>(raw) ?? [];
}

export async function setStores(stores: Store[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.stores, JSON.stringify(stores));
}

export async function getStore(storeId: string): Promise<Store | null> {
  const stores = await getStores();
  return stores.find((s) => s.id === storeId) ?? null;
}

export async function addStore(input: {
  name: string;
  latitude: number;
  longitude: number;
}): Promise<Store> {
  const now = Date.now();
  const store: Store = {
    id: createId('store'),
    name: input.name.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const stores = await getStores();
  stores.unshift(store);
  await setStores(stores);
  return store;
}

export async function updateStore(
  storeId: string,
  patch: Partial<Omit<Store, 'id' | 'createdAt'>>
): Promise<Store | null> {
  const stores = await getStores();
  const idx = stores.findIndex((s) => s.id === storeId);
  if (idx === -1) return null;

  const updated: Store = {
    ...stores[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  stores[idx] = updated;
  await setStores(stores);
  return updated;
}

export async function setStoreEnabled(storeId: string, enabled: boolean) {
  return updateStore(storeId, { enabled });
}

export async function setStoreLastNotifiedAt(storeId: string, at: number) {
  return updateStore(storeId, { lastNotifiedAt: at });
}

export async function deleteStore(storeId: string): Promise<void> {
  const stores = await getStores();
  await setStores(stores.filter((s) => s.id !== storeId));
  await AsyncStorage.removeItem(STORAGE_KEYS.memos(storeId));
}

export async function getMemos(storeId: string): Promise<Memo[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.memos(storeId));
  const parsed = safeJsonParse<any[]>(raw) ?? [];
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((m) => {
      const memo: Memo = {
        id: typeof m?.id === 'string' ? m.id : createId('memo'),
        storeId,
        text: typeof m?.text === 'string' ? m.text : '',
        checked: typeof m?.checked === 'boolean' ? m.checked : false,
        createdAt: typeof m?.createdAt === 'number' ? m.createdAt : Date.now(),
        reminderAt: typeof m?.reminderAt === 'number' ? m.reminderAt : undefined,
        reminderNotificationId:
          typeof m?.reminderNotificationId === 'string' ? m.reminderNotificationId : undefined,
      };
      return memo;
    })
    .filter((m) => m.text.trim().length > 0);
}

async function setMemos(storeId: string, memos: Memo[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.memos(storeId), JSON.stringify(memos));
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
  const memos = await getMemos(storeId);
  memos.unshift(memo);
  await setMemos(storeId, memos);
  return memo;
}

async function cancelScheduledIfNeeded(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

export async function setMemoReminder(storeId: string, memoId: string, reminderAt: number | null) {
  const memos = await getMemos(storeId);
  const idx = memos.findIndex((m) => m.id === memoId);
  if (idx === -1) return null;

  const current = memos[idx];
  // Always cancel previous schedule first (safe).
  await cancelScheduledIfNeeded(current.reminderNotificationId);

  if (!reminderAt) {
    memos[idx] = { ...current, reminderAt: undefined, reminderNotificationId: undefined };
    await setMemos(storeId, memos);
    return memos[idx];
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

  memos[idx] = { ...current, reminderAt: when.getTime(), reminderNotificationId: newId };
  await setMemos(storeId, memos);
  return memos[idx];
}

export async function updateMemoText(storeId: string, memoId: string, text: string) {
  const nextText = text.trim();
  if (!nextText) throw new Error('メモが空です');

  const memos = await getMemos(storeId);
  const idx = memos.findIndex((m) => m.id === memoId);
  if (idx === -1) return null;

  const current = memos[idx];
  if (current.text === nextText) return current;

  // If there is a scheduled reminder in the future, recreate it so the body/title reflects new text.
  const hasFutureReminder =
    !!current.reminderAt && current.reminderAt > Date.now() + 5_000 && !!current.reminderNotificationId && !current.checked;

  if (hasFutureReminder) {
    await cancelScheduledIfNeeded(current.reminderNotificationId);
  }

  const updated: Memo = { ...current, text: nextText };

  if (hasFutureReminder) {
    const store = await getStore(storeId);
    const title = store ? `${store.name}のリマインド` : '買い物メモのリマインド';
    const when = new Date(current.reminderAt as number);
    const newId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: nextText,
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
    updated.reminderNotificationId = newId;
  }

  memos[idx] = updated;
  await setMemos(storeId, memos);
  return updated;
}

export async function clearCheckedMemos(storeId: string) {
  const memos = await getMemos(storeId);
  const checked = memos.filter((m) => m.checked);
  // Safety: cancel any scheduled reminders (should normally be none).
  for (const m of checked) {
    // eslint-disable-next-line no-await-in-loop
    await cancelScheduledIfNeeded(m.reminderNotificationId);
  }
  await setMemos(
    storeId,
    memos.filter((m) => !m.checked)
  );
}

export type ReminderListItem = {
  storeId: string;
  storeName: string;
  memoId: string;
  text: string;
  reminderAt: number;
};

export async function getAllActiveReminders(): Promise<ReminderListItem[]> {
  const stores = await getStores();
  const lists = await Promise.all(
    stores.map(async (s) => {
      const memos = await getMemos(s.id);
      return memos
        .filter((m) => !m.checked && typeof m.reminderAt === 'number' && m.reminderAt > Date.now() - 60_000)
        .map((m) => ({
          storeId: s.id,
          storeName: s.name,
          memoId: m.id,
          text: m.text,
          reminderAt: m.reminderAt as number,
        }));
    })
  );
  return lists.flat().sort((a, b) => a.reminderAt - b.reminderAt);
}

export async function toggleMemoChecked(storeId: string, memoId: string) {
  const memos = await getMemos(storeId);
  const idx = memos.findIndex((m) => m.id === memoId);
  if (idx === -1) return null;
  const nextChecked = !memos[idx].checked;
  if (nextChecked) {
    // If marking done, cancel any reminder.
    await cancelScheduledIfNeeded(memos[idx].reminderNotificationId);
    memos[idx] = { ...memos[idx], checked: true, reminderAt: undefined, reminderNotificationId: undefined };
  } else {
    memos[idx] = { ...memos[idx], checked: false };
  }
  await setMemos(storeId, memos);
  return memos[idx];
}

export async function deleteMemo(storeId: string, memoId: string) {
  const memos = await getMemos(storeId);
  const target = memos.find((m) => m.id === memoId);
  await cancelScheduledIfNeeded(target?.reminderNotificationId);
  await setMemos(
    storeId,
    memos.filter((m) => m.id !== memoId)
  );
}
