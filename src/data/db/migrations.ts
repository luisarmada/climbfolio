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

    if (currentVersion > 0 && currentVersion < 3) {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id TEXT PRIMARY KEY NOT NULL,
          display_name TEXT NOT NULL,
          climber_type TEXT NOT NULL,
          badge_preference TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);
    }

    if (currentVersion > 0 && currentVersion < 4) {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS climbing_preferences (
          id TEXT PRIMARY KEY NOT NULL,
          default_climb_grade TEXT NOT NULL,
          default_quick_grade TEXT NOT NULL,
          require_colour_selection INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);
    }

    if (currentVersion > 0 && currentVersion < 5) {
      await database.execAsync(`
        ALTER TABLE sessions ADD COLUMN grading_scale_type TEXT NOT NULL DEFAULT 'v_scale';
      `);
      await database.execAsync(`
        ALTER TABLE sessions ADD COLUMN grading_scale_name TEXT NOT NULL DEFAULT 'V Scale';
      `);
      await database.execAsync(`
        ALTER TABLE sessions ADD COLUMN grading_scale_grades_json TEXT NOT NULL DEFAULT '["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10+"]';
      `);
      await database.execAsync(`
        ALTER TABLE climbing_preferences ADD COLUMN grading_scale_type TEXT NOT NULL DEFAULT 'v_scale';
      `);
      await database.execAsync(`
        ALTER TABLE climbing_preferences ADD COLUMN custom_grading_scale_name TEXT NOT NULL DEFAULT 'Custom';
      `);
      await database.execAsync(`
        ALTER TABLE climbing_preferences ADD COLUMN custom_grades_json TEXT NOT NULL DEFAULT '[]';
      `);
    }

    if (currentVersion > 0 && currentVersion < 6) {
      await database.execAsync(`
        ALTER TABLE climbing_preferences ADD COLUMN selected_grading_scale_id TEXT NOT NULL DEFAULT 'v_scale';
      `);
      await database.execAsync(`
        ALTER TABLE climbing_preferences ADD COLUMN custom_scales_json TEXT NOT NULL DEFAULT '[]';
      `);
    }

    if (currentVersion > 0 && currentVersion < 7) {
      await database.execAsync('ALTER TABLE sessions ADD COLUMN name TEXT;');
      await database.execAsync('ALTER TABLE sessions ADD COLUMN description TEXT;');
    }

    await database.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?);',
      [schemaVersion, nowIso()],
    );
  });
}
