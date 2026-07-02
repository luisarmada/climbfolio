import { describe, expect, it } from 'vitest';
import {
  builtInGradingScales,
} from '../domain/gradeScales';
import type { GradingScaleSnapshot } from '../domain/gradeScales';
import type { Climb, Session } from '../domain/models';
import { getClimbScaleSnapshot } from '../features/climbs/climbScale';
import { featureSections, getKnownFeatures } from '../features/climbs/climb.options';
import {
  CollectionCell,
  CollectionGoalTarget,
  CollectionSessionMatch,
  FeatureCollectionRow,
  allLocationsFilterId,
  buildCollectionRows,
  buildDisplayRows,
  buildOpenGoalTargets,
  buildTriedGoalTargets,
  countCollectedCells,
  countFeaturesCovered,
  countTriedGapCells,
  filterCollectionSummaries,
  findCollectionCellSessionMatches,
} from '../features/collections';
import { getCollectionGradeIndex, getCollectionScaleKey } from '../features/collections/collection.service';
import { SessionSummary } from '../features/summaries';

const vScale = builtInGradingScales[0]!;
const fontScale = builtInGradingScales[1]!;

type FixtureClimbInput = {
  attemptCount: number;
  completed: boolean;
  grade: string;
  holdTypes: string[];
  scale?: GradingScaleSnapshot;
};

function createSession(id: string, locationId: string | null, scale = vScale): Session {
  const timestamp = '2026-05-01T10:00:00.000Z';

  return {
    createdAt: timestamp,
    deletedAt: null,
    description: null,
    durationSeconds: 3600,
    endTime: '2026-05-01T11:00:00.000Z',
    gradingScaleGrades: scale.gradingScaleGrades,
    gradingScaleIsTape: scale.gradingScaleIsTape,
    gradingScaleName: scale.gradingScaleName,
    gradingScaleType: scale.gradingScaleType,
    gradingScaleVGradeRanges: scale.gradingScaleVGradeRanges,
    id,
    locationId,
    locationName: locationId,
    locationType: locationId ? 'gym' : null,
    name: id,
    startTime: timestamp,
    updatedAt: timestamp,
    userId: 'local_user',
  };
}

function createClimb(session: Session, index: number, input: FixtureClimbInput): Climb {
  const timestamp = new Date(new Date(session.startTime).getTime() + index * 60_000).toISOString();
  const scaleOverride = input.scale
    ? {
        gradingScaleGrades: input.scale.gradingScaleGrades,
        gradingScaleIsTape: input.scale.gradingScaleIsTape,
        gradingScaleName: input.scale.gradingScaleName,
        gradingScaleType: input.scale.gradingScaleType,
        gradingScaleVGradeRanges: input.scale.gradingScaleVGradeRanges,
      }
    : {};

  return {
    ...scaleOverride,
    attemptCount: input.attemptCount,
    colour: null,
    completed: input.completed,
    createdAt: timestamp,
    deletedAt: null,
    durationSeconds: 300,
    endTime: timestamp,
    grade: input.grade,
    holdTypes: input.holdTypes,
    id: `${session.id}-climb-${index}`,
    restBeforeClimbSeconds: index === 0 ? null : 120,
    sessionId: session.id,
    sortOrder: index + 1,
    startTime: timestamp,
    updatedAt: timestamp,
  };
}

function createSummary(id: string, locationId: string | null, climbs: FixtureClimbInput[], scale = vScale): SessionSummary {
  const session = createSession(id, locationId, scale);
  const summaryClimbs = climbs.map((climb, index) => createClimb(session, index, climb));
  const totalAttempts = summaryClimbs.reduce((total, climb) => total + climb.attemptCount, 0);
  const completedClimbs = summaryClimbs.filter((climb) => climb.completed).length;

  return {
    attempts: [],
    averageAttemptsPerClimb: summaryClimbs.length === 0 ? 0 : totalAttempts / summaryClimbs.length,
    averageRestBetweenAttemptsSeconds: null,
    averageRestBetweenClimbsSeconds: 120,
    climbs: summaryClimbs,
    completedClimbs,
    completionRate: summaryClimbs.length === 0 ? 0 : Math.round((completedClimbs / summaryClimbs.length) * 100),
    highestGradeAttempted: null,
    highestGradeCompleted: null,
    mostCommonColour: null,
    mostCommonHoldType: null,
    session,
    totalAttempts,
    totalClimbs: summaryClimbs.length,
  };
}

function createRepresentativeSummaries() {
  return [
    createSummary('session-a', 'wall-a', [
      { attemptCount: 2, completed: true, grade: 'V2', holdTypes: ['Slab', 'Jug'] },
      { attemptCount: 1, completed: true, grade: 'V2', holdTypes: ['Slab', 'Cave', 'Unknown', 'Slab'] },
      { attemptCount: 4, completed: false, grade: 'V4', holdTypes: ['Crimp', 'Overhang'] },
    ]),
    createSummary('session-b', 'wall-a', [
      { attemptCount: 3, completed: true, grade: 'V2', holdTypes: ['Slab'] },
      { attemptCount: 5, completed: false, grade: 'V3', holdTypes: ['Slab'] },
      { attemptCount: 2, completed: true, grade: '6A', holdTypes: ['Slab'], scale: fontScale },
    ]),
    createSummary('session-c', 'wall-b', [
      { attemptCount: 1, completed: true, grade: 'V2', holdTypes: ['Slab'] },
      { attemptCount: 2, completed: true, grade: 'V5', holdTypes: ['Overhang', 'Pinch'] },
    ]),
    createSummary('session-d', 'wall-a', [
      { attemptCount: 6, completed: false, grade: 'V1', holdTypes: ['Crimp'] },
      { attemptCount: 1, completed: true, grade: 'V0', holdTypes: ['Warm-up'] },
    ]),
  ];
}

function legacyCreateEmptyCells(scale: GradingScaleSnapshot): CollectionCell[] {
  return scale.gradingScaleGrades.map(() => ({
    attemptedClimbs: 0,
    attemptedSessionIds: [],
    sentClimbs: 0,
    sentSessionIds: [],
    triedClimbs: 0,
    triedSessionIds: [],
  }));
}

function legacyAddUnique(items: string[], item: string) {
  if (!items.includes(item)) {
    items.push(item);
  }
}

function legacyScaleMatchesSummary(summary: SessionSummary, scaleKey: string) {
  return (
    getCollectionScaleKey(summary.session) === scaleKey ||
    summary.climbs.some((climb) => getCollectionScaleKey(getClimbScaleSnapshot(climb, summary.session)) === scaleKey)
  );
}

function legacyFilterCollectionSummaries(summaries: SessionSummary[], scaleKey: string, locationId: string) {
  return summaries.filter((summary) => {
    const scaleMatches = legacyScaleMatchesSummary(summary, scaleKey);
    const locationMatches = locationId === allLocationsFilterId || summary.session.locationId === locationId;

    return scaleMatches && locationMatches;
  });
}

function legacyBuildCollectionRows(summaries: SessionSummary[], scale: GradingScaleSnapshot, scaleKey = getCollectionScaleKey(scale)) {
  const rowsByFeature = new Map<string, FeatureCollectionRow>();

  featureSections.forEach((section) => {
    section.features.forEach((feature) => {
      rowsByFeature.set(feature, {
        bestSentGrade: null,
        bestSentIndex: -1,
        cells: legacyCreateEmptyCells(scale),
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
        legacyAddUnique(cell.attemptedSessionIds, summary.session.id);

        if (climb.completed) {
          cell.sentClimbs += 1;
          legacyAddUnique(cell.sentSessionIds, summary.session.id);

          if (gradeIndex > row.bestSentIndex) {
            row.bestSentIndex = gradeIndex;
            row.bestSentGrade = gradeLabel;
          }

          return;
        }

        cell.triedClimbs += 1;
        legacyAddUnique(cell.triedSessionIds, summary.session.id);
      });
    });
  });

  return featureSections.flatMap((section) =>
    section.features
      .map((feature) => rowsByFeature.get(feature))
      .filter((row): row is FeatureCollectionRow => Boolean(row)),
  );
}

function legacyBuildDisplayRows(rows: FeatureCollectionRow[]) {
  return featureSections.flatMap((section) => [
    { title: section.title, type: 'section' as const },
    ...rows
      .filter((row) => row.sectionTitle === section.title)
      .map((row) => ({ row, type: 'feature' as const })),
  ]);
}

function legacyCountCollectedCells(rows: FeatureCollectionRow[]) {
  return rows.reduce((total, row) => total + row.cells.filter((cell) => cell.sentSessionIds.length > 0).length, 0);
}

function legacyCountTriedGapCells(rows: FeatureCollectionRow[]) {
  return rows.reduce((total, row) => total + row.cells.filter((cell) => cell.sentSessionIds.length === 0 && cell.triedSessionIds.length > 0).length, 0);
}

function legacyCountFeaturesCovered(rows: FeatureCollectionRow[]) {
  return rows.filter((row) => row.cells.some((cell) => cell.sentSessionIds.length > 0)).length;
}

function legacyBuildTriedGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
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

function legacyBuildOpenGoalTargets(rows: FeatureCollectionRow[], scale: GradingScaleSnapshot) {
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

function legacyFindCollectionCellSessionMatches(
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

function serializeMatches(matches: CollectionSessionMatch[]) {
  return matches.map((match) => ({
    matchingAttempts: match.matchingAttempts,
    matchingClimbs: match.matchingClimbs,
    sessionId: match.summary.session.id,
  }));
}

describe('collection service', () => {
  it('keeps optimized collection calculations equivalent to the legacy scan implementation', () => {
    const summaries = createRepresentativeSummaries();
    const vScaleKey = getCollectionScaleKey(vScale);
    const fontScaleKey = getCollectionScaleKey(fontScale);
    const filteredSummaries = filterCollectionSummaries(summaries, vScaleKey, 'wall-a');
    const legacyFilteredSummaries = legacyFilterCollectionSummaries(summaries, vScaleKey, 'wall-a');

    expect(filteredSummaries.map((summary) => summary.session.id)).toEqual(
      legacyFilteredSummaries.map((summary) => summary.session.id),
    );

    const rows = buildCollectionRows(filteredSummaries, vScale, vScaleKey);
    const legacyRows = legacyBuildCollectionRows(legacyFilteredSummaries, vScale, vScaleKey);

    expect(rows).toEqual(legacyRows);
    expect(buildDisplayRows(rows)).toEqual(legacyBuildDisplayRows(legacyRows));
    expect(countCollectedCells(rows)).toBe(legacyCountCollectedCells(legacyRows));
    expect(countFeaturesCovered(rows)).toBe(legacyCountFeaturesCovered(legacyRows));
    expect(countTriedGapCells(rows)).toBe(legacyCountTriedGapCells(legacyRows));
    expect(buildTriedGoalTargets(rows, vScale)).toEqual(legacyBuildTriedGoalTargets(legacyRows, vScale));
    expect(buildOpenGoalTargets(rows, vScale)).toEqual(legacyBuildOpenGoalTargets(legacyRows, vScale));

    const slabMatches = findCollectionCellSessionMatches(filteredSummaries, vScale, 'Slab', 'V2');
    const legacySlabMatches = legacyFindCollectionCellSessionMatches(legacyFilteredSummaries, vScale, 'Slab', 'V2');
    expect(serializeMatches(slabMatches)).toEqual(serializeMatches(legacySlabMatches));
    expect(serializeMatches(slabMatches)).toEqual([
      { matchingAttempts: 3, matchingClimbs: 2, sessionId: 'session-a' },
      { matchingAttempts: 3, matchingClimbs: 1, sessionId: 'session-b' },
    ]);

    const aliasMatches = findCollectionCellSessionMatches(filteredSummaries, vScale, 'Roof/Cave', 'V2');
    const legacyAliasMatches = legacyFindCollectionCellSessionMatches(legacyFilteredSummaries, vScale, 'Roof/Cave', 'V2');
    expect(serializeMatches(aliasMatches)).toEqual(serializeMatches(legacyAliasMatches));

    const fontFilteredSummaries = filterCollectionSummaries(summaries, fontScaleKey, allLocationsFilterId);
    const legacyFontFilteredSummaries = legacyFilterCollectionSummaries(summaries, fontScaleKey, allLocationsFilterId);
    const fontRows = buildCollectionRows(fontFilteredSummaries, fontScale, fontScaleKey);
    const legacyFontRows = legacyBuildCollectionRows(legacyFontFilteredSummaries, fontScale, fontScaleKey);
    expect(fontRows).toEqual(legacyFontRows);
  });
});
