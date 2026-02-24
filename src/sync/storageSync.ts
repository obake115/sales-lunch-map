import { File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { doc, getDocs, collection, updateDoc, setDoc } from 'firebase/firestore';

import { firebaseDb, firebaseStorage } from '../firebase';
import type { AlbumPhoto, Store, TravelLunchEntry } from '../models';

// --- Types ---

export type PhotoSyncProgress = {
  phase: 'uploading' | 'downloading';
  current: number;
  total: number;
  label?: string;
};

export type ProgressCallback = (p: PhotoSyncProgress) => void;

// --- Helpers ---

async function compressForUpload(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

function localFileExists(uri: string): boolean {
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
}

async function uploadImage(uid: string, path: string, localUri: string): Promise<string> {
  const compressed = await compressForUpload(localUri);
  const response = await fetch(compressed);
  const blob = await response.blob();
  const storageRef = ref(firebaseStorage, `users/${uid}/${path}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

async function downloadImage(url: string, fileName: string): Promise<string> {
  const destination = new File(Paths.document, fileName);
  const downloaded = await File.downloadFileAsync(url, destination);
  return downloaded.uri;
}

// --- Single-item uploads (incremental sync) ---

export async function uploadStorePhotos(uid: string, store: Store): Promise<void> {
  // Upload main photo
  if (store.photoUri && localFileExists(store.photoUri)) {
    try {
      const url = await uploadImage(uid, `places/${store.id}/photo_0.jpg`, store.photoUri);
      await updateDoc(doc(firebaseDb, 'users', uid, 'places', store.id), { photoUrl: url });
    } catch (e) {
      console.error(`Failed to upload store photo for ${store.id}:`, e);
    }
  }

  // Upload additional photos
  if (store.photoUris?.length) {
    const urls: string[] = [];
    for (let i = 0; i < store.photoUris.length; i++) {
      const uri = store.photoUris[i]!;
      if (!localFileExists(uri)) {
        urls.push('');
        continue;
      }
      try {
        const url = await uploadImage(uid, `places/${store.id}/photo_${i + 1}.jpg`, uri);
        urls.push(url);
      } catch (e) {
        console.error(`Failed to upload store photo ${i} for ${store.id}:`, e);
        urls.push('');
      }
    }
    const validUrls = urls.filter(Boolean);
    if (validUrls.length > 0) {
      await updateDoc(doc(firebaseDb, 'users', uid, 'places', store.id), { photoUrls: validUrls });
    }
  }
}

export async function uploadAlbumPhoto(uid: string, photo: AlbumPhoto): Promise<void> {
  if (!localFileExists(photo.uri)) return;
  try {
    const url = await uploadImage(uid, `album/${photo.id}.jpg`, photo.uri);
    await setDoc(doc(firebaseDb, 'users', uid, 'albumPhotos', photo.id), {
      id: photo.id,
      downloadUrl: url,
      storeId: photo.storeId ?? null,
      createdAt: photo.createdAt,
      takenAt: photo.takenAt,
    });
  } catch (e) {
    console.error(`Failed to upload album photo ${photo.id}:`, e);
  }
}

export async function uploadPrefecturePhoto(uid: string, prefId: string, photoUri: string): Promise<void> {
  if (!localFileExists(photoUri)) return;
  try {
    const url = await uploadImage(uid, `prefectures/${prefId}.jpg`, photoUri);
    await setDoc(doc(firebaseDb, 'users', uid, 'prefecturePhotos', prefId), {
      prefectureId: prefId,
      downloadUrl: url,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error(`Failed to upload prefecture photo ${prefId}:`, e);
  }
}

export async function uploadTravelEntryPhoto(uid: string, entry: TravelLunchEntry): Promise<void> {
  if (!entry.imageUri || !localFileExists(entry.imageUri)) return;
  try {
    const url = await uploadImage(uid, `travel/${entry.id}.jpg`, entry.imageUri);
    await updateDoc(doc(firebaseDb, 'users', uid, 'travelEntries', entry.id), { imageUrl: url });
  } catch (e) {
    console.error(`Failed to upload travel entry photo ${entry.id}:`, e);
  }
}

// --- Batch uploads ---

export async function uploadAllPhotos(uid: string, onProgress?: ProgressCallback): Promise<number> {
  const storage = await import('../storage');
  const [stores, albumPhotos, prefecturePhotos, travelEntries] = await Promise.all([
    storage.getStores(),
    storage.getAlbumPhotos(),
    storage.getPrefecturePhotos(),
    storage.getTravelLunchEntries(),
  ]);

  // Count total photos to upload
  let total = 0;
  for (const s of stores) {
    if (s.photoUri) total++;
    if (s.photoUris?.length) total += s.photoUris.length;
  }
  total += albumPhotos.length;
  total += prefecturePhotos.length;
  total += travelEntries.filter((e) => !!e.imageUri).length;

  if (total === 0) return 0;

  let current = 0;
  let failCount = 0;

  const advance = () => {
    current++;
    onProgress?.({ phase: 'uploading', current, total });
  };

  // Store photos
  for (const store of stores) {
    if (store.photoUri) {
      if (localFileExists(store.photoUri)) {
        try {
          const url = await uploadImage(uid, `places/${store.id}/photo_0.jpg`, store.photoUri);
          await updateDoc(doc(firebaseDb, 'users', uid, 'places', store.id), { photoUrl: url });
        } catch (e) {
          console.error(`Failed to upload store photo for ${store.id}:`, e);
          failCount++;
        }
      }
      advance();
    }
    if (store.photoUris?.length) {
      const urls: string[] = [];
      for (let i = 0; i < store.photoUris.length; i++) {
        const uri = store.photoUris[i]!;
        if (localFileExists(uri)) {
          try {
            const url = await uploadImage(uid, `places/${store.id}/photo_${i + 1}.jpg`, uri);
            urls.push(url);
          } catch (e) {
            console.error(`Failed to upload store photo ${i} for ${store.id}:`, e);
            urls.push('');
            failCount++;
          }
        }
        advance();
      }
      const validUrls = urls.filter(Boolean);
      if (validUrls.length > 0) {
        try {
          await updateDoc(doc(firebaseDb, 'users', uid, 'places', store.id), { photoUrls: validUrls });
        } catch {
          // doc may not exist yet, ignore
        }
      }
    }
  }

  // Album photos
  for (const photo of albumPhotos) {
    if (localFileExists(photo.uri)) {
      try {
        const url = await uploadImage(uid, `album/${photo.id}.jpg`, photo.uri);
        await setDoc(doc(firebaseDb, 'users', uid, 'albumPhotos', photo.id), {
          id: photo.id,
          downloadUrl: url,
          storeId: photo.storeId ?? null,
          createdAt: photo.createdAt,
          takenAt: photo.takenAt,
        });
      } catch (e) {
        console.error(`Failed to upload album photo ${photo.id}:`, e);
        failCount++;
      }
    }
    advance();
  }

  // Prefecture photos
  for (const pp of prefecturePhotos) {
    if (localFileExists(pp.photoUri)) {
      try {
        const url = await uploadImage(uid, `prefectures/${pp.prefectureId}.jpg`, pp.photoUri);
        await setDoc(doc(firebaseDb, 'users', uid, 'prefecturePhotos', pp.prefectureId), {
          prefectureId: pp.prefectureId,
          downloadUrl: url,
          updatedAt: pp.updatedAt,
        });
      } catch (e) {
        console.error(`Failed to upload prefecture photo ${pp.prefectureId}:`, e);
        failCount++;
      }
    }
    advance();
  }

  // Travel entry photos
  for (const entry of travelEntries) {
    if (entry.imageUri && localFileExists(entry.imageUri)) {
      try {
        const url = await uploadImage(uid, `travel/${entry.id}.jpg`, entry.imageUri);
        await updateDoc(doc(firebaseDb, 'users', uid, 'travelEntries', entry.id), { imageUrl: url });
      } catch (e) {
        console.error(`Failed to upload travel photo ${entry.id}:`, e);
        failCount++;
      }
    }
    advance();
  }

  return failCount;
}

// --- Batch downloads ---

export async function downloadAllPhotos(uid: string, onProgress?: ProgressCallback): Promise<number> {
  const storage = await import('../storage');

  // Fetch cloud data for photo URLs
  const [placesSnap, albumSnap, prefSnap, travelSnap] = await Promise.all([
    getDocs(collection(firebaseDb, 'users', uid, 'places')),
    getDocs(collection(firebaseDb, 'users', uid, 'albumPhotos')),
    getDocs(collection(firebaseDb, 'users', uid, 'prefecturePhotos')),
    getDocs(collection(firebaseDb, 'users', uid, 'travelEntries')),
  ]);

  // Count total
  let total = 0;
  for (const d of placesSnap.docs) {
    const data = d.data();
    if (data.photoUrl) total++;
    if (data.photoUrls?.length) total += (data.photoUrls as string[]).length;
  }
  total += albumSnap.size;
  total += prefSnap.size;
  for (const d of travelSnap.docs) {
    if (d.data().imageUrl) total++;
  }

  if (total === 0) return 0;

  let current = 0;
  let failCount = 0;

  const advance = () => {
    current++;
    onProgress?.({ phase: 'downloading', current, total });
  };

  // Download store photos
  for (const d of placesSnap.docs) {
    const data = d.data();
    const storeId = data.id ?? d.id;

    if (data.photoUrl) {
      try {
        const localUri = await downloadImage(data.photoUrl as string, `places_${storeId}_photo_0.jpg`);
        await storage.updateStore(storeId, { photoUri: localUri });
      } catch (e) {
        console.error(`Failed to download store photo for ${storeId}:`, e);
        failCount++;
      }
      advance();
    }

    if (data.photoUrls?.length) {
      const localUris: string[] = [];
      for (let i = 0; i < (data.photoUrls as string[]).length; i++) {
        const url = (data.photoUrls as string[])[i]!;
        try {
          const localUri = await downloadImage(url, `places_${storeId}_photo_${i + 1}.jpg`);
          localUris.push(localUri);
        } catch (e) {
          console.error(`Failed to download store photo ${i} for ${storeId}:`, e);
          failCount++;
        }
        advance();
      }
      if (localUris.length > 0) {
        await storage.updateStore(storeId, { photoUris: localUris });
      }
    }
  }

  // Download album photos
  for (const d of albumSnap.docs) {
    const data = d.data();
    if (data.downloadUrl) {
      try {
        const localUri = await downloadImage(data.downloadUrl as string, `album_${data.id ?? d.id}.jpg`);
        await storage.addAlbumPhoto(localUri, data.storeId ?? undefined, data.takenAt ?? data.createdAt);
      } catch (e) {
        console.error(`Failed to download album photo ${d.id}:`, e);
        failCount++;
      }
    }
    advance();
  }

  // Download prefecture photos
  for (const d of prefSnap.docs) {
    const data = d.data();
    if (data.downloadUrl) {
      try {
        const localUri = await downloadImage(data.downloadUrl as string, `pref_${data.prefectureId ?? d.id}.jpg`);
        await storage.setPrefecturePhoto(data.prefectureId ?? d.id, localUri);
      } catch (e) {
        console.error(`Failed to download prefecture photo ${d.id}:`, e);
        failCount++;
      }
    }
    advance();
  }

  // Download travel entry photos
  for (const d of travelSnap.docs) {
    const data = d.data();
    if (data.imageUrl) {
      try {
        const entryId = data.id ?? d.id;
        const localUri = await downloadImage(data.imageUrl as string, `travel_${entryId}.jpg`);
        await storage.updateTravelLunchEntryImage(entryId, localUri);
      } catch (e) {
        console.error(`Failed to download travel photo ${d.id}:`, e);
        failCount++;
      }
      advance();
    }
  }

  return failCount;
}

// --- Delete all user storage ---

export async function deleteAllUserStorage(uid: string): Promise<void> {
  const userRef = ref(firebaseStorage, `users/${uid}`);
  try {
    const result = await listAll(userRef);
    for (const itemRef of result.items) {
      await deleteObject(itemRef);
    }
    // Recursively delete prefixes
    for (const prefixRef of result.prefixes) {
      const subResult = await listAll(prefixRef);
      for (const itemRef of subResult.items) {
        await deleteObject(itemRef);
      }
    }
  } catch (e) {
    console.error('Failed to delete user storage:', e);
  }
}
