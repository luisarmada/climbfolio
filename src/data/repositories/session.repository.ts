import { CreateSessionInput, EndSessionInput, Session, UpdateSessionInput } from '../../domain/models';
import { GradingScaleType, VGradeRange, normalizeVGradeRange, resolveGradingScale } from '../../domain/gradeScales';
import { nowIso } from '../../utils/dates';
import { createLocalId } from '../../utils/ids';
import { secondsBetween } from '../../utils/time';
import { initializeDatabase } from '../db/client';

type SessionRow = {
  id: string;
  name: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  grading_scale_type?: string | null;
  grading_scale_name?: string | null;
  grading_scale_grades_json?: string | null;
  grading_scale_is_tape?: number | null;
  grading_scale_v_ranges_json?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  location_type?: string | null;
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
  end(sessionId: string, input?: EndSessionInput): Promise<Session | null>;
};

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseVGradeRanges(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, VGradeRange>>((ranges, [grade, range]) => {
      if (!range || typeof range !== 'object' || Array.isArray(range)) {
        return ranges;
      }

      const maybeRange = range as Partial<VGradeRange>;
      ranges[grade] = normalizeVGradeRange({
        min: typeof maybeRange.min === 'string' ? maybeRange.min : 'V0',
        max: typeof maybeRange.max === 'string' ? maybeRange.max : 'V0',
      });
      return ranges;
    }, {});
  } catch {
    return {};
  }
}

function normalizeScaleType(value: string | null | undefined): GradingScaleType {
  return value === 'font' || value === 'custom' || value === 'v_scale' ? value : 'v_scale';
}

function mapSession(row: SessionRow): Session {
  const fallbackScale = resolveGradingScale({ gradingScaleType: 'v_scale' });
  const gradingScaleType = normalizeScaleType(row.grading_scale_type);
  const gradingScaleGrades = parseJsonArray(row.grading_scale_grades_json);
  const gradingScaleVGradeRanges = parseVGradeRanges(row.grading_scale_v_ranges_json);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    gradingScaleGrades: gradingScaleGrades.length > 0 ? gradingScaleGrades : fallbackScale.gradingScaleGrades,
    gradingScaleIsTape: Boolean(row.grading_scale_is_tape),
    gradingScaleName: row.grading_scale_name || fallbackScale.gradingScaleName,
    gradingScaleType,
    gradingScaleVGradeRanges:
      Object.keys(gradingScaleVGradeRanges).length > 0 ? gradingScaleVGradeRanges : fallbackScale.gradingScaleVGradeRanges,
    locationId: row.location_id ?? null,
    locationName: row.location_name ?? null,
    locationType: row.location_type ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const sessionRepository: SessionRepository = {
  async create(input = {}) {
    const database = await initializeDatabase();
    const timestamp = nowIso();
    const gradingScale = resolveGradingScale({
      customGrades: input.gradingScaleGrades,
      customGradingScaleName: input.gradingScaleName,
      gradingScaleType: input.gradingScaleType,
    });
    const session: Session = {
      id: input.id ?? createLocalId('session'),
      name: input.name ?? null,
      description: input.description ?? null,
      startTime: input.startTime ?? timestamp,
      endTime: null,
      durationSeconds: null,
      gradingScaleGrades: gradingScale.gradingScaleGrades,
      gradingScaleIsTape: Boolean(input.gradingScaleIsTape ?? gradingScale.gradingScaleIsTape),
      gradingScaleName: gradingScale.gradingScaleName,
      gradingScaleType: gradingScale.gradingScaleType,
      gradingScaleVGradeRanges: input.gradingScaleVGradeRanges ?? gradingScale.gradingScaleVGradeRanges,
      locationId: input.locationId ?? null,
      locationName: input.locationName ?? null,
      locationType: input.locationType ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    await database.runAsync(
      `
        INSERT INTO sessions (
          id, name, description, start_time, end_time, duration_seconds, grading_scale_type, grading_scale_name,
          grading_scale_grades_json, grading_scale_is_tape, grading_scale_v_ranges_json, location_id, location_name, location_type,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        session.id,
        session.name,
        session.description,
        session.startTime,
        session.endTime,
        session.durationSeconds,
        session.gradingScaleType,
        session.gradingScaleName,
        JSON.stringify(session.gradingScaleGrades),
        session.gradingScaleIsTape ? 1 : 0,
        JSON.stringify(session.gradingScaleVGradeRanges),
        session.locationId,
        session.locationName,
        session.locationType,
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
      name: input.name === undefined ? current.name : input.name,
      description: input.description === undefined ? current.description : input.description,
      endTime: input.endTime === undefined ? current.endTime : input.endTime,
      durationSeconds: input.durationSeconds === undefined ? current.durationSeconds : input.durationSeconds,
      deletedAt: input.deletedAt === undefined ? current.deletedAt : input.deletedAt,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE sessions
        SET name = ?, description = ?, end_time = ?, duration_seconds = ?, deleted_at = ?, updated_at = ?
        WHERE id = ?;
      `,
      [next.name, next.description, next.endTime, next.durationSeconds, next.deletedAt, next.updatedAt, next.id],
    );

    return next;
  },

  async end(sessionId, input = {}) {
    const current = await sessionRepository.getById(sessionId);

    if (!current) {
      return null;
    }

    const endTime = input.endTime ?? nowIso();

    return sessionRepository.update(sessionId, {
      description: input.description,
      durationSeconds: secondsBetween(current.startTime, endTime),
      endTime,
      name: input.name,
    });
  },
};
