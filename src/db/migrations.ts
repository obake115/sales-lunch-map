import type { SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      note TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      placeId TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      timeBand TEXT,
      parking INTEGER,
      smoking INTEGER,
      seating TEXT,
      isFavorite INTEGER NOT NULL DEFAULT 0,
      remindEnabled INTEGER NOT NULL DEFAULT 0,
      remindRadiusM INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastNotifiedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY NOT NULL,
      storeId TEXT NOT NULL,
      text TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      reminderAt INTEGER,
      reminderNotificationId TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(storeId) REFERENCES places(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places (lat, lng);
    CREATE INDEX IF NOT EXISTS idx_memos_storeId ON memos (storeId);
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(places)');
  const hasPhotoUri = columns.some((col) => col.name === 'photoUri');
  if (!hasPhotoUri) {
    await db.execAsync('ALTER TABLE places ADD COLUMN photoUri TEXT');
  }
  const hasMoodTags = columns.some((col) => col.name === 'moodTags');
  if (!hasMoodTags) {
    await db.execAsync('ALTER TABLE places ADD COLUMN moodTags TEXT');
  }
  const hasSceneTags = columns.some((col) => col.name === 'sceneTags');
  if (!hasSceneTags) {
    await db.execAsync('ALTER TABLE places ADD COLUMN sceneTags TEXT');
  }
}
