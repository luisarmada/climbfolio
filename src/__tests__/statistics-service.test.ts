import { describe, expect, it } from 'vitest';
import { builtInGradingScales } from '../domain/gradeScales';
import type { Attempt, Climb, Session } from '../domain/models';
import { buildStatisticsDashboard } from '../features/statistics';
import type { SessionSummary } from '../features/summaries';

const vScale = builtInGradingScales[0]!;

type FixtureClimbInput = {
  attemptCount: number;
  completed: boolean;
  grade: string;
  restBeforeClimbSeconds?: number | null;
  restSeconds?: number[];
};

function createSession(id: string, startTime: string, durationSeconds = 3600): Session {
  const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString();

  return {
    createdAt: startTime,
    deletedAt: null,
    description: null,
    durationSeconds,
    endTime,
    gradingScaleGrades: vScale.gradingScaleGrades,
    gradingScaleIsTape: false,
    gradingScaleName: vScale.gradingScaleName,
    gradingScaleType: vScale.gradingScaleType,
    gradingScaleVGradeRanges: vScale.gradingScaleVGradeRanges,
    id,
    locationId: null,
    locationName: null,
    locationType: null,
    name: id,
    startTime,
    updatedAt: endTime,
    userId: 'user_local',
  };
}

function createClimb(session: Session, index: number, input: FixtureClimbInput): Climb {
  const startTime = new Date(new Date(session.startTime).getTime() + index * 10 * 60 * 1000).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + 5 * 60 * 1000).toISOString();

  return {
    attemptCount: input.attemptCount,
    colour: null,
    completed: input.completed,
    createdAt: startTime,
    deletedAt: null,
    durationSeconds: 300,
    endTime,
    grade: input.grade,
    gradingScaleGrades: vScale.gradingScaleGrades,
    gradingScaleIsTape: false,
    gradingScaleName: vScale.gradingScaleName,
    gradingScaleType: vScale.gradingScaleType,
    gradingScaleVGradeRanges: vScale.gradingScaleVGradeRanges,
    holdTypes: [],
    id: `${session.id}-climb-${index}`,
    restBeforeClimbSeconds: input.restBeforeClimbSeconds ?? (index === 0 ? null : 180),
    sessionId: session.id,
    sortOrder: index + 1,
    startTime,
    updatedAt: endTime,
  };
}

function createAttempts(climb: Climb, rests: number[] = []): Attempt[] {
  return Array.from({ length: climb.attemptCount }, (_, index) => {
    const timestamp = new Date(new Date(climb.startTime).getTime() + index * 2 * 60 * 1000).toISOString();

    return {
      climbId: climb.id,
      createdAt: timestamp,
      deletedAt: null,
      id: `${climb.id}-attempt-${index + 1}`,
      attemptNumber: index + 1,
      restSincePreviousAttemptSeconds: index === 0 ? null : rests[index - 1] ?? 120,
      timestamp,
    };
  });
}

function createSummary(id: string, startTime: string, climbs: FixtureClimbInput[], durationSeconds?: number): SessionSummary {
  const session = createSession(id, startTime, durationSeconds);
  const summaryClimbs = climbs.map((climb, index) => createClimb(session, index, climb));
  const attempts = summaryClimbs.flatMap((climb, index) => createAttempts(climb, climbs[index]?.restSeconds));
  const totalAttempts = summaryClimbs.reduce((total, climb) => total + climb.attemptCount, 0);
  const completedClimbs = summaryClimbs.filter((climb) => climb.completed).length;

  return {
    attempts,
    averageAttemptsPerClimb: summaryClimbs.length === 0 ? 0 : totalAttempts / summaryClimbs.length,
    averageRestBetweenAttemptsSeconds: null,
    averageRestBetweenClimbsSeconds: null,
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

describe('statistics service', () => {
  it('builds period snapshots, volume buckets, recovery, and grade mix from saved summaries', () => {
    const dashboard = buildStatisticsDashboard([
      createSummary('previous-april', '2026-04-10T18:00:00.000Z', [
        { attemptCount: 2, completed: true, grade: 'V2' },
      ]),
      createSummary('may', '2026-05-03T18:00:00.000Z', [
        { attemptCount: 1, completed: true, grade: 'V2' },
        { attemptCount: 3, completed: false, grade: 'V3', restSeconds: [180, 240] },
      ], 5400),
      createSummary('june', '2026-06-12T18:00:00.000Z', [
        { attemptCount: 2, completed: true, grade: 'V3', restSeconds: [120] },
      ], 3600),
      createSummary('july', '2026-07-02T18:00:00.000Z', [
        { attemptCount: 4, completed: true, grade: 'V4', restSeconds: [120, 180, 240] },
      ], 7200),
    ], '3_months', new Date('2026-07-15T12:00:00.000Z'));

    expect(dashboard.state).toBe('ready');
    expect(dashboard.selectedSessionCount).toBe(3);
    expect(dashboard.snapshot.bestSent.label).toBe('V4');
    expect(dashboard.snapshot.bestSent.delta.label).toBe('+2 grades vs previous');
    expect(dashboard.snapshot.sessions).toMatchObject({ value: 3 });
    expect(dashboard.snapshot.sessions.delta.label).toBe('+2 vs previous');
    expect(dashboard.snapshot.climbs).toMatchObject({ value: 4 });
    expect(dashboard.volumeTrend.buckets.map((bucket) => [bucket.shortLabel, bucket.climbs])).toEqual([
      ['May', 2],
      ['Jun', 1],
      ['Jul', 1],
    ]);
    expect(dashboard.gradeProgress.highestSentGrade).toBe('V4');
    expect(dashboard.gradeProgress.mostClimbedGrade).toBe('V3');
    expect(dashboard.quality.map((metric) => [metric.key, metric.value])).toEqual([
      ['completion_rate', '75%'],
      ['avg_attempts', '2.5'],
      ['avg_climbs', '1.3'],
    ]);
    expect(dashboard.recovery.map((metric) => [metric.key, metric.seconds])).toEqual([
      ['rest_attempts', 180],
      ['rest_climbs', 180],
      ['session_duration', 5400],
    ]);
    expect(dashboard.gradeMix).toEqual([
      { attempted: 1, grade: 'V2', rank: 3, sent: 1, tried: 0 },
      { attempted: 2, grade: 'V3', rank: 4, sent: 1, tried: 1 },
      { attempted: 1, grade: 'V4', rank: 5, sent: 1, tried: 0 },
    ]);
  });

  it('distinguishes no history, no sessions in the period, and one-session states', () => {
    expect(buildStatisticsDashboard([], '3_months', new Date('2026-07-15T12:00:00.000Z')).state).toBe('empty');

    expect(
      buildStatisticsDashboard([
        createSummary('old', '2025-01-10T18:00:00.000Z', [
          { attemptCount: 1, completed: true, grade: 'V1' },
        ]),
      ], '4_weeks', new Date('2026-07-15T12:00:00.000Z')).state,
    ).toBe('empty_period');

    const oneSession = buildStatisticsDashboard([
      createSummary('only', '2026-07-10T18:00:00.000Z', [
        { attemptCount: 1, completed: true, grade: 'V1' },
      ]),
    ], '3_months', new Date('2026-07-15T12:00:00.000Z'));

    expect(oneSession.state).toBe('one_session');
    expect(oneSession.snapshot.bestSent.delta.label).toBe('New this period');
  });
});
