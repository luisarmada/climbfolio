import { DatabaseClient, SqlParams } from './types';

type SessionRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ClimbRow = {
  id: string;
  session_id: string;
  grade: string;
  colour: string | null;
  hold_types_json: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  attempt_count: number;
  completed: number;
  rest_before_climb_seconds: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type AttemptRow = {
  id: string;
  climb_id: string;
  attempt_number: number;
  timestamp: string;
  rest_since_previous_attempt_seconds: number | null;
  created_at: string;
  deleted_at: string | null;
};

type WebDatabaseState = {
  attempts: AttemptRow[];
  climbs: ClimbRow[];
  migrations: { applied_at: string; version: number }[];
  sessions: SessionRow[];
};

const storageKey = 'climbfolio.webDatabase.v1';

function createEmptyState(): WebDatabaseState {
  return {
    attempts: [],
    climbs: [],
    migrations: [],
    sessions: [],
  };
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function readState(): WebDatabaseState {
  if (typeof localStorage === 'undefined') {
    return createEmptyState();
  }

  const storedState = localStorage.getItem(storageKey);

  if (!storedState) {
    return createEmptyState();
  }

  try {
    const state = JSON.parse(storedState) as WebDatabaseState;

    return {
      ...state,
      climbs: state.climbs.map((climb) => ({
        ...climb,
        sort_order: climb.sort_order ?? Date.parse(climb.start_time),
      })),
    };
  } catch {
    return createEmptyState();
  }
}

function writeState(state: WebDatabaseState) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
}

function sortByDesc<T>(items: T[], select: (item: T) => string | null) {
  return [...items].sort((left, right) => (select(right) ?? '').localeCompare(select(left) ?? ''));
}

function sortByAsc<T>(items: T[], select: (item: T) => string | null) {
  return [...items].sort((left, right) => (select(left) ?? '').localeCompare(select(right) ?? ''));
}

class WebDatabase implements DatabaseClient {
  private state = readState();

  async execAsync() {
    writeState(this.state);
  }

  async runAsync(sql: string, params: SqlParams = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql.startsWith('insert or replace into schema_migrations')) {
      const version = Number(params[0]);
      const appliedAt = String(params[1]);
      this.state.migrations = this.state.migrations.filter((migration) => migration.version !== version);
      this.state.migrations.push({ applied_at: appliedAt, version });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into sessions')) {
      const [id, startTime, endTime, durationSeconds, createdAt, updatedAt, deletedAt] = params;
      this.state.sessions.push({
        id: String(id),
        start_time: String(startTime),
        end_time: endTime == null ? null : String(endTime),
        duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update sessions')) {
      const [endTime, durationSeconds, deletedAt, updatedAt, id] = params;
      this.state.sessions = this.state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              deleted_at: deletedAt == null ? null : String(deletedAt),
              duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
              end_time: endTime == null ? null : String(endTime),
              updated_at: String(updatedAt),
            }
          : session,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into climbs')) {
      const [
        id,
        sessionId,
        grade,
        colour,
        holdTypesJson,
        startTime,
        endTime,
        durationSeconds,
        attemptCount,
        completed,
        restBeforeClimbSeconds,
        sortOrder,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;
      this.state.climbs.push({
        id: String(id),
        session_id: String(sessionId),
        grade: String(grade),
        colour: colour == null ? null : String(colour),
        hold_types_json: String(holdTypesJson),
        start_time: String(startTime),
        end_time: endTime == null ? null : String(endTime),
        duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
        attempt_count: Number(attemptCount),
        completed: Number(completed),
        rest_before_climb_seconds: restBeforeClimbSeconds == null ? null : Number(restBeforeClimbSeconds),
        sort_order: sortOrder == null ? Date.parse(String(startTime)) : Number(sortOrder),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.includes('update climbs') && normalizedSql.includes('set sort_order =')) {
      const [sortOrder, updatedAt, climbId, sessionId] = params;
      this.state.climbs = this.state.climbs.map((climb) =>
        climb.id === climbId && climb.session_id === sessionId && climb.deleted_at === null
          ? { ...climb, sort_order: Number(sortOrder), updated_at: String(updatedAt) }
          : climb,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update climbs')) {
      const [
        grade,
        colour,
        holdTypesJson,
        endTime,
        durationSeconds,
        attemptCount,
        completed,
        restBeforeClimbSeconds,
        sortOrderOrDeletedAt,
        deletedAtOrUpdatedAt,
        updatedAtOrId,
        maybeId,
      ] = params;
      const hasSortOrder = params.length === 12;
      const sortOrder = hasSortOrder ? sortOrderOrDeletedAt : undefined;
      const deletedAt = hasSortOrder ? deletedAtOrUpdatedAt : sortOrderOrDeletedAt;
      const updatedAt = hasSortOrder ? updatedAtOrId : deletedAtOrUpdatedAt;
      const id = hasSortOrder ? maybeId : updatedAtOrId;
      this.state.climbs = this.state.climbs.map((climb) =>
        climb.id === id
          ? {
              ...climb,
              attempt_count: Number(attemptCount),
              colour: colour == null ? null : String(colour),
              completed: Number(completed),
              deleted_at: deletedAt == null ? null : String(deletedAt),
              duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
              end_time: endTime == null ? null : String(endTime),
              grade: String(grade),
              hold_types_json: String(holdTypesJson),
              rest_before_climb_seconds: restBeforeClimbSeconds == null ? null : Number(restBeforeClimbSeconds),
              sort_order: sortOrder == null ? climb.sort_order : Number(sortOrder),
              updated_at: String(updatedAt),
            }
          : climb,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into attempts')) {
      const [id, climbId, attemptNumber, timestamp, restSincePreviousAttemptSeconds, createdAt, deletedAt] = params;
      this.state.attempts.push({
        id: String(id),
        climb_id: String(climbId),
        attempt_number: Number(attemptNumber),
        timestamp: String(timestamp),
        rest_since_previous_attempt_seconds:
          restSincePreviousAttemptSeconds == null ? null : Number(restSincePreviousAttemptSeconds),
        created_at: String(createdAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update attempts')) {
      const [deletedAt, id] = params;
      this.state.attempts = this.state.attempts.map((attempt) =>
        attempt.id === id ? { ...attempt, deleted_at: deletedAt == null ? null : String(deletedAt) } : attempt,
      );
      writeState(this.state);
    }
  }

  async getFirstAsync<T>(sql: string, params: SqlParams = []) {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(sql: string, params: SqlParams = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql.includes('from schema_migrations')) {
      return sortByDesc(this.state.migrations, (migration) => String(migration.version)) as T[];
    }

    if (normalizedSql.includes('from sessions')) {
      const [sessionId] = params;
      let rows = this.state.sessions;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((session) => session.id === sessionId && session.deleted_at === null);
      } else if (normalizedSql.includes('end_time is null')) {
        rows = rows.filter((session) => session.end_time === null && session.deleted_at === null);
      } else if (normalizedSql.includes('end_time is not null')) {
        rows = rows.filter((session) => session.end_time !== null && session.deleted_at === null);
      } else if (normalizedSql.includes('deleted_at is null')) {
        rows = rows.filter((session) => session.deleted_at === null);
      }

      return sortByDesc(rows, (session) => session.start_time) as T[];
    }

    if (normalizedSql.includes('from climbs') && normalizedSql.includes('coalesce(sum')) {
      const [sessionId] = params;
      const climbs = this.state.climbs.filter((climb) => climb.session_id === sessionId && climb.deleted_at === null);
      return [
        {
          attempts: climbs.reduce((total, climb) => total + climb.attempt_count, 0),
          climbs: climbs.length,
        },
      ] as T[];
    }

    if (normalizedSql.includes('from climbs')) {
      const [firstParam] = params;
      let rows = this.state.climbs;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((climb) => climb.id === firstParam && climb.deleted_at === null);
      } else if (normalizedSql.includes('session_id = ?')) {
        rows = rows.filter((climb) => climb.session_id === firstParam && climb.deleted_at === null);

        if (normalizedSql.includes('end_time is null')) {
          rows = rows.filter((climb) => climb.end_time === null);
        }

        if (normalizedSql.includes('end_time is not null')) {
          rows = rows.filter((climb) => climb.end_time !== null);
          return sortByDesc(rows, (climb) => climb.end_time) as T[];
        }
      }

      return [...rows].sort((left, right) => {
        const sortDelta = left.sort_order - right.sort_order;
        return sortDelta === 0 ? left.start_time.localeCompare(right.start_time) : sortDelta;
      }) as T[];
    }

    if (normalizedSql.includes('from attempts')) {
      const [firstParam] = params;
      let rows = this.state.attempts;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((attempt) => attempt.id === firstParam && attempt.deleted_at === null);
      } else if (normalizedSql.includes('climb_id = ?')) {
        rows = rows.filter((attempt) => attempt.climb_id === firstParam && attempt.deleted_at === null);

        if (normalizedSql.includes('order by attempt_number desc')) {
          return [...rows].sort((left, right) => right.attempt_number - left.attempt_number) as T[];
        }
      }

      return [...rows].sort((left, right) => left.attempt_number - right.attempt_number) as T[];
    }

    return [];
  }

  async withTransactionAsync(task: () => Promise<void>) {
    await task();
    writeState(this.state);
  }
}

let webDatabase: WebDatabase | null = null;

export function getWebDatabase() {
  if (!webDatabase) {
    webDatabase = new WebDatabase();
  }

  return webDatabase;
}
