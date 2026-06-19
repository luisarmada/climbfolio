import { CreateSessionInput, Session, UpdateSessionInput } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { createLocalId } from '../../utils/ids';
import { secondsBetween } from '../../utils/time';
import { initializeDatabase } from '../db/client';

type SessionRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SessionRepository = {
  create(input?: CreateSessionInput): Promise<Session>;
  getActive(): Promise<Session | null>;
  getById(sessionId: string): Promise<Session | null>;
  listCompleted(): Promise<Session[]>;
  listAll(): Promise<Session[]>;
  update(sessionId: string, input: UpdateSessionInput): Promise<Session | null>;
  end(sessionId: string, endTime?: string): Promise<Session | null>;
};

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const sessionRepository: SessionRepository = {
  async create(input = {}) {
    const database = await initializeDatabase();
    const timestamp = nowIso();
    const session: Session = {
      id: input.id ?? createLocalId('session'),
      startTime: input.startTime ?? timestamp,
      endTime: null,
      durationSeconds: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    await database.runAsync(
      `
        INSERT INTO sessions (
          id, start_time, end_time, duration_seconds, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      [
        session.id,
        session.startTime,
        session.endTime,
        session.durationSeconds,
        session.createdAt,
        session.updatedAt,
        session.deletedAt,
      ],
    );

    return session;
  },

  async getActive() {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<SessionRow>(`
      SELECT * FROM sessions
      WHERE end_time IS NULL AND deleted_at IS NULL
      ORDER BY start_time DESC
      LIMIT 1;
    `);

    return row ? mapSession(row) : null;
  },

  async getById(sessionId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<SessionRow>(
      'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL LIMIT 1;',
      [sessionId],
    );

    return row ? mapSession(row) : null;
  },

  async listCompleted() {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<SessionRow>(`
      SELECT * FROM sessions
      WHERE end_time IS NOT NULL AND deleted_at IS NULL
      ORDER BY start_time DESC;
    `);

    return rows.map(mapSession);
  },

  async listAll() {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<SessionRow>(`
      SELECT * FROM sessions
      WHERE deleted_at IS NULL
      ORDER BY start_time DESC;
    `);

    return rows.map(mapSession);
  },

  async update(sessionId, input) {
    const current = await sessionRepository.getById(sessionId);

    if (!current) {
      return null;
    }

    const database = await initializeDatabase();
    const updatedAt = nowIso();
    const next: Session = {
      ...current,
      endTime: input.endTime === undefined ? current.endTime : input.endTime,
      durationSeconds: input.durationSeconds === undefined ? current.durationSeconds : input.durationSeconds,
      deletedAt: input.deletedAt === undefined ? current.deletedAt : input.deletedAt,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE sessions
        SET end_time = ?, duration_seconds = ?, deleted_at = ?, updated_at = ?
        WHERE id = ?;
      `,
      [next.endTime, next.durationSeconds, next.deletedAt, next.updatedAt, next.id],
    );

    return next;
  },

  async end(sessionId, endTime = nowIso()) {
    const current = await sessionRepository.getById(sessionId);

    if (!current) {
      return null;
    }

    return sessionRepository.update(sessionId, {
      durationSeconds: secondsBetween(current.startTime, endTime),
      endTime,
    });
  },
};
