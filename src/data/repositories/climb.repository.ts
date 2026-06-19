import { Climb, CreateClimbInput, UpdateClimbInput } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { createLocalId } from '../../utils/ids';
import { parseStringArrayJson, stringifyStringArray } from '../../utils/json';
import { secondsBetween } from '../../utils/time';
import { initializeDatabase } from '../db/client';

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

export type ClimbRepository = {
  create(input: CreateClimbInput): Promise<Climb>;
  getActiveBySessionId(sessionId: string): Promise<Climb | null>;
  getById(climbId: string): Promise<Climb | null>;
  getLastFinishedBySessionId(sessionId: string): Promise<Climb | null>;
  listBySessionId(sessionId: string): Promise<Climb[]>;
  reorderSessionClimbs(sessionId: string, climbIds: string[]): Promise<void>;
  update(climbId: string, input: UpdateClimbInput): Promise<Climb | null>;
  finish(climbId: string, input?: { completed?: boolean; endTime?: string }): Promise<Climb | null>;
  discard(climbId: string, deletedAt?: string): Promise<Climb | null>;
};

function mapClimb(row: ClimbRow): Climb {
  return {
    id: row.id,
    sessionId: row.session_id,
    grade: row.grade,
    colour: row.colour,
    holdTypes: parseStringArrayJson(row.hold_types_json),
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    attemptCount: row.attempt_count,
    completed: row.completed === 1,
    restBeforeClimbSeconds: row.rest_before_climb_seconds,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const climbRepository: ClimbRepository = {
  async create(input) {
    const database = await initializeDatabase();
    const timestamp = nowIso();
    const climb: Climb = {
      id: input.id ?? createLocalId('climb'),
      sessionId: input.sessionId,
      grade: input.grade,
      colour: input.colour ?? null,
      holdTypes: input.holdTypes ?? [],
      startTime: input.startTime ?? timestamp,
      endTime: null,
      durationSeconds: null,
      attemptCount: 0,
      completed: false,
      restBeforeClimbSeconds: input.restBeforeClimbSeconds ?? null,
      sortOrder: input.sortOrder ?? Date.parse(input.startTime ?? timestamp),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    await database.runAsync(
      `
        INSERT INTO climbs (
          id, session_id, grade, colour, hold_types_json, start_time, end_time,
          duration_seconds, attempt_count, completed, rest_before_climb_seconds, sort_order,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        climb.id,
        climb.sessionId,
        climb.grade,
        climb.colour,
        stringifyStringArray(climb.holdTypes),
        climb.startTime,
        climb.endTime,
        climb.durationSeconds,
        climb.attemptCount,
        climb.completed ? 1 : 0,
        climb.restBeforeClimbSeconds,
        climb.sortOrder,
        climb.createdAt,
        climb.updatedAt,
        climb.deletedAt,
      ],
    );

    return climb;
  },

  async getActiveBySessionId(sessionId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ClimbRow>(
      `
        SELECT * FROM climbs
        WHERE session_id = ? AND end_time IS NULL AND deleted_at IS NULL
        ORDER BY start_time DESC
        LIMIT 1;
      `,
      [sessionId],
    );

    return row ? mapClimb(row) : null;
  },

  async getById(climbId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ClimbRow>(
      'SELECT * FROM climbs WHERE id = ? AND deleted_at IS NULL LIMIT 1;',
      [climbId],
    );

    return row ? mapClimb(row) : null;
  },

  async getLastFinishedBySessionId(sessionId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ClimbRow>(
      `
        SELECT * FROM climbs
        WHERE session_id = ? AND end_time IS NOT NULL AND deleted_at IS NULL
        ORDER BY end_time DESC
        LIMIT 1;
      `,
      [sessionId],
    );

    return row ? mapClimb(row) : null;
  },

  async listBySessionId(sessionId) {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<ClimbRow>(
      `
        SELECT * FROM climbs
        WHERE session_id = ? AND deleted_at IS NULL
        ORDER BY sort_order ASC, start_time ASC;
      `,
      [sessionId],
    );

    return rows.map(mapClimb);
  },

  async update(climbId, input) {
    const current = await climbRepository.getById(climbId);

    if (!current) {
      return null;
    }

    const database = await initializeDatabase();
    const updatedAt = nowIso();
    const next: Climb = {
      ...current,
      grade: input.grade ?? current.grade,
      colour: input.colour === undefined ? current.colour : input.colour,
      holdTypes: input.holdTypes ?? current.holdTypes,
      endTime: input.endTime === undefined ? current.endTime : input.endTime,
      durationSeconds: input.durationSeconds === undefined ? current.durationSeconds : input.durationSeconds,
      attemptCount: input.attemptCount ?? current.attemptCount,
      completed: input.completed ?? current.completed,
      restBeforeClimbSeconds:
        input.restBeforeClimbSeconds === undefined ? current.restBeforeClimbSeconds : input.restBeforeClimbSeconds,
      sortOrder: input.sortOrder ?? current.sortOrder,
      deletedAt: input.deletedAt === undefined ? current.deletedAt : input.deletedAt,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE climbs
        SET grade = ?, colour = ?, hold_types_json = ?, end_time = ?, duration_seconds = ?,
          attempt_count = ?, completed = ?, rest_before_climb_seconds = ?, sort_order = ?, deleted_at = ?, updated_at = ?
        WHERE id = ?;
      `,
      [
        next.grade,
        next.colour,
        stringifyStringArray(next.holdTypes),
        next.endTime,
        next.durationSeconds,
        next.attemptCount,
        next.completed ? 1 : 0,
        next.restBeforeClimbSeconds,
        next.sortOrder,
        next.deletedAt,
        next.updatedAt,
        next.id,
      ],
    );

    return next;
  },

  async finish(climbId, input = {}) {
    const current = await climbRepository.getById(climbId);

    if (!current) {
      return null;
    }

    const endTime = input.endTime ?? nowIso();

    return climbRepository.update(climbId, {
      completed: input.completed ?? current.completed,
      durationSeconds: secondsBetween(current.startTime, endTime),
      endTime,
    });
  },

  async reorderSessionClimbs(sessionId, climbIds) {
    const database = await initializeDatabase();
    const updatedAt = nowIso();

    await database.withTransactionAsync(async () => {
      await Promise.all(
        climbIds.map((climbId, index) =>
          database.runAsync(
            `
              UPDATE climbs
              SET sort_order = ?, updated_at = ?
              WHERE id = ? AND session_id = ? AND deleted_at IS NULL;
            `,
            [index + 1, updatedAt, climbId, sessionId],
          ),
        ),
      );
    });
  },

  async discard(climbId, deletedAt = nowIso()) {
    return climbRepository.update(climbId, { deletedAt });
  },
};
