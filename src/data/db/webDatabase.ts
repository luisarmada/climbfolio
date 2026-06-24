import { DatabaseClient, SqlParams } from './types';

type SessionRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  grading_scale_grades_json?: string;
  grading_scale_is_tape?: number;
  grading_scale_v_ranges_json?: string;
  location_id?: string | null;
  location_name?: string | null;
  location_type?: string | null;
  grading_scale_name?: string;
  grading_scale_type?: string;
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

type UserProfileRow = {
  id: string;
  display_name: string;
  climber_type: string;
  badge_preference: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ClimbingPreferencesRow = {
  custom_grades_json?: string;
  custom_scales_json?: string;
  custom_grading_scale_name?: string;
  id: string;
  default_climb_grade: string;
  default_quick_grade: string;
  grading_scale_type?: string;
  require_colour_selection: number;
  selected_grading_scale_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type LocationRow = {
  created_at: string;
  deleted_at: string | null;
  grading_scale_id: string;
  id: string;
  is_selected: number;
  name: string;
  type: string;
  updated_at: string;
};

type WebDatabaseState = {
  attempts: AttemptRow[];
  climbs: ClimbRow[];
  climbingPreferences: ClimbingPreferencesRow[];
  locations: LocationRow[];
  migrations: { applied_at: string; version: number }[];
  profiles: UserProfileRow[];
  sessions: SessionRow[];
};

const legacyStorageKey = ['climb', 'folio.webDatabase.v1'].join('');
const storageKey = 'climbbook.webDatabase.v1';

function createEmptyState(): WebDatabaseState {
  return {
    attempts: [],
    climbs: [],
    climbingPreferences: [],
    locations: [],
    migrations: [],
    profiles: [],
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

  const storedState = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey);

  if (!storedState) {
    return createEmptyState();
  }

  if (!localStorage.getItem(storageKey)) {
    localStorage.setItem(storageKey, storedState);
  }

  try {
    const state = JSON.parse(storedState) as WebDatabaseState;

    return {
      ...state,
      climbs: state.climbs.map((climb) => ({
        ...climb,
        sort_order: climb.sort_order ?? Date.parse(climb.start_time),
      })),
      climbingPreferences: (state.climbingPreferences ?? []).map((preferences) => ({
        ...preferences,
        custom_scales_json: preferences.custom_scales_json ?? '[]',
        selected_grading_scale_id: preferences.selected_grading_scale_id ?? preferences.grading_scale_type ?? 'v_scale',
      })),
      profiles: state.profiles ?? [],
      locations: state.locations ?? [],
      sessions: (state.sessions ?? []).map((session) => ({
        ...session,
        description: session.description ?? null,
        grading_scale_grades_json:
          session.grading_scale_grades_json ?? '["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10+"]',
        grading_scale_is_tape: session.grading_scale_is_tape ?? 0,
        grading_scale_v_ranges_json: session.grading_scale_v_ranges_json ?? '{}',
        grading_scale_name: session.grading_scale_name ?? 'V Scale',
        grading_scale_type: session.grading_scale_type ?? 'v_scale',
        location_id: session.location_id ?? null,
        location_name: session.location_name ?? null,
        location_type: session.location_type ?? null,
        name: session.name ?? null,
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
      if (params.length === 17) {
        const [
          id,
          name,
          description,
          startTime,
          endTime,
          durationSeconds,
          gradingScaleType,
          gradingScaleName,
          gradingScaleGradesJson,
          gradingScaleIsTape,
          gradingScaleRangesJson,
          locationId,
          locationName,
          locationType,
          createdAt,
          updatedAt,
          deletedAt,
        ] = params;
        this.state.sessions.push({
          id: String(id),
          name: name == null ? null : String(name),
          description: description == null ? null : String(description),
          start_time: String(startTime),
          end_time: endTime == null ? null : String(endTime),
          duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
          grading_scale_grades_json: String(gradingScaleGradesJson),
          grading_scale_is_tape: Number(gradingScaleIsTape),
          grading_scale_v_ranges_json: String(gradingScaleRangesJson),
          grading_scale_name: String(gradingScaleName),
          grading_scale_type: String(gradingScaleType),
          location_id: locationId == null ? null : String(locationId),
          location_name: locationName == null ? null : String(locationName),
          location_type: locationType == null ? null : String(locationType),
          created_at: String(createdAt),
          updated_at: String(updatedAt),
          deleted_at: deletedAt == null ? null : String(deletedAt),
        });
        writeState(this.state);
        return;
      }

      const [
        id,
        maybeNameOrStartTime,
        maybeDescriptionOrEndTime,
        maybeStartTimeOrDurationSeconds,
        maybeEndTimeOrGradingScaleType,
        maybeDurationSecondsOrGradingScaleName,
        maybeGradingScaleTypeOrGradesJson,
        maybeGradingScaleNameOrCreatedAt,
        maybeGradingScaleGradesJsonOrUpdatedAt,
        maybeGradingScaleIsTapeOrRangesJson,
        maybeGradingScaleRangesJsonOrCreatedAt,
        maybeCreatedAtOrUpdatedAt,
        maybeUpdatedAtOrDeletedAt,
        maybeDeletedAt,
      ] = params;
      const hasMetadata = params.length === 14 || params.length === 13 || params.length === 12;
      const hasTapeFlag = params.length === 14;
      const hasVGradeRanges = params.length === 14 || params.length === 13;
      const hasGradingScale = params.length === 14 || params.length === 13 || params.length === 12 || params.length === 10;
      const name = hasMetadata ? maybeNameOrStartTime : null;
      const description = hasMetadata ? maybeDescriptionOrEndTime : null;
      const startTime = hasMetadata ? maybeStartTimeOrDurationSeconds : maybeNameOrStartTime;
      const endTime = hasMetadata ? maybeEndTimeOrGradingScaleType : maybeDescriptionOrEndTime;
      const durationSeconds = hasMetadata ? maybeDurationSecondsOrGradingScaleName : maybeStartTimeOrDurationSeconds;
      const gradingScaleType = hasMetadata ? maybeGradingScaleTypeOrGradesJson : maybeEndTimeOrGradingScaleType;
      const gradingScaleName = hasMetadata ? maybeGradingScaleNameOrCreatedAt : maybeDurationSecondsOrGradingScaleName;
      const gradingScaleGradesJson = hasMetadata ? maybeGradingScaleGradesJsonOrUpdatedAt : maybeGradingScaleTypeOrGradesJson;
      const gradingScaleIsTape = hasTapeFlag ? maybeGradingScaleIsTapeOrRangesJson : 0;
      const gradingScaleRangesJson = hasTapeFlag ? maybeGradingScaleRangesJsonOrCreatedAt : hasVGradeRanges ? maybeGradingScaleIsTapeOrRangesJson : '{}';
      const createdAt = hasMetadata
        ? hasVGradeRanges
          ? hasTapeFlag
            ? maybeCreatedAtOrUpdatedAt
            : maybeGradingScaleRangesJsonOrCreatedAt
          : maybeGradingScaleRangesJsonOrCreatedAt
        : hasGradingScale
          ? maybeGradingScaleNameOrCreatedAt
          : maybeEndTimeOrGradingScaleType;
      const updatedAt = hasMetadata
        ? hasVGradeRanges
          ? hasTapeFlag
            ? maybeUpdatedAtOrDeletedAt
            : maybeCreatedAtOrUpdatedAt
          : maybeCreatedAtOrUpdatedAt
        : hasGradingScale
          ? maybeGradingScaleGradesJsonOrUpdatedAt
          : maybeDurationSecondsOrGradingScaleName;
      const deletedAt = hasMetadata
        ? hasVGradeRanges
          ? hasTapeFlag
            ? maybeDeletedAt
            : maybeUpdatedAtOrDeletedAt
          : maybeUpdatedAtOrDeletedAt
        : hasGradingScale
          ? maybeGradingScaleRangesJsonOrCreatedAt
          : maybeGradingScaleTypeOrGradesJson;
      this.state.sessions.push({
        id: String(id),
        name: name == null ? null : String(name),
        description: description == null ? null : String(description),
        start_time: String(startTime),
        end_time: endTime == null ? null : String(endTime),
        duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
        grading_scale_grades_json: hasGradingScale
          ? String(gradingScaleGradesJson)
          : '["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10+"]',
        grading_scale_v_ranges_json: String(gradingScaleRangesJson),
        grading_scale_is_tape: Number(gradingScaleIsTape),
        grading_scale_name: hasGradingScale ? String(gradingScaleName) : 'V Scale',
        grading_scale_type: hasGradingScale ? String(gradingScaleType) : 'v_scale',
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into user_profile')) {
      const [id, displayName, climberType, badgePreference, createdAt, updatedAt, deletedAt] = params;
      this.state.profiles.push({
        id: String(id),
        badge_preference: String(badgePreference),
        climber_type: String(climberType),
        created_at: String(createdAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
        display_name: String(displayName),
        updated_at: String(updatedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into climbing_preferences')) {
      const [
        id,
        defaultClimbGrade,
        defaultQuickGrade,
        requireColourSelection,
        gradingScaleType,
        selectedGradingScaleId,
        customGradingScaleName,
        customGradesJson,
        customScalesJson,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;
      this.state.climbingPreferences.push({
        id: String(id),
        created_at: String(createdAt),
        custom_grades_json: String(customGradesJson),
        custom_grading_scale_name: String(customGradingScaleName),
        default_climb_grade: String(defaultClimbGrade),
        default_quick_grade: String(defaultQuickGrade),
        deleted_at: deletedAt == null ? null : String(deletedAt),
        grading_scale_type: String(gradingScaleType),
        selected_grading_scale_id: String(selectedGradingScaleId),
        custom_scales_json: String(customScalesJson),
        require_colour_selection: Number(requireColourSelection),
        updated_at: String(updatedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('insert into climbing_locations')) {
      const [id, name, type, gradingScaleId, isSelected, createdAt, updatedAt, deletedAt] = params;
      this.state.locations.push({
        id: String(id),
        name: String(name),
        type: String(type),
        grading_scale_id: String(gradingScaleId),
        is_selected: Number(isSelected),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        deleted_at: deletedAt == null ? null : String(deletedAt),
      });
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update climbing_preferences')) {
      const [
        defaultClimbGrade,
        defaultQuickGrade,
        requireColourSelection,
        gradingScaleType,
        selectedGradingScaleId,
        customGradingScaleName,
        customGradesJson,
        customScalesJson,
        updatedAt,
        id,
      ] = params;
      this.state.climbingPreferences = this.state.climbingPreferences.map((preferences) =>
        preferences.id === id
          ? {
              ...preferences,
              custom_grades_json: String(customGradesJson),
              custom_grading_scale_name: String(customGradingScaleName),
              default_climb_grade: String(defaultClimbGrade),
              default_quick_grade: String(defaultQuickGrade),
              grading_scale_type: String(gradingScaleType),
              selected_grading_scale_id: String(selectedGradingScaleId),
              custom_scales_json: String(customScalesJson),
              require_colour_selection: Number(requireColourSelection),
              updated_at: String(updatedAt),
            }
          : preferences,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update climbing_locations set is_selected = 0')) {
      this.state.locations = this.state.locations.map((location) =>
        location.deleted_at === null ? { ...location, is_selected: 0 } : location,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update climbing_locations set is_selected = 1')) {
      const [updatedAt, id] = params;
      this.state.locations = this.state.locations.map((location) =>
        location.id === id && location.deleted_at === null
          ? { ...location, is_selected: 1, updated_at: String(updatedAt) }
          : location,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update climbing_locations')) {
      const [name, type, gradingScaleId, isSelected, deletedAt, updatedAt, id] = params;
      this.state.locations = this.state.locations.map((location) =>
        location.id === id
          ? {
              ...location,
              name: String(name),
              type: String(type),
              grading_scale_id: String(gradingScaleId),
              is_selected: Number(isSelected),
              deleted_at: deletedAt == null ? null : String(deletedAt),
              updated_at: String(updatedAt),
            }
          : location,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update user_profile')) {
      const [displayName, climberType, badgePreference, updatedAt, id] = params;
      this.state.profiles = this.state.profiles.map((profile) =>
        profile.id === id
          ? {
              ...profile,
              badge_preference: String(badgePreference),
              climber_type: String(climberType),
              display_name: String(displayName),
              updated_at: String(updatedAt),
            }
          : profile,
      );
      writeState(this.state);
      return;
    }

    if (normalizedSql.startsWith('update sessions')) {
      const [maybeNameOrEndTime, maybeDescriptionOrDurationSeconds, maybeEndTimeOrDeletedAt, maybeDurationSecondsOrUpdatedAt, maybeDeletedAtOrId, maybeUpdatedAt, maybeId] = params;
      const hasMetadata = params.length === 7;
      const name = hasMetadata ? maybeNameOrEndTime : undefined;
      const description = hasMetadata ? maybeDescriptionOrDurationSeconds : undefined;
      const endTime = hasMetadata ? maybeEndTimeOrDeletedAt : maybeNameOrEndTime;
      const durationSeconds = hasMetadata ? maybeDurationSecondsOrUpdatedAt : maybeDescriptionOrDurationSeconds;
      const deletedAt = hasMetadata ? maybeDeletedAtOrId : maybeEndTimeOrDeletedAt;
      const updatedAt = hasMetadata ? maybeUpdatedAt : maybeDurationSecondsOrUpdatedAt;
      const id = hasMetadata ? maybeId : maybeDeletedAtOrId;
      this.state.sessions = this.state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              deleted_at: deletedAt == null ? null : String(deletedAt),
              description: hasMetadata ? (description == null ? null : String(description)) : session.description,
              duration_seconds: durationSeconds == null ? null : Number(durationSeconds),
              end_time: endTime == null ? null : String(endTime),
              name: hasMetadata ? (name == null ? null : String(name)) : session.name,
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

    if (normalizedSql.includes('from user_profile')) {
      const [profileId] = params;
      let rows = this.state.profiles;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((profile) => profile.id === profileId && profile.deleted_at === null);
      }

      return rows as T[];
    }

    if (normalizedSql.includes('from climbing_preferences')) {
      const [preferencesId] = params;
      let rows = this.state.climbingPreferences;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((preferences) => preferences.id === preferencesId && preferences.deleted_at === null);
      }

      return rows as T[];
    }

    if (normalizedSql.includes('from climbing_locations')) {
      const [firstParam] = params;
      let rows = this.state.locations;

      if (normalizedSql.includes('where id = ?')) {
        rows = rows.filter((location) => location.id === firstParam && location.deleted_at === null);
      } else if (normalizedSql.includes('is_selected = 1')) {
        rows = rows.filter((location) => location.is_selected === 1 && location.deleted_at === null);
        return sortByDesc(rows, (location) => location.updated_at) as T[];
      } else if (normalizedSql.includes('deleted_at is null')) {
        rows = rows.filter((location) => location.deleted_at === null);
      }

      return [...rows].sort((left, right) => {
        const selectedDelta = right.is_selected - left.is_selected;
        return selectedDelta === 0 ? left.name.localeCompare(right.name) : selectedDelta;
      }) as T[];
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
