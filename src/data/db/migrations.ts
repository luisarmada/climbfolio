import { nowIso } from '../../utils/dates';
import { createSchemaSql, schemaVersion } from './schema';
import { DatabaseClient } from './types';

type MigrationRow = {
  version: number;
};

export async function runMigrations(database: DatabaseClient) {
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const currentMigration = await database.getFirstAsync<MigrationRow>(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;',
  );

  const currentVersion = currentMigration?.version ?? 0;

  if (currentVersion >= schemaVersion) {
    return;
  }

  await database.withTransactionAsync(async () => {
    if (currentVersion === 0) {
      await database.execAsync(createSchemaSql);
    }

    if (currentVersion > 0 && currentVersion < 2) {
      await database.execAsync('ALTER TABLE climbs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;');
      await database.execAsync('UPDATE climbs SET sort_order = CAST(strftime(\'%s\', start_time) AS INTEGER) WHERE sort_order = 0;');
    }

    await database.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?);',
      [schemaVersion, nowIso()],
    );
  });
}
