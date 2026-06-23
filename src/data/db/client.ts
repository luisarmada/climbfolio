import { Platform } from 'react-native';
import { runMigrations } from './migrations';
import { DatabaseClient } from './types';
import { getWebDatabase } from './webDatabase';

const databaseName = 'climb_book.db';

declare const require: <T>(moduleName: string) => T;

let databasePromise: Promise<DatabaseClient> | null = null;
let initializedPromise: Promise<DatabaseClient> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise =
      Platform.OS === 'web'
        ? Promise.resolve(getWebDatabase())
        : require<typeof import('expo-sqlite')>('expo-sqlite').openDatabaseAsync(databaseName) as Promise<DatabaseClient>;
  }

  return databasePromise;
}

export async function initializeDatabase() {
  if (!initializedPromise) {
    initializedPromise = getDatabase().then(async (database) => {
      await runMigrations(database);
      return database;
    });
  }

  return initializedPromise;
}

export function resetDatabaseClientForTests() {
  databasePromise = null;
  initializedPromise = null;
}
