import type { Unsubscribe } from 'firebase/firestore';
import {
    addDoc,
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
  await addDoc(collection(firebaseDb, 'maps', mapId, 'stores'), {
    name: input.name.trim(),
    placeId: input.placeId?.trim() || undefined,
    latitude: input.latitude,
    longitude: input.longitude,
    memo: input.memo?.trim() || undefined,
    tag: input.tag ?? null,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
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

export async function setMapReadOnly(mapId: string, isReadOnly: boolean) {
  await updateDoc(doc(firebaseDb, 'maps', mapId), { isReadOnly });
}
