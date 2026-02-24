import { firebaseAuth } from '../firebase';
import type { AlbumPhoto, Memo, Store, TravelLunchEntry } from '../models';

function getLoggedInUid(): string | null {
  const user = firebaseAuth.currentUser;
  if (!user || user.isAnonymous) return null;
  return user.uid;
}

async function getSync() {
  return import('./firestoreSync');
}

async function getStorageSync() {
  return import('./storageSync');
}

export function fireSyncPlace(store: Store) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncPlaceToCloud(uid, store)).catch(() => {});
}

export function fireSyncDeletePlace(storeId: string) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncDeletePlaceFromCloud(uid, storeId)).catch(() => {});
}

export function fireSyncMemo(memo: Memo) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncMemoToCloud(uid, memo)).catch(() => {});
}

export function fireSyncDeleteMemo(memoId: string) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncDeleteMemoFromCloud(uid, memoId)).catch(() => {});
}

export function fireSyncTravelEntry(entry: TravelLunchEntry) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncTravelEntryToCloud(uid, entry)).catch(() => {});
}

export function fireSyncSetting(key: string, value: string) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncSettingToCloud(uid, key, value)).catch(() => {});
}

export function fireSyncPlacePhotos(store: Store) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getStorageSync().then((m) => m.uploadStorePhotos(uid, store)).catch(() => {});
}

export function fireSyncAlbumPhoto(photo: AlbumPhoto) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getStorageSync().then((m) => m.uploadAlbumPhoto(uid, photo)).catch(() => {});
}

export function fireSyncDeleteAlbumPhoto(photoId: string) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getSync().then((m) => m.syncDeleteAlbumPhotoFromCloud(uid, photoId)).catch(() => {});
}

export function fireSyncPrefecturePhoto(prefId: string, photoUri: string) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getStorageSync().then((m) => m.uploadPrefecturePhoto(uid, prefId, photoUri)).catch(() => {});
}

export function fireSyncTravelEntryPhoto(entry: TravelLunchEntry) {
  const uid = getLoggedInUid();
  if (!uid) return;
  getStorageSync().then((m) => m.uploadTravelEntryPhoto(uid, entry)).catch(() => {});
}
