import { Attempt, CreateAttemptInput, UpdateAttemptInput } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { createLocalId } from '../../utils/ids';
import { initializeDatabase } from '../db/client';

type AttemptRow = {
  id: string;
  climb_id: string;
  attempt_number: number;
  timestamp: string;
  rest_since_previous_attempt_seconds: number | null;
  created_at: string;
  deleted_at: string | null;
};

export type AttemptRepository = {
  create(input: CreateAttemptInput): Promise<Attempt>;
  getById(attemptId: string): Promise<Attempt | null>;
  getLastByClimbId(climbId: string): Promise<Attempt | null>;
  listByClimbId(climbId: string): Promise<Attempt[]>;
  update(attemptId: string, input: UpdateAttemptInput): Promise<Attempt | null>;
  softDeleteLatestByClimbId(climbId: string, deletedAt?: string): Promise<Attempt | null>;
};

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    climbId: row.climb_id,
    attemptNumber: row.attempt_number,
    timestamp: row.timestamp,
    restSincePreviousAttemptSeconds: row.rest_since_previous_attempt_seconds,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export const attemptRepository: AttemptRepository = {
  async create(input) {
    const database = await initializeDatabase();
    const timestamp = input.timestamp ?? nowIso();
    const attempt: Attempt = {
      id: input.id ?? createLocalId('attempt'),
      climbId: input.climbId,
      attemptNumber: input.attemptNumber,
      timestamp,
      restSincePreviousAttemptSeconds: input.restSincePreviousAttemptSeconds ?? null,
      createdAt: nowIso(),
      deletedAt: null,
    };

    await database.runAsync(
      `
        INSERT INTO attempts (
          id, climb_id, attempt_number, timestamp, rest_since_previous_attempt_seconds, created_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      [
        attempt.id,
        attempt.climbId,
        attempt.attemptNumber,
        attempt.timestamp,
        attempt.restSincePreviousAttemptSeconds,
        attempt.createdAt,
        attempt.deletedAt,
      ],
    );

    return attempt;
  },

  async getById(attemptId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<AttemptRow>(
      'SELECT * FROM attempts WHERE id = ? AND deleted_at IS NULL LIMIT 1;',
      [attemptId],
    );

    return row ? mapAttempt(row) : null;
  },

  async getLastByClimbId(climbId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<AttemptRow>(
      `
        SELECT * FROM attempts
        WHERE climb_id = ? AND deleted_at IS NULL
        ORDER BY attempt_number DESC
        LIMIT 1;
      `,
      [climbId],
    );

    return row ? mapAttempt(row) : null;
  },

  async listByClimbId(climbId) {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<AttemptRow>(
      `
        SELECT * FROM attempts
        WHERE climb_id = ? AND deleted_at IS NULL
        ORDER BY attempt_number ASC;
      `,
      [climbId],
    );

    return rows.map(mapAttempt);
  },

  async update(attemptId, input) {
    const current = await attemptRepository.getById(attemptId);

    if (!current) {
      return null;
    }

    const database = await initializeDatabase();
    const next: Attempt = {
      ...current,
      deletedAt: input.deletedAt === undefined ? current.deletedAt : input.deletedAt,
    };

    await database.runAsync('UPDATE attempts SET deleted_at = ? WHERE id = ?;', [next.deletedAt, next.id]);

    return next;
  },

  async softDeleteLatestByClimbId(climbId, deletedAt = nowIso()) {
    const latest = await attemptRepository.getLastByClimbId(climbId);

    if (!latest) {
      return null;
    }

    return attemptRepository.update(latest.id, { deletedAt });
  },
};
