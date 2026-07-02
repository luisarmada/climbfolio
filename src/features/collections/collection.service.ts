import {
  builtInGradingScales,
  getGradeVRange,
  getGradeVRank,
  getVGradeIndex,
} from '../../domain/gradeScales';
import type { CustomGradingScale, GradingScaleSnapshot } from '../../domain/gradeScales';
import type { ClimbingPreferences } from '../../domain/models';
import { getClimbScaleSnapshot, getSessionScaleSnapshot } from '../climbs/climbScale';
import { featureSections, getKnownFeature, getKnownFeatures } from '../climbs/climb.options';
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

type CollectionGradeIndexLookup = {
  gradeIndexes: Map<string, number>;
  gradeIndexByVRank: Map<number, number>;
};

type CollectionCellSessionSets = {
  attemptedSessionIds: Set<string>;
  sentSessionIds: Set<string>;
  triedSessionIds: Set<string>;
};

type FeatureRowRegistration = {
  cellSessionSets: CollectionCellSessionSets[];
  row: FeatureCollectionRow;
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
  const addScaleOption = (scale: GradingScaleSnapshot) => {
    const key = getCollectionScaleKey(scale);

    if (!options.has(key)) {
      options.set(key, {
        key,
        label: scale.gradingScaleName,
        scale,
      });
    }
  };

  builtInGradingScales.forEach((scale) => {
    addScaleOption(scale);
  });

  (preferences?.customScales ?? []).forEach((customScale) => {
    addScaleOption(customScaleToSnapshot(customScale));
  });

  summaries.forEach((summary) => {
    addScaleOption(sessionScaleSnapshot(summary));
    summary.climbs.forEach((climb) => {
      addScaleOption(getClimbScaleSnapshot(climb, summary.session));
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
  const shouldFilterByLocation = locationId !== allLocationsFilterId;

  return summaries.filter((summary) => {
    if (shouldFilterByLocation && summary.session.locationId !== locationId) {
      return false;
    }

    return scaleMatchesSummary(summary, scaleKey);
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

function createCellSessionSets(scale: GradingScaleSnapshot): CollectionCellSessionSets[] {
  return scale.gradingScaleGrades.map(() => ({
    attemptedSessionIds: new Set<string>(),
    sentSessionIds: new Set<string>(),
    triedSessionIds: new Set<string>(),
  }));
}

function addUniqueSessionId(items: string[], itemSet: Set<string>, item: string) {
  if (!itemSet.has(item)) {
    itemSet.add(item);
    items.push(item);
  }
}

function createCollectionGradeIndexLookup(scale: GradingScaleSnapshot): CollectionGradeIndexLookup {
  return {
    gradeIndexByVRank: new Map<number, number>(),
    gradeIndexes: new Map(scale.gradingScaleGrades.map((grade, index) => [grade, index])),
  };
}

function getTargetScaleGradeIndexForVRank(vRank: number, scale: GradingScaleSnapshot, lookup: CollectionGradeIndexLookup) {
  const cachedIndex = lookup.gradeIndexByVRank.get(vRank);

  if (cachedIndex !== undefined) {
    return cachedIndex;
  }

  const matchingIndex = scale.gradingScaleGrades.findIndex((grade) => {
    const range = getGradeVRange(grade, scale);
    return getVGradeIndex(range.min) <= vRank && getVGradeIndex(range.max) >= vRank;
  });

  if (matchingIndex >= 0) {
    lookup.gradeIndexByVRank.set(vRank, matchingIndex);
    return matchingIndex;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  scale.gradingScaleGrades.forEach((grade, index) => {
    const gradeRank = getGradeVRank(grade, scale);
    const gradeDistance = Math.abs(gradeRank - vRank);

    if (gradeDistance < closestDistance) {
      closestDistance = gradeDistance;
      closestIndex = index;
    }
  });

  lookup.gradeIndexByVRank.set(vRank, closestIndex);
  return closestIndex;
}

function getCollectionGradeIndexWithLookup(
  grade: string,
  sourceScale: GradingScaleSnapshot,
  targetScale: GradingScaleSnapshot,
  lookup: CollectionGradeIndexLookup,
) {
  const exactIndex = lookup.gradeIndexes.get(grade);

  if (exactIndex !== undefined) {
    return exactIndex;
  }

  return getTargetScaleGradeIndexForVRank(getGradeVRank(grade, sourceScale), targetScale, lookup);
}

export function getCollectionGradeIndex(grade: string, sourceScale: GradingScaleSnapshot, targetScale: GradingScaleSnapshot) {
  return getCollectionGradeIndexWithLookup(grade, sourceScale, targetScale, createCollectionGradeIndexLookup(targetScale));
}

export function buildCollectionRows(summaries: SessionSummary[], scale: GradingScaleSnapshot, scaleKey = getCollectionScaleKey(scale)) {
  const rowsByFeature = new Map<string, FeatureRowRegistration>();
  const gradeLookup = createCollectionGradeIndexLookup(scale);

  featureSections.forEach((section) => {
    section.features.forEach((feature) => {
      rowsByFeature.set(feature, {
        cellSessionSets: createCellSessionSets(scale),
        row: {
          bestSentGrade: null,
          bestSentIndex: -1,
          cells: createEmptyCells(scale),
          feature,
          sectionTitle: section.title,
        },
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

      const gradeIndex = getCollectionGradeIndexWithLookup(climb.grade, climbScale, scale, gradeLookup);
      const gradeLabel = scale.gradingScaleGrades[gradeIndex] ?? climb.grade;

      features.forEach((feature) => {
        const registration = rowsByFeature.get(feature);
        const cell = registration?.row.cells[gradeIndex];
        const cellSets = registration?.cellSessionSets[gradeIndex];

        if (!registration || !cell || !cellSets) {
          return;
        }

        cell.attemptedClimbs += 1;
        addUniqueSessionId(cell.attemptedSessionIds, cellSets.attemptedSessionIds, summary.session.id);

        if (climb.completed) {
          cell.sentClimbs += 1;
          addUniqueSessionId(cell.sentSessionIds, cellSets.sentSessionIds, summary.session.id);

          if (gradeIndex > registration.row.bestSentIndex) {
            registration.row.bestSentIndex = gradeIndex;
            registration.row.bestSentGrade = gradeLabel;
          }

          return;
        }

        cell.triedClimbs += 1;
        addUniqueSessionId(cell.triedSessionIds, cellSets.triedSessionIds, summary.session.id);
      });
    });
  });

  return featureSections.flatMap((section) =>
    section.features
      .map((feature) => rowsByFeature.get(feature)?.row)
      .filter((row): row is FeatureCollectionRow => Boolean(row)),
  );
}

export function buildDisplayRows(rows: FeatureCollectionRow[]): MatrixDisplayRow[] {
  const rowsBySectionTitle = new Map<string, FeatureCollectionRow[]>();

  rows.forEach((row) => {
    const sectionRows = rowsBySectionTitle.get(row.sectionTitle);

    if (sectionRows) {
      sectionRows.push(row);
      return;
    }

    rowsBySectionTitle.set(row.sectionTitle, [row]);
  });

  return featureSections.flatMap<MatrixDisplayRow>((section) => [
    { title: section.title, type: 'section' },
    ...(rowsBySectionTitle.get(section.title) ?? []).map<MatrixDisplayRow>((row) => ({ row, type: 'feature' })),
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
  let total = 0;

  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.sentSessionIds.length > 0) {
        total += 1;
      }
    });
  });

  return total;
}

export function countTriedGapCells(rows: FeatureCollectionRow[]) {
  let total = 0;

  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.sentSessionIds.length === 0 && cell.triedSessionIds.length > 0) {
        total += 1;
      }
    });
  });

  return total;
}

export function countFeaturesCovered(rows: FeatureCollectionRow[]) {
  let total = 0;

  rows.forEach((row) => {
    if (row.cells.some((cell) => cell.sentSessionIds.length > 0)) {
      total += 1;
    }
  });

  return total;
}

export function buildTriedGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
  const targets: CollectionGoalTarget[] = [];

  rows.forEach((row) => {
    row.cells.forEach((cell, gradeIndex) => {
      if (cell.sentSessionIds.length > 0 || cell.triedSessionIds.length === 0) {
        return;
      }

      targets.push({
        feature: row.feature,
        grade: scale.gradingScaleGrades[gradeIndex] ?? 'V0',
        gradeIndex,
        priority: gradeIndex + cell.triedSessionIds.length / 100,
        status: 'tried',
        triedSessions: cell.triedSessionIds.length,
      });
    });
  });

  return targets.sort((left, right) => right.priority - left.priority).slice(0, 3);
}

export function buildOpenGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
  const targets: CollectionGoalTarget[] = [];

  rows.forEach((row) => {
    const startIndex = Math.max(0, row.bestSentIndex + 1);

    for (let openIndex = startIndex; openIndex < row.cells.length; openIndex += 1) {
      const cell = row.cells[openIndex];

      if (!cell || cell.sentSessionIds.length > 0) {
        continue;
      }

      targets.push({
        feature: row.feature,
        grade: scale.gradingScaleGrades[openIndex] ?? 'V0',
        gradeIndex: openIndex,
        priority: row.bestSentIndex + 1 / 100,
        status: 'open',
        triedSessions: cell.triedSessionIds.length,
      });
      return;
    }
  });

  return targets.sort((left, right) => right.priority - left.priority).slice(0, 3);
}

function hasKnownFeature(features: string[], feature: string) {
  for (const item of features) {
    if (getKnownFeature(item) === feature) {
      return true;
    }
  }

  return false;
}

export function findCollectionCellSessionMatches(
  summaries: SessionSummary[],
  scale: GradingScaleSnapshot,
  feature: string,
  grade: string,
) {
  const scaleKey = getCollectionScaleKey(scale);
  const gradeLookup = createCollectionGradeIndexLookup(scale);
  const matches: CollectionSessionMatch[] = [];

  summaries.forEach((summary) => {
    let matchingAttempts = 0;
    let matchingClimbs = 0;

    summary.climbs.forEach((climb) => {
      if (!climb.completed) {
        return;
      }

      const climbScale = getClimbScaleSnapshot(climb, summary.session);

      if (getCollectionScaleKey(climbScale) !== scaleKey) {
        return;
      }

      if (!hasKnownFeature(climb.holdTypes, feature)) {
        return;
      }

      const gradeIndex = getCollectionGradeIndexWithLookup(climb.grade, climbScale, scale, gradeLookup);

      if (scale.gradingScaleGrades[gradeIndex] !== grade) {
        return;
      }

      matchingAttempts += climb.attemptCount;
      matchingClimbs += 1;
    });

    if (matchingClimbs > 0) {
      matches.push({
        matchingAttempts,
        matchingClimbs,
        summary,
      });
    }
  });

  return matches;
}
