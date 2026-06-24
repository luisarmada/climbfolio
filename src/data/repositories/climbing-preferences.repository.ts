import { ClimbingPreferences, UpdateClimbingPreferencesInput } from '../../domain/models';
import {
  CustomGradingScale,
  normalizeCustomGrades,
  normalizeCustomScales,
  resolveSelectedGradingScale,
  vScaleGrades,
} from '../../domain/gradeScales';
import { nowIso } from '../../utils/dates';
import { initializeDatabase } from '../db/client';

const localPreferencesId = 'local_climbing_preferences';
const fallbackGrade = vScaleGrades[1] ?? 'V0';

type ClimbingPreferencesRow = {
  custom_grades_json?: string | null;
  custom_scales_json?: string | null;
  custom_grading_scale_name?: string | null;
  id: string;
  default_climb_grade: string;
  default_quick_grade: string;
  grading_scale_type?: string | null;
  require_colour_selection: number;
  selected_grading_scale_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ClimbingPreferencesRepository = {
  getLocalPreferences(): Promise<ClimbingPreferences>;
  updateLocalPreferences(input: UpdateClimbingPreferencesInput): Promise<ClimbingPreferences>;
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

function parseCustomScales(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeCustomScales(
      parsed
        .filter(
          (
            item,
          ): item is {
            grades: string[];
            id: string;
            isTape?: boolean;
            name: string;
            vGradeRanges?: CustomGradingScale['vGradeRanges'];
          } => {
          return (
            item != null &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            Array.isArray(item.grades)
          );
        },
        )
        .map((item) => ({
          grades: item.grades,
          id: item.id,
          isTape: Boolean(item.isTape),
          name: item.name,
          vGradeRanges: item.vGradeRanges ?? {},
        })),
    );
  } catch {
    return [];
  }
}

function getLegacyCustomScale(row: ClimbingPreferencesRow) {
  const grades = normalizeCustomGrades(parseJsonArray(row.custom_grades_json));

  if (grades.length === 0) {
    return null;
  }

  return {
    grades,
    id: 'custom_legacy',
    isTape: false,
    name: row.custom_grading_scale_name || 'Custom scale',
    vGradeRanges: {},
  };
}

function normalizeSelectedScaleId(selectedScaleId: string | null | undefined, customScales: CustomGradingScale[]) {
  if (selectedScaleId === 'v_scale' || selectedScaleId === 'font') {
    return selectedScaleId;
  }

  if (selectedScaleId && customScales.some((scale) => scale.id === selectedScaleId)) {
    return selectedScaleId;
  }

  return 'v_scale';
}

function mapPreferences(row: ClimbingPreferencesRow): ClimbingPreferences {
  const parsedCustomScales = parseCustomScales(row.custom_scales_json);
  const legacyCustomScale = getLegacyCustomScale(row);
  const customScales =
    parsedCustomScales.length > 0 || !legacyCustomScale ? parsedCustomScales : normalizeCustomScales([legacyCustomScale]);
  const legacySelectedScaleId = row.grading_scale_type === 'custom' ? customScales[0]?.id : row.grading_scale_type;

  return {
    id: row.id,
    createdAt: row.created_at,
    customScales,
    deletedAt: row.deleted_at,
    selectedGradingScaleId: normalizeSelectedScaleId(row.selected_grading_scale_id ?? legacySelectedScaleId, customScales),
    updatedAt: row.updated_at,
  };
}

async function createDefaultPreferences() {
  const database = await initializeDatabase();
  const timestamp = nowIso();
  const preferences: ClimbingPreferences = {
    id: localPreferencesId,
    createdAt: timestamp,
    customScales: [],
    deletedAt: null,
    selectedGradingScaleId: 'v_scale',
    updatedAt: timestamp,
  };

  await database.runAsync(
    `
      INSERT INTO climbing_preferences (
        id, default_climb_grade, default_quick_grade, require_colour_selection, grading_scale_type,
        selected_grading_scale_id, custom_grading_scale_name, custom_grades_json, custom_scales_json,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      preferences.id,
      fallbackGrade,
      fallbackGrade,
      0,
      'v_scale',
      preferences.selectedGradingScaleId,
      'Custom',
      JSON.stringify([]),
      JSON.stringify(preferences.customScales),
      preferences.createdAt,
      preferences.updatedAt,
      preferences.deletedAt,
    ],
  );

  return preferences;
}

export const climbingPreferencesRepository: ClimbingPreferencesRepository = {
  async getLocalPreferences() {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ClimbingPreferencesRow>(
      'SELECT * FROM climbing_preferences WHERE id = ? AND deleted_at IS NULL LIMIT 1;',
      [localPreferencesId],
    );

    return row ? mapPreferences(row) : createDefaultPreferences();
  },

  async updateLocalPreferences(input) {
    const current = await climbingPreferencesRepository.getLocalPreferences();
    const database = await initializeDatabase();
    const updatedAt = nowIso();
    const customScales = normalizeCustomScales(input.customScales ?? current.customScales);
    const requestedScaleId = input.selectedGradingScaleId ?? current.selectedGradingScaleId;
    const selectedGradingScaleId = normalizeSelectedScaleId(requestedScaleId, customScales);
    const selectedScale = resolveSelectedGradingScale({ customScales, selectedGradingScaleId });
    const firstCustomScale = customScales[0];
    const next: ClimbingPreferences = {
      ...current,
      customScales,
      selectedGradingScaleId,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE climbing_preferences
        SET default_climb_grade = ?, default_quick_grade = ?, require_colour_selection = ?,
          grading_scale_type = ?, selected_grading_scale_id = ?, custom_grading_scale_name = ?,
          custom_grades_json = ?, custom_scales_json = ?, updated_at = ?
        WHERE id = ?;
      `,
      [
        fallbackGrade,
        fallbackGrade,
        0,
        selectedScale.gradingScaleType,
        next.selectedGradingScaleId,
        firstCustomScale?.name ?? 'Custom',
        JSON.stringify(firstCustomScale?.grades ?? []),
        JSON.stringify(next.customScales),
        next.updatedAt,
        next.id,
      ],
    );

    return next;
  },
};
