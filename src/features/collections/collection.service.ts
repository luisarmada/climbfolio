import {
  CustomGradingScale,
  GradingScaleSnapshot,
  builtInGradingScales,
  getGradeVRange,
  getGradeVRank,
  getVGradeIndex,
} from '../../domain/gradeScales';
import { ClimbingPreferences } from '../../domain/models';
import { featureSections, getClimbScaleSnapshot, getKnownFeatures, getSessionScaleSnapshot } from '../climbs';
import type { SessionSummary } from '../summaries';

export const allLocationsFilterId = 'all_locations';

export type CollectionScaleOption = {
  key: string;
  label: string;
  scale: GradingScaleSnapshot;
};

export type CollectionCell = {
  attemptedClimbs: number;
  attemptedSessionIds: string[];
  sentClimbs: number;
  sentSessionIds: string[];
  triedClimbs: number;
  triedSessionIds: string[];
};

export type CollectionCellStatus = 'open' | 'sent' | 'strong' | 'tried';

export type FeatureCollectionRow = {
  bestSentGrade: string | null;
  bestSentIndex: number;
  cells: CollectionCell[];
  feature: string;
  sectionTitle: string;
};

export type MatrixDisplayRow =
  | {
      title: string;
      type: 'section';
    }
  | {
      row: FeatureCollectionRow;
      type: 'feature';
    };

export type CollectionGoalStatus = 'open' | 'tried';

export type CollectionGoalTarget = {
  feature: string;
  grade: string;
  gradeIndex: number;
  priority: number;
  status: CollectionGoalStatus;
  triedSessions: number;
};

export type CollectionSessionMatch = {
  matchingAttempts: number;
  matchingClimbs: number;
  summary: SessionSummary;
};

function normalizeScaleName(name: string) {
  return name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_') || 'custom';
}

export function getCollectionScaleKey(scale: Pick<GradingScaleSnapshot, 'gradingScaleName' | 'gradingScaleType'>) {
  return scale.gradingScaleType === 'custom' ? `custom:${normalizeScaleName(scale.gradingScaleName)}` : scale.gradingScaleType;
}

function getCustomScaleKey(scale: CustomGradingScale) {
  return `custom:${normalizeScaleName(scale.name)}`;
}

function customScaleToSnapshot(scale: CustomGradingScale): GradingScaleSnapshot {
  return {
    gradingScaleGrades: scale.grades,
    gradingScaleIsTape: Boolean(scale.isTape),
    gradingScaleName: scale.name,
    gradingScaleType: 'custom',
    gradingScaleVGradeRanges: scale.vGradeRanges,
  };
}

function sessionScaleSnapshot(summary: SessionSummary): GradingScaleSnapshot {
  return getSessionScaleSnapshot(summary.session);
}

export function buildCollectionScaleOptions(preferences: ClimbingPreferences | null, summaries: SessionSummary[]): CollectionScaleOption[] {
  const options = new Map<string, CollectionScaleOption>();

  builtInGradingScales.forEach((scale) => {
    options.set(getCollectionScaleKey(scale), {
      key: getCollectionScaleKey(scale),
      label: scale.gradingScaleName,
      scale,
    });
  });

  (preferences?.customScales ?? []).forEach((customScale) => {
    const scale = customScaleToSnapshot(customScale);
    const key = getCustomScaleKey(customScale);
    options.set(key, {
      key,
      label: scale.gradingScaleName,
      scale,
    });
  });

  summaries.forEach((summary) => {
    [sessionScaleSnapshot(summary), ...summary.climbs.map((climb) => getClimbScaleSnapshot(climb, summary.session))].forEach((scale) => {
      const key = getCollectionScaleKey(scale);

      if (!options.has(key)) {
        options.set(key, {
          key,
          label: scale.gradingScaleName,
          scale,
        });
      }
    });
  });

  return [...options.values()];
}

export function getPreferredCollectionScaleKey(preferences: ClimbingPreferences | null) {
  const selected = preferences?.selectedGradingScaleId ?? 'v_scale';

  if (selected === 'v_scale' || selected === 'font') {
    return selected;
  }

  const customScale = preferences?.customScales.find((scale) => scale.id === selected);
  return customScale ? getCustomScaleKey(customScale) : 'v_scale';
}

export function getCollectionScaleKeyForGradingScaleId(preferences: ClimbingPreferences | null, gradingScaleId: string | null | undefined) {
  const selected = gradingScaleId ?? 'v_scale';

  if (selected === 'v_scale' || selected === 'font') {
    return selected;
  }

  const customScale = preferences?.customScales.find((scale) => scale.id === selected);
  return customScale ? getCustomScaleKey(customScale) : 'v_scale';
}

function scaleMatchesSummary(summary: SessionSummary, scaleKey: string) {
  return (
    getCollectionScaleKey(summary.session) === scaleKey ||
    summary.climbs.some((climb) => getCollectionScaleKey(getClimbScaleSnapshot(climb, summary.session)) === scaleKey)
  );
}

export function filterCollectionSummaries(summaries: SessionSummary[], scaleKey: string, locationId: string) {
  return summaries.filter((summary) => {
    const scaleMatches = scaleMatchesSummary(summary, scaleKey);
    const locationMatches = locationId === allLocationsFilterId || summary.session.locationId === locationId;

    return scaleMatches && locationMatches;
  });
}

function createEmptyCells(scale: GradingScaleSnapshot): CollectionCell[] {
  return scale.gradingScaleGrades.map(() => ({
    attemptedClimbs: 0,
    attemptedSessionIds: [],
    sentClimbs: 0,
    sentSessionIds: [],
    triedClimbs: 0,
    triedSessionIds: [],
  }));
}

function addUnique(items: string[], item: string) {
  if (!items.includes(item)) {
    items.push(item);
  }
}

function getScaleGradeForVRank(vRank: number, scale: GradingScaleSnapshot) {
  const matchingGrade = scale.gradingScaleGrades.find((grade) => {
    const range = getGradeVRange(grade, scale);
    return getVGradeIndex(range.min) <= vRank && getVGradeIndex(range.max) >= vRank;
  });

  if (matchingGrade) {
    return matchingGrade;
  }

  return scale.gradingScaleGrades.reduce((closest, grade) => {
    const closestRank = getGradeVRank(closest, scale);
    const gradeRank = getGradeVRank(grade, scale);

    return Math.abs(gradeRank - vRank) < Math.abs(closestRank - vRank) ? grade : closest;
  }, scale.gradingScaleGrades[0] ?? 'V0');
}

export function getCollectionGradeIndex(grade: string, sourceScale: GradingScaleSnapshot, targetScale: GradingScaleSnapshot) {
  const exactIndex = targetScale.gradingScaleGrades.indexOf(grade);

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const equivalentGrade = getScaleGradeForVRank(getGradeVRank(grade, sourceScale), targetScale);
  const equivalentIndex = targetScale.gradingScaleGrades.indexOf(equivalentGrade);

  return equivalentIndex >= 0 ? equivalentIndex : 0;
}

export function buildCollectionRows(summaries: SessionSummary[], scale: GradingScaleSnapshot, scaleKey = getCollectionScaleKey(scale)) {
  const rowsByFeature = new Map<string, FeatureCollectionRow>();

  featureSections.forEach((section) => {
    section.features.forEach((feature) => {
      rowsByFeature.set(feature, {
        bestSentGrade: null,
        bestSentIndex: -1,
        cells: createEmptyCells(scale),
        feature,
        sectionTitle: section.title,
      });
    });
  });

  summaries.forEach((summary) => {
    summary.climbs.forEach((climb) => {
      const climbScale = getClimbScaleSnapshot(climb, summary.session);

      if (getCollectionScaleKey(climbScale) !== scaleKey) {
        return;
      }

      const features = getKnownFeatures(climb.holdTypes);

      if (features.length === 0) {
        return;
      }

      const gradeIndex = getCollectionGradeIndex(climb.grade, climbScale, scale);
      const gradeLabel = scale.gradingScaleGrades[gradeIndex] ?? climb.grade;

      features.forEach((feature) => {
        const row = rowsByFeature.get(feature);
        const cell = row?.cells[gradeIndex];

        if (!row || !cell) {
          return;
        }

        cell.attemptedClimbs += 1;
        addUnique(cell.attemptedSessionIds, summary.session.id);

        if (climb.completed) {
          cell.sentClimbs += 1;
          addUnique(cell.sentSessionIds, summary.session.id);

          if (gradeIndex > row.bestSentIndex) {
            row.bestSentIndex = gradeIndex;
            row.bestSentGrade = gradeLabel;
          }

          return;
        }

        cell.triedClimbs += 1;
        addUnique(cell.triedSessionIds, summary.session.id);
      });
    });
  });

  return featureSections.flatMap((section) =>
    section.features
      .map((feature) => rowsByFeature.get(feature))
      .filter((row): row is FeatureCollectionRow => Boolean(row)),
  );
}

export function buildDisplayRows(rows: FeatureCollectionRow[]): MatrixDisplayRow[] {
  return featureSections.flatMap<MatrixDisplayRow>((section) => [
    { title: section.title, type: 'section' },
    ...rows
      .filter((row) => row.sectionTitle === section.title)
      .map<MatrixDisplayRow>((row) => ({ row, type: 'feature' })),
  ]);
}

export function getCellState(cell: CollectionCell): CollectionCellStatus {
  if (cell.sentSessionIds.length >= 3) {
    return 'strong';
  }

  if (cell.sentSessionIds.length > 0) {
    return 'sent';
  }

  if (cell.triedSessionIds.length > 0) {
    return 'tried';
  }

  return 'open';
}

export function isBestSentCell(row: FeatureCollectionRow, gradeIndex: number) {
  return row.bestSentIndex === gradeIndex && row.cells[gradeIndex]?.sentSessionIds.length;
}

export function countCollectedCells(rows: FeatureCollectionRow[]) {
  return rows.reduce((total, row) => total + row.cells.filter((cell) => cell.sentSessionIds.length > 0).length, 0);
}

export function countTriedGapCells(rows: FeatureCollectionRow[]) {
  return rows.reduce((total, row) => total + row.cells.filter((cell) => cell.sentSessionIds.length === 0 && cell.triedSessionIds.length > 0).length, 0);
}

export function countFeaturesCovered(rows: FeatureCollectionRow[]) {
  return rows.filter((row) => row.cells.some((cell) => cell.sentSessionIds.length > 0)).length;
}

export function buildTriedGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
  return rows
    .flatMap((row) =>
      row.cells.map<CollectionGoalTarget | null>((cell, gradeIndex) => {
        if (cell.sentSessionIds.length > 0 || cell.triedSessionIds.length === 0) {
          return null;
        }

        return {
          feature: row.feature,
          grade: scale.gradingScaleGrades[gradeIndex] ?? 'V0',
          gradeIndex,
          priority: gradeIndex + cell.triedSessionIds.length / 100,
          status: 'tried',
          triedSessions: cell.triedSessionIds.length,
        };
      }),
    )
    .filter((target): target is CollectionGoalTarget => Boolean(target))
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);
}

export function buildOpenGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
  return rows
    .map<CollectionGoalTarget | null>((row) => {
      const startIndex = Math.max(0, row.bestSentIndex + 1);
      const openIndex = row.cells.findIndex((cell, index) => index >= startIndex && cell.sentSessionIds.length === 0);

      if (openIndex < 0) {
        return null;
      }

      return {
        feature: row.feature,
        grade: scale.gradingScaleGrades[openIndex] ?? 'V0',
        gradeIndex: openIndex,
        priority: row.bestSentIndex + 1 / 100,
        status: 'open',
        triedSessions: row.cells[openIndex]?.triedSessionIds.length ?? 0,
      };
    })
    .filter((target): target is CollectionGoalTarget => Boolean(target))
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);
}

export function findCollectionCellSessionMatches(
  summaries: SessionSummary[],
  scale: GradingScaleSnapshot,
  feature: string,
  grade: string,
) {
  const scaleKey = getCollectionScaleKey(scale);

  return summaries
    .map<CollectionSessionMatch | null>((summary) => {
      const matchingClimbs = summary.climbs.filter((climb) => {
        const climbScale = getClimbScaleSnapshot(climb, summary.session);

        return (
          getCollectionScaleKey(climbScale) === scaleKey &&
          climb.completed &&
          getKnownFeatures(climb.holdTypes).includes(feature) &&
          scale.gradingScaleGrades[getCollectionGradeIndex(climb.grade, climbScale, scale)] === grade
        );
      });

      if (matchingClimbs.length === 0) {
        return null;
      }

      return {
        matchingAttempts: matchingClimbs.reduce((total, climb) => total + climb.attemptCount, 0),
        matchingClimbs: matchingClimbs.length,
        summary,
      };
    })
    .filter((match): match is CollectionSessionMatch => Boolean(match));
}
