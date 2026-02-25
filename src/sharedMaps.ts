import type { Unsubscribe } from 'firebase/firestore';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import { t } from './i18n';

export type SharedMap = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  memberIds: string[];
  isReadOnly?: boolean;
  createdAt?: number;
};

export type SharedStore = {
  id: string;
  name: string;
  placeId?: string;
  latitude: number;
  longitude: number;
  memo?: string;
  tag?: 'favorite' | 'want' | 'again';
  createdBy: string;
  createdAt?: number;
};

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function uniqueCode() {
  // Best-effort uniqueness with a few retries.
  for (let i = 0; i < 5; i += 1) {
    const code = randomCode();
    const q = query(collection(firebaseDb, 'maps'), where('code', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }
  return randomCode(8);
}

export function listenMyMaps(userId: string, onChange: (maps: SharedMap[]) => void): Unsubscribe {
  const q = query(collection(firebaseDb, 'maps'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, (snap) => {
    const maps = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data?.name ?? t('sharedMaps.untitled'),
        code: data?.code ?? '',
        ownerId: data?.ownerId ?? '',
        memberIds: Array.isArray(data?.memberIds) ? data.memberIds : [],
        createdAt: data?.createdAt?.toMillis?.() ?? undefined,
      } as SharedMap;
    });
    maps.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    onChange(maps);
  }, (error) => {
    console.warn('listenMyMaps error:', error);
  });
}

export async function createMap(userId: string, name: string): Promise<string> {
  const code = await uniqueCode();
  const docRef = await addDoc(collection(firebaseDb, 'maps'), {
    name: name.trim() || t('sharedMaps.untitled'),
    code,
    ownerId: userId,
    memberIds: [userId],
    isReadOnly: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function joinMap(userId: string, code: string): Promise<string> {
  const q = query(collection(firebaseDb, 'maps'), where('code', '==', code.trim().toUpperCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error(t('sharedMaps.codeNotFound'));
  const docSnap = snap.docs[0]!;
  await updateDoc(docSnap.ref, { memberIds: arrayUnion(userId) });
  return docSnap.id;
}

export function listenMap(mapId: string, onChange: (map: SharedMap | null) => void): Unsubscribe {
  const ref = doc(firebaseDb, 'maps', mapId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data() as any;
    onChange({
      id: snap.id,
      name: data?.name ?? t('sharedMaps.untitled'),
      code: data?.code ?? '',
      ownerId: data?.ownerId ?? '',
      memberIds: Array.isArray(data?.memberIds) ? data.memberIds : [],
      isReadOnly: !!data?.isReadOnly,
      createdAt: data?.createdAt?.toMillis?.() ?? undefined,
    });
  }, (error) => {
    console.warn('listenMap error:', error);
  });
}

export function listenMapStores(mapId: string, onChange: (stores: SharedStore[]) => void): Unsubscribe {
  const q = query(collection(firebaseDb, 'maps', mapId, 'stores'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const stores = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data?.name ?? '',
        placeId: data?.placeId ?? undefined,
        latitude: data?.latitude ?? 0,
        longitude: data?.longitude ?? 0,
        memo: data?.memo ?? undefined,
        tag: data?.tag ?? undefined,
        createdBy: data?.createdBy ?? '',
        createdAt: data?.createdAt?.toMillis?.() ?? undefined,
      } as SharedStore;
    });
    onChange(stores);
  }, (error) => {
    console.warn('listenMapStores error:', error);
  });
}

export async function addMapStore(
  mapId: string,
  input: {
    name: string;
    placeId?: string;
    latitude: number;
    longitude: number;
    memo?: string;
    tag?: 'favorite' | 'want' | 'again';
    createdBy: string;
  }
) {
  const data: Record<string, any> = {
    name: input.name.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    tag: input.tag ?? null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };
  const placeId = input.placeId?.trim();
  if (placeId) data.placeId = placeId;
  const memo = input.memo?.trim();
  if (memo) data.memo = memo;
  await addDoc(collection(firebaseDb, 'maps', mapId, 'stores'), data);
}

export async function deleteMapStore(mapId: string, storeId: string) {
  await deleteDoc(doc(firebaseDb, 'maps', mapId, 'stores', storeId));
}

export async function updateMapStoreTag(
  mapId: string,
  storeId: string,
  tag: 'favorite' | 'want' | 'again' | null
) {
  await updateDoc(doc(firebaseDb, 'maps', mapId, 'stores', storeId), { tag });
}

export async function renameMap(mapId: string, newName: string) {
  await updateDoc(doc(firebaseDb, 'maps', mapId), { name: newName.trim() || t('sharedMaps.untitled') });
}

export async function setMapReadOnly(mapId: string, isReadOnly: boolean) {
  await updateDoc(doc(firebaseDb, 'maps', mapId), { isReadOnly });
}

export async function leaveMap(mapId: string, userId: string) {
  await updateDoc(doc(firebaseDb, 'maps', mapId), {
    memberIds: arrayRemove(userId),
  });
}

// ── Comments ──

export type StoreComment = {
  id: string;
  text: string;
  authorId: string;
  authorName?: string;
  createdAt?: number;
};

export function listenStoreComments(
  mapId: string,
  storeId: string,
  onChange: (comments: StoreComment[]) => void
): Unsubscribe {
  const q = query(
    collection(firebaseDb, 'maps', mapId, 'stores', storeId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        text: data?.text ?? '',
        authorId: data?.authorId ?? '',
        authorName: data?.authorName ?? undefined,
        createdAt: data?.createdAt?.toMillis?.() ?? undefined,
      } as StoreComment;
    });
    onChange(comments);
  }, (error) => {
    console.warn('listenStoreComments error:', error);
  });
}

export async function addStoreComment(
  mapId: string,
  storeId: string,
  input: { text: string; authorId: string; authorName?: string }
) {
  const data: Record<string, any> = {
    text: input.text.trim(),
    authorId: input.authorId,
    createdAt: serverTimestamp(),
  };
  if (input.authorName) data.authorName = input.authorName;
  await addDoc(collection(firebaseDb, 'maps', mapId, 'stores', storeId, 'comments'), data);
}

export async function deleteStoreComment(mapId: string, storeId: string, commentId: string) {
  await deleteDoc(doc(firebaseDb, 'maps', mapId, 'stores', storeId, 'comments', commentId));
}

export async function deleteMap(mapId: string) {
  const storesSnap = await getDocs(collection(firebaseDb, 'maps', mapId, 'stores'));
  const deletes = storesSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
  await deleteDoc(doc(firebaseDb, 'maps', mapId));
}
