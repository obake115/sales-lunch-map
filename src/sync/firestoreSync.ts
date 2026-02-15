import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { firebaseDb } from '../firebase';
import type { Memo, Store, TravelLunchEntry } from '../models';

// --- Data conversion (strip local-only fields) ---

function storeToFirestore(store: Store) {
  return {
    id: store.id,
    name: store.name,
    placeId: store.placeId ?? null,
    latitude: store.latitude,
    longitude: store.longitude,
    enabled: store.enabled,
    note: store.note ?? null,
    timeBand: store.timeBand ?? null,
    moodTags: store.moodTags ?? null,
    sceneTags: store.sceneTags ?? null,
    parking: store.parking ?? null,
    smoking: store.smoking ?? null,
    seating: store.seating ?? null,
    isFavorite: store.isFavorite ?? false,
    shareToEveryone: store.shareToEveryone ?? false,
    remindEnabled: store.remindEnabled ?? false,
    remindRadiusM: store.remindRadiusM ?? null,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function memoToFirestore(memo: Memo) {
  return {
    id: memo.id,
    storeId: memo.storeId,
    text: memo.text,
    checked: memo.checked,
    createdAt: memo.createdAt,
  };
}

function travelEntryToFirestore(entry: TravelLunchEntry) {
  return {
    id: entry.id,
    prefectureId: entry.prefectureId,
    restaurantName: entry.restaurantName,
    genre: entry.genre,
    visitedAt: entry.visitedAt,
    rating: entry.rating,
    memo: entry.memo ?? null,
    createdAt: entry.createdAt,
  };
}

async function getStorage() {
  return import('../storage');
}

// --- Check if cloud data exists ---

export async function checkCloudDataExists(uid: string): Promise<boolean> {
  const placesSnap = await getDocs(collection(firebaseDb, 'users', uid, 'places'));
  return !placesSnap.empty;
}

// --- Get cloud data counts ---

export async function getCloudDataCounts(uid: string): Promise<{ places: number; memos: number; travelEntries: number }> {
  const [placesSnap, memosSnap, travelSnap] = await Promise.all([
    getDocs(collection(firebaseDb, 'users', uid, 'places')),
    getDocs(collection(firebaseDb, 'users', uid, 'memos')),
    getDocs(collection(firebaseDb, 'users', uid, 'travelEntries')),
  ]);
  return {
    places: placesSnap.size,
    memos: memosSnap.size,
    travelEntries: travelSnap.size,
  };
}

// --- Delete all cloud data ---

export async function deleteAllCloudData(uid: string): Promise<void> {
  const collections = ['places', 'memos', 'travelEntries'];
  for (const col of collections) {
    const snap = await getDocs(collection(firebaseDb, 'users', uid, col));
    for (const d of snap.docs) {
      await deleteDoc(doc(firebaseDb, 'users', uid, col, d.id));
    }
  }
  // Delete settings document
  try {
    await deleteDoc(doc(firebaseDb, 'users', uid, 'data', 'settings'));
  } catch {
    // settings doc may not exist
  }
}

// --- Upload all local data to Firestore ---

export async function uploadAllData(uid: string): Promise<void> {
  const storage = await getStorage();
  const [stores, memos, entries, settings] = await Promise.all([
    storage.getStores(),
    storage.getAllMemos(),
    storage.getTravelLunchEntries(),
    storage.getAllSettingsRaw(),
  ]);

  // Upload settings
  await setDoc(doc(firebaseDb, 'users', uid, 'data', 'settings'), settings);

  // Upload stores
  for (const store of stores) {
    await setDoc(
      doc(firebaseDb, 'users', uid, 'places', store.id),
      storeToFirestore(store)
    );
  }

  // Upload memos
  for (const memo of memos) {
    await setDoc(
      doc(firebaseDb, 'users', uid, 'memos', memo.id),
      memoToFirestore(memo)
    );
  }

  // Upload travel entries
  for (const entry of entries) {
    await setDoc(
      doc(firebaseDb, 'users', uid, 'travelEntries', entry.id),
      travelEntryToFirestore(entry)
    );
  }
}

// --- Download all data from Firestore to local ---

export async function downloadAllData(uid: string): Promise<void> {
  // 1. Download all cloud data first (before touching local data)
  const [settingsDoc, placesSnap, memosSnap, travelSnap] = await Promise.all([
    getDoc(doc(firebaseDb, 'users', uid, 'data', 'settings')),
    getDocs(collection(firebaseDb, 'users', uid, 'places')),
    getDocs(collection(firebaseDb, 'users', uid, 'memos')),
    getDocs(collection(firebaseDb, 'users', uid, 'travelEntries')),
  ]);

  // 2. All downloads succeeded — now safe to clear local data and write
  const storage = await getStorage();
  await storage.clearAllLocalData();

  // Restore settings
  if (settingsDoc.exists()) {
    const data = settingsDoc.data() as Record<string, string>;
    if (data.themeMode) await storage.setThemeMode(data.themeMode as import('../storage').ThemeMode);
    if (data.nearbyRadiusM) await storage.setNearbyRadiusM(Number(data.nearbyRadiusM) || 300);
    if (data.postLimitPurchased === '1') await storage.setPostLimitPurchased(true);
    if (data.profileName) await storage.setProfileName(data.profileName);
    if (data.profileAvatarUri) await storage.setProfileAvatarUri(data.profileAvatarUri);
    if (data.selectedBadgeId) await storage.setSelectedBadgeId(data.selectedBadgeId);
  }

  // Restore stores (preserve original IDs so memo storeId references stay valid)
  for (const d of placesSnap.docs) {
    const s = d.data();
    await storage.addStoreWithId({
      id: s.id ?? d.id,
      name: s.name ?? '',
      placeId: s.placeId ?? undefined,
      latitude: s.latitude,
      longitude: s.longitude,
      enabled: s.enabled ?? true,
      note: s.note ?? undefined,
      timeBand: s.timeBand ?? undefined,
      moodTags: s.moodTags ?? undefined,
      sceneTags: s.sceneTags ?? undefined,
      parking: s.parking ?? undefined,
      smoking: s.smoking ?? undefined,
      seating: s.seating ?? undefined,
      isFavorite: s.isFavorite ?? false,
      shareToEveryone: s.shareToEveryone ?? false,
      remindEnabled: s.remindEnabled ?? false,
      remindRadiusM: s.remindRadiusM ?? undefined,
      createdAt: s.createdAt ?? Date.now(),
      updatedAt: s.updatedAt ?? Date.now(),
    });
  }

  // Restore memos
  for (const d of memosSnap.docs) {
    const m = d.data();
    if (m.storeId && m.text) {
      await storage.addMemo(m.storeId, m.text);
    }
  }

  // Restore travel entries (preserve original IDs)
  for (const d of travelSnap.docs) {
    const e = d.data();
    await storage.addTravelLunchEntryWithId({
      id: e.id ?? d.id,
      prefectureId: e.prefectureId,
      imageUri: '',
      restaurantName: e.restaurantName,
      genre: e.genre,
      visitedAt: e.visitedAt,
      rating: e.rating,
      memo: e.memo ?? undefined,
      createdAt: e.createdAt ?? Date.now(),
    });
  }
}

// --- Single-item sync helpers ---

export async function syncPlaceToCloud(uid: string, store: Store): Promise<void> {
  await setDoc(
    doc(firebaseDb, 'users', uid, 'places', store.id),
    storeToFirestore(store)
  );
}

export async function syncDeletePlaceFromCloud(uid: string, storeId: string): Promise<void> {
  await deleteDoc(doc(firebaseDb, 'users', uid, 'places', storeId));
}

export async function syncMemoToCloud(uid: string, memo: Memo): Promise<void> {
  await setDoc(
    doc(firebaseDb, 'users', uid, 'memos', memo.id),
    memoToFirestore(memo)
  );
}

export async function syncDeleteMemoFromCloud(uid: string, memoId: string): Promise<void> {
  await deleteDoc(doc(firebaseDb, 'users', uid, 'memos', memoId));
}

export async function syncTravelEntryToCloud(uid: string, entry: TravelLunchEntry): Promise<void> {
  await setDoc(
    doc(firebaseDb, 'users', uid, 'travelEntries', entry.id),
    travelEntryToFirestore(entry)
  );
}

export async function syncSettingToCloud(uid: string, key: string, value: string): Promise<void> {
  try {
    await updateDoc(doc(firebaseDb, 'users', uid, 'data', 'settings'), { [key]: value });
  } catch {
    await setDoc(doc(firebaseDb, 'users', uid, 'data', 'settings'), { [key]: value }, { merge: true });
  }
}
