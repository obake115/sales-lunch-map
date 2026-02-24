import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('sales-lunch-map.db').catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
