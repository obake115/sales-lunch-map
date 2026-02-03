import type { SQLiteDatabase } from 'expo-sqlite';

import type { Store } from '../models';

type PlaceRow = {
  id: string;
  name: string | null;
  note: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
  enabled: number;
  timeBand: string | null;
  parking: number | null;
  smoking: number | null;
  seating: string | null;
  isFavorite: number;
  remindEnabled: number;
  remindRadiusM: number | null;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt: string | null;
};

const toMillis = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : undefined;
};

const toDbDate = (value: number | undefined) => {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
};

const rowToStore = (row: PlaceRow): Store => ({
  id: row.id,
  name: row.name ?? '',
  placeId: row.placeId ?? undefined,
  latitude: row.lat,
  longitude: row.lng,
  enabled: row.enabled === 1,
  note: row.note ?? undefined,
  timeBand: row.timeBand ?? undefined,
  parking: row.parking ?? undefined,
  smoking: row.smoking ?? undefined,
  seating: row.seating ?? undefined,
  isFavorite: row.isFavorite === 1,
  remindEnabled: row.remindEnabled === 1,
  remindRadiusM: row.remindRadiusM ?? undefined,
  createdAt: toMillis(row.createdAt) ?? Date.now(),
  updatedAt: toMillis(row.updatedAt) ?? Date.now(),
  lastNotifiedAt: toMillis(row.lastNotifiedAt) ?? undefined,
});

export async function getAllPlaces(db: SQLiteDatabase): Promise<Store[]> {
  const rows = await db.getAllAsync<PlaceRow>('SELECT * FROM places ORDER BY createdAt DESC');
  return rows.map(rowToStore);
}

export async function getPlaceById(db: SQLiteDatabase, id: string): Promise<Store | null> {
  const row = await db.getFirstAsync<PlaceRow>('SELECT * FROM places WHERE id = ?', id);
  return row ? rowToStore(row) : null;
}

export async function insertPlace(
  db: SQLiteDatabase,
  input: Pick<Store, 'id' | 'name' | 'placeId' | 'latitude' | 'longitude'> &
    Partial<
      Pick<
        Store,
        | 'note'
        | 'timeBand'
        | 'parking'
        | 'smoking'
        | 'seating'
        | 'isFavorite'
        | 'remindEnabled'
        | 'remindRadiusM'
        | 'enabled'
        | 'createdAt'
        | 'updatedAt'
        | 'lastNotifiedAt'
      >
    >
) {
  const createdAt = toDbDate(input.createdAt);
  const updatedAt = toDbDate(input.updatedAt ?? input.createdAt);
  const lastNotifiedAt = input.lastNotifiedAt ? toDbDate(input.lastNotifiedAt) : null;
  await db.runAsync(
    `INSERT INTO places (
      id, name, note, lat, lng, placeId, enabled, timeBand, parking, smoking, seating,
      isFavorite, remindEnabled, remindRadiusM, createdAt, updatedAt, lastNotifiedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name ?? '',
      input.note ?? null,
      input.latitude,
      input.longitude,
      input.placeId ?? null,
      input.enabled === false ? 0 : 1,
      input.timeBand ?? null,
      input.parking ?? null,
      input.smoking ?? null,
      input.seating ?? null,
      input.isFavorite ? 1 : 0,
      input.remindEnabled ? 1 : 0,
      input.remindRadiusM ?? null,
      createdAt,
      updatedAt,
      lastNotifiedAt,
    ]
  );
}

export async function updatePlace(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Omit<Store, 'id' | 'createdAt'>>
) {
  const current = await getPlaceById(db, id);
  if (!current) return null;
  const next: Store = { ...current, ...patch, updatedAt: Date.now() };
  await db.runAsync(
    `UPDATE places SET
      name = ?, note = ?, lat = ?, lng = ?, placeId = ?, enabled = ?, timeBand = ?, parking = ?, smoking = ?, seating = ?,
      isFavorite = ?, remindEnabled = ?, remindRadiusM = ?, updatedAt = ?, lastNotifiedAt = ?
    WHERE id = ?`,
    [
      next.name ?? '',
      next.note ?? null,
      next.latitude,
      next.longitude,
      next.placeId ?? null,
      next.enabled ? 1 : 0,
      next.timeBand ?? null,
      next.parking ?? null,
      next.smoking ?? null,
      next.seating ?? null,
      next.isFavorite ? 1 : 0,
      next.remindEnabled ? 1 : 0,
      next.remindRadiusM ?? null,
      toDbDate(next.updatedAt),
      next.lastNotifiedAt ? toDbDate(next.lastNotifiedAt) : null,
      id,
    ]
  );
  return next;
}

export async function deletePlace(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM places WHERE id = ?', id);
}
