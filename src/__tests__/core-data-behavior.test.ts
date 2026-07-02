import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabaseClientForTests } from '../data/db/client';
import { attemptRepository, climbRepository, profileRepository, sessionRepository, statsRepository } from '../data/repositories';
import { builtInGradingScales, getGradeVRank, GradingScaleSnapshot, normalizeCustomGrades, normalizeCustomScales } from '../domain/gradeScales';
import { Attempt, Climb, Session } from '../domain/models';
import { climbService, getClimbScaleSnapshot, normalizeFeature, StartClimbInput, warmUpHoldType } from '../features/climbs';
import { filterCollectionSummaries, findCollectionCellSessionMatches } from '../features/collections';
import { getCollectionScaleKey } from '../features/collections/collection.service';
import { locationService } from '../features/locations';
import { profileService } from '../features/profile';
import { sessionService } from '../features/sessions';
import { normalizeSessionMetadata } from '../features/sessions/session.finalization';
import { followingService } from '../features/social';
import { getLocalDayKey, invalidateSessionSummaryCache, SessionSummary, sessionSummaryService } from '../features/summaries';
import { localUserId } from '../domain/userIdentity';
import { inputLimits } from '../utils/inputValidation';

function getStartClimbInput(session: Session, grade = 'V1'): StartClimbInput {
  return {
    grade,
    gradingScaleGrades: session.gradingScaleGrades,
    gradingScaleIsTape: session.gradingScaleIsTape,
    gradingScaleName: session.gradingScaleName,
    gradingScaleType: session.gradingScaleType,
    gradingScaleVGradeRanges: session.gradingScaleVGradeRanges,
    holdTypes: [],
    sessionId: session.id,
  };
}

function getLoggedClimbInput(session: Session, attemptCount: number) {
  const { sessionId: _sessionId, ...input } = getStartClimbInput(session);

  return {
    ...input,
    attemptCount,
    completed: false,
    durationSeconds: 120,
  };
}

async function startActiveClimb() {
  const activeSession = await sessionService.startSession();
  const climb = await climbService.startClimb(getStartClimbInput(activeSession.session));

  return {
    climb,
    session: activeSession.session,
  };
}

async function createCompletedSessionFixture(input: {
  attemptCount?: number;
  completed?: boolean;
  endTime: string;
  grade: string;
  holdTypes?: string[];
  locationId?: string | null;
  startTime: string;
  userId?: string;
}) {
  const session = await sessionRepository.create({
    locationId: input.locationId ?? null,
    locationName: input.locationId ? 'Test Gym' : null,
    locationType: input.locationId ? 'gym' : null,
    startTime: input.startTime,
    userId: input.userId ?? localUserId,
  });
  const climb = await climbRepository.create({
    grade: input.grade,
    holdTypes: input.holdTypes ?? [],
    sessionId: session.id,
    startTime: input.startTime,
  });
  const attemptCount = input.attemptCount ?? 1;

  for (let index = 1; index <= attemptCount; index += 1) {
    const timestamp = new Date(new Date(input.startTime).getTime() + (index - 1) * 60_000).toISOString();
    await attemptRepository.create({
      attemptNumber: index,
      climbId: climb.id,
      restSincePreviousAttemptSeconds: index === 1 ? null : 60,
      timestamp,
    });
  }

  const updatedClimb = await climbRepository.update(climb.id, {
    attemptCount,
    completed: input.completed ?? true,
    durationSeconds: Math.max(0, Math.floor((new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 1000)),
    endTime: input.endTime,
  });
  const endedSession = await sessionRepository.end(session.id, { endTime: input.endTime });

  return {
    climb: updatedClimb ?? climb,
    session: endedSession ?? session,
  };
}

type CompletedClimbFixtureInput = {
  attemptCount: number;
  colour?: string | null;
  completed: boolean;
  durationSeconds: number;
  grade: string;
  holdTypes: string[];
};

async function createCompletedSessionWithClimbsFixture(input: {
  climbs: CompletedClimbFixtureInput[];
  endTime?: string;
  locationId?: string | null;
  locationName?: string | null;
  name?: string;
  startTime: string;
  userId?: string;
}) {
  const session = await sessionRepository.create({
    locationId: input.locationId ?? null,
    locationName: input.locationName ?? (input.locationId ? 'Validation Gym' : null),
    locationType: input.locationId ? 'gym' : null,
    name: input.name ?? null,
    startTime: input.startTime,
    userId: input.userId ?? localUserId,
  });
  const sessionStart = new Date(input.startTime).getTime();
  let latestEndTime = input.startTime;

  for (const [climbIndex, climbInput] of input.climbs.entries()) {
    const climbStartTime = new Date(sessionStart + climbIndex * 18 * 60_000).toISOString();
    const climb = await climbRepository.create({
      colour: climbInput.colour ?? null,
      grade: climbInput.grade,
      holdTypes: climbInput.holdTypes,
      restBeforeClimbSeconds: climbIndex === 0 ? null : 180 + climbIndex * 30,
      sessionId: session.id,
      sortOrder: climbIndex + 1,
      startTime: climbStartTime,
    });

    for (let attemptNumber = 1; attemptNumber <= climbInput.attemptCount; attemptNumber += 1) {
      const timestamp = new Date(new Date(climbStartTime).getTime() + (attemptNumber - 1) * 75_000).toISOString();
      await attemptRepository.create({
        attemptNumber,
        climbId: climb.id,
        restSincePreviousAttemptSeconds: attemptNumber === 1 ? null : 75,
        timestamp,
      });
    }

    latestEndTime = new Date(new Date(climbStartTime).getTime() + climbInput.durationSeconds * 1000).toISOString();
    await climbRepository.update(climb.id, {
      attemptCount: climbInput.attemptCount,
      completed: climbInput.completed,
      durationSeconds: climbInput.durationSeconds,
      endTime: latestEndTime,
    });
  }

  return sessionRepository.end(session.id, { endTime: input.endTime ?? latestEndTime });
}

function legacyHighestGrade(entries: { climb: Climb; scale: Pick<GradingScaleSnapshot, 'gradingScaleVGradeRanges'> }[]) {
  return entries.reduce<{ grade: string; rank: number } | null>((highest, entry) => {
    const rank = getGradeVRank(entry.climb.grade, entry.scale);

    if (!highest || rank > highest.rank) {
      return { grade: entry.climb.grade, rank };
    }

    return highest;
  }, null)?.grade ?? null;
}

function legacyAverage(values: number[]) {
  return values.length === 0 ? null : Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function legacyMostCommon(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function splitFixtureColours(colour: string | null) {
  return colour?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

async function buildLegacySessionSummary(session: Session): Promise<SessionSummary> {
  const climbs = await climbRepository.listBySessionId(session.id);
  const attemptsByClimb = await Promise.all(climbs.map((climb) => attemptRepository.listByClimbId(climb.id)));
  const attempts = attemptsByClimb.flat();
  const completed = climbs.filter((climb) => climb.completed);
  const climbEntries = climbs.map((climb) => ({ climb, scale: getClimbScaleSnapshot(climb, session) }));
  const completedEntries = climbEntries.filter((entry) => entry.climb.completed);
  const restBetweenAttempts = attempts
    .map((attempt) => attempt.restSincePreviousAttemptSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const restBetweenClimbs = climbs
    .map((climb) => climb.restBeforeClimbSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const colours = climbs.flatMap((climb) => splitFixtureColours(climb.colour));
  const holdTypes = climbs.flatMap((climb) =>
    climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType).map(normalizeFeature),
  );
  const totalAttempts = climbs.reduce((total, climb) => total + climb.attemptCount, 0);

  return {
    session,
    climbs,
    attempts,
    averageAttemptsPerClimb: climbs.length === 0 ? 0 : totalAttempts / climbs.length,
    averageRestBetweenAttemptsSeconds: legacyAverage(restBetweenAttempts),
    averageRestBetweenClimbsSeconds: legacyAverage(restBetweenClimbs),
    completedClimbs: completed.length,
    completionRate: climbs.length === 0 ? 0 : Math.round((completed.length / climbs.length) * 100),
    highestGradeAttempted: legacyHighestGrade(climbEntries),
    highestGradeCompleted: legacyHighestGrade(completedEntries),
    mostCommonColour: legacyMostCommon(colours),
    mostCommonHoldType: legacyMostCommon(holdTypes),
    totalAttempts,
    totalClimbs: climbs.length,
  };
}

async function listLegacyCompletedSessionSummaries() {
  const sessions = await sessionRepository.listCompleted();
  return Promise.all(sessions.map(buildLegacySessionSummary));
}

function serializeSummary(summary: SessionSummary | null | undefined) {
  return summary ? JSON.parse(JSON.stringify(summary)) : summary;
}

function serializeSummaries(summaries: SessionSummary[]) {
  return summaries.map(serializeSummary);
}

function serializeCollectionMatches(matches: ReturnType<typeof findCollectionCellSessionMatches>) {
  return matches.map((match) => ({
    matchingAttempts: match.matchingAttempts,
    matchingClimbs: match.matchingClimbs,
    summary: serializeSummary(match.summary),
  }));
}

describe('core data behavior', () => {
  beforeEach(() => {
    resetDatabaseClientForTests();
    invalidateSessionSummaryCache();
  });

  it('repeated startSession does not create duplicate active sessions', async () => {
    const [firstSession, secondSession] = await Promise.all([
      sessionService.startSession(),
      sessionService.startSession(),
    ]);

    const sessions = await sessionRepository.listAll();
    const activeSession = await sessionRepository.getActive();

    expect(firstSession.session.id).toBe(secondSession.session.id);
    expect(activeSession?.id).toBe(firstSession.session.id);
    expect(sessions).toHaveLength(1);
    expect(sessions.filter((session) => !session.endTime)).toHaveLength(1);
  });

  it('repeated startClimb does not create duplicate active climbs for the same session', async () => {
    const activeSession = await sessionService.startSession();
    const firstInput = getStartClimbInput(activeSession.session, 'V1');
    const secondInput = getStartClimbInput(activeSession.session, 'V2');
    const [firstClimb, secondClimb] = await Promise.all([
      climbService.startClimb(firstInput),
      climbService.startClimb(secondInput),
    ]);

    const climbs = await climbRepository.listBySessionId(activeSession.session.id);
    const attempts = await attemptRepository.listByClimbId(firstClimb.id);

    expect(firstClimb.id).toBe(secondClimb.id);
    expect(climbs).toHaveLength(1);
    expect(climbs.filter((climb) => !climb.endTime)).toHaveLength(1);
    expect(climbs[0]?.attemptCount).toBe(1);
    expect(attempts).toHaveLength(1);
  });

  it('addAttempt and undoAttempt keep attempt_count and attempt rows consistent', async () => {
    const { climb } = await startActiveClimb();

    await climbService.addAttempt(climb.id);
    await climbService.addAttempt(climb.id);
    await climbService.undoAttempt(climb.id);
    await climbService.undoAttempt(climb.id);
    const updatedClimb = await climbService.undoAttempt(climb.id);
    const attempts = await attemptRepository.listByClimbId(climb.id);
    const persistedClimb = await climbRepository.getById(climb.id);

    expect(updatedClimb.attemptCount).toBe(1);
    expect(persistedClimb?.attemptCount).toBe(attempts.length);
    expect(attempts.map((attempt) => attempt.attemptNumber)).toEqual([1]);
  });

  it('editing attempt_count reconciles attempt rows consistently', async () => {
    const { climb, session } = await startActiveClimb();

    await climbService.addAttempt(climb.id);
    const increasedClimb = await climbService.updateLoggedClimb(climb.id, getLoggedClimbInput(session, 4));
    const increasedAttempts = await attemptRepository.listByClimbId(climb.id);

    expect(increasedClimb.attemptCount).toBe(4);
    expect(increasedAttempts.map((attempt) => attempt.attemptNumber)).toEqual([1, 2, 3, 4]);

    const reducedClimb = await climbService.updateLoggedClimb(climb.id, getLoggedClimbInput(session, 2));
    const reducedAttempts = await attemptRepository.listByClimbId(climb.id);
    const totals = await statsRepository.getSessionTotals(session.id);

    expect(reducedClimb.attemptCount).toBe(2);
    expect(reducedAttempts.map((attempt) => attempt.attemptNumber)).toEqual([1, 2]);
    expect(totals.attempts).toBe(reducedAttempts.length);
  });

  it('persists the selected profile picture preset ID', async () => {
    const defaultProfile = await profileRepository.getLocalProfile();
    expect(defaultProfile.userId).toBe(localUserId);
    expect(defaultProfile.profilePictureId).toBe('pfp_mug');
    expect(defaultProfile.selectedFlairIds).toEqual(['best_grade']);
    expect(defaultProfile.showStreakFlair).toBe(true);

    const updatedProfile = await profileRepository.updateLocalProfile({
      profilePictureId: 'pfp_slab',
    });
    expect(updatedProfile.profilePictureId).toBe('pfp_slab');

    const reloadedProfile = await profileRepository.getLocalProfile();
    expect(reloadedProfile.profilePictureId).toBe('pfp_slab');
  });

  it('persists profile flair selections and caps them to three', async () => {
    const updatedProfile = await profileService.updateLocalProfile({
      selectedFlairIds: ['founder', 'contributor', 'supporter', 'best_grade'],
      showStreakFlair: false,
    });

    expect(updatedProfile.selectedFlairIds).toEqual(['founder', 'contributor', 'supporter']);
    expect(updatedProfile.showStreakFlair).toBe(false);

    const reloadedProfile = await profileRepository.getLocalProfile();

    expect(reloadedProfile.selectedFlairIds).toEqual(['founder', 'contributor', 'supporter']);
    expect(reloadedProfile.showStreakFlair).toBe(false);
  });

  it('assigns sessions to the local user and filters summaries by user IDs', async () => {
    const activeSession = await sessionService.startSession();
    expect(activeSession.session.userId).toBe(localUserId);

    const endedSession = await sessionService.endSession(activeSession.session.id, {
      endTime: new Date(new Date(activeSession.session.startTime).getTime() + 60_000).toISOString(),
    });

    const friendSession = await sessionRepository.create({
      startTime: '2026-01-02T10:00:00.000Z',
      userId: 'user_friend',
    });
    await sessionRepository.end(friendSession.id, {
      endTime: '2026-01-02T11:00:00.000Z',
    });

    const ownSummaries = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    const feedSummaries = await sessionSummaryService.listCompletedSessionSummaries({
      userIds: followingService.listFollowingUserIds(localUserId),
    });
    const combinedSummaries = await sessionSummaryService.listCompletedSessionSummaries({
      userIds: [localUserId, 'user_friend'],
    });

    expect(endedSession?.userId).toBe(localUserId);
    expect(followingService.listFollowingUserIds(localUserId)).toEqual([localUserId]);
    expect(ownSummaries.map((summary) => summary.session.id)).toEqual([activeSession.session.id]);
    expect(feedSummaries.map((summary) => summary.session.id)).toEqual([activeSession.session.id]);
    expect(combinedSummaries.map((summary) => summary.session.id).sort()).toEqual(
      [activeSession.session.id, friendSession.id].sort(),
    );
  });

  it('refreshes completed summary cache after saved session and climb mutations', async () => {
    const { climb, session } = await startActiveClimb();

    await climbService.finishClimb(climb.id, true);
    await sessionService.endSession(session.id, {
      endTime: new Date(new Date(session.startTime).getTime() + 10 * 60_000).toISOString(),
    });

    const initialSummaries = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    expect(initialSummaries[0]?.totalAttempts).toBe(1);

    await climbService.updateLoggedClimb(climb.id, {
      ...getLoggedClimbInput(session, 3),
      completed: true,
    });

    const climbUpdatedSummaries = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    expect(climbUpdatedSummaries[0]?.totalAttempts).toBe(3);

    await sessionService.updateSavedSession(session.id, { name: 'Cache refresh session' });

    const sessionUpdatedSummaries = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    expect(sessionUpdatedSummaries[0]?.session.name).toBe('Cache refresh session');
  });

  it('loads completed summaries for one local calendar day without requiring full-history summaries', async () => {
    const first = await createCompletedSessionFixture({
      endTime: '2026-01-02T11:00:00.000Z',
      grade: 'V1',
      startTime: '2026-01-02T10:00:00.000Z',
    });
    await createCompletedSessionFixture({
      endTime: '2026-01-03T11:00:00.000Z',
      grade: 'V2',
      startTime: '2026-01-03T10:00:00.000Z',
    });

    const summaries = await sessionSummaryService.listCompletedSessionSummariesForDay('2026-01-02', {
      userIds: [localUserId],
    });

    expect(summaries.map((summary) => summary.session.id)).toEqual([first.session.id]);
    expect(summaries.map((summary) => getLocalDayKey(new Date(summary.session.startTime)))).toEqual(['2026-01-02']);
  });

  it('loads completed summaries for one collection cell without rebuilding unrelated session summaries', async () => {
    const matching = await createCompletedSessionFixture({
      attemptCount: 2,
      endTime: '2026-01-04T11:00:00.000Z',
      grade: 'V2',
      holdTypes: ['Slab'],
      locationId: 'location_wall',
      startTime: '2026-01-04T10:00:00.000Z',
    });
    await createCompletedSessionFixture({
      endTime: '2026-01-05T11:00:00.000Z',
      grade: 'V2',
      holdTypes: ['Overhang'],
      locationId: 'location_wall',
      startTime: '2026-01-05T10:00:00.000Z',
    });
    await createCompletedSessionFixture({
      endTime: '2026-01-06T11:00:00.000Z',
      grade: 'V1',
      holdTypes: ['Slab'],
      locationId: 'location_wall',
      startTime: '2026-01-06T10:00:00.000Z',
    });

    const summaries = await sessionSummaryService.listCompletedSessionSummariesForCollectionCell({
      feature: 'Slab',
      grade: 'V2',
      locationId: 'location_wall',
      scale: builtInGradingScales[0]!,
      userIds: [localUserId],
    });

    expect(summaries.map((summary) => summary.session.id)).toEqual([matching.session.id]);
    expect(summaries[0]?.totalAttempts).toBe(2);
  });

  it('returns complete activity-list data sets for long saved histories', async () => {
    const wallId = 'long_history_wall';

    for (let index = 0; index < 50; index += 1) {
      const day = index < 12 ? 10 : 11 + Math.floor((index - 12) / 4);
      const hour = 8 + (index % 12);
      const startTime = `2026-04-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`;

      await createCompletedSessionWithClimbsFixture({
        climbs: [
          {
            attemptCount: (index % 3) + 1,
            colour: index % 2 === 0 ? 'Blue' : 'Green',
            completed: true,
            durationSeconds: 360,
            grade: 'V2',
            holdTypes: ['Slab'],
          },
          {
            attemptCount: 2,
            colour: 'Yellow',
            completed: index % 4 !== 0,
            durationSeconds: 420,
            grade: index % 2 === 0 ? 'V3' : 'V1',
            holdTypes: index % 2 === 0 ? ['Overhang'] : ['Crimp'],
          },
        ],
        locationId: wallId,
        name: `Long history session ${index + 1}`,
        startTime,
      });
    }

    invalidateSessionSummaryCache();
    const profileSummaries = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    const homeSummaries = await sessionSummaryService.listCompletedSessionSummaries({
      userIds: followingService.listFollowingUserIds(localUserId),
    });
    const daySummaries = await sessionSummaryService.listCompletedSessionSummariesForDay('2026-04-10', {
      userIds: [localUserId],
    });
    const cellSummaries = await sessionSummaryService.listCompletedSessionSummariesForCollectionCell({
      feature: 'Slab',
      grade: 'V2',
      locationId: wallId,
      scale: builtInGradingScales[0]!,
      userIds: [localUserId],
    });

    expect(profileSummaries).toHaveLength(50);
    expect(homeSummaries).toHaveLength(50);
    expect(daySummaries).toHaveLength(12);
    expect(cellSummaries).toHaveLength(50);
    expect(new Set(profileSummaries.map((summary) => summary.session.id))).toHaveLength(50);
  });

  it('matches legacy one-by-one summary building for bulk, cached, narrow, and lookup paths', async () => {
    const scale = builtInGradingScales[0]!;
    const scaleKey = getCollectionScaleKey(scale);
    const wallA = 'validation_wall_a';
    const wallB = 'validation_wall_b';
    const firstSession = await createCompletedSessionWithClimbsFixture({
      climbs: [
        { attemptCount: 2, colour: 'Blue', completed: true, durationSeconds: 360, grade: 'V2', holdTypes: ['Slab', 'Jug'] },
        { attemptCount: 4, colour: 'Red', completed: false, durationSeconds: 540, grade: 'V4', holdTypes: ['Crimp', 'Overhang'] },
        { attemptCount: 1, colour: 'Yellow', completed: true, durationSeconds: 180, grade: 'V0', holdTypes: [warmUpHoldType] },
      ],
      locationId: wallA,
      name: 'Validation morning',
      startTime: '2026-03-01T10:00:00.000Z',
    });
    await createCompletedSessionWithClimbsFixture({
      climbs: [
        { attemptCount: 3, colour: 'Green', completed: true, durationSeconds: 420, grade: 'V3', holdTypes: ['Slab', 'Dyno'] },
        { attemptCount: 1, colour: 'White', completed: true, durationSeconds: 120, grade: 'V1', holdTypes: ['Jug'] },
      ],
      locationId: wallB,
      name: 'Validation afternoon',
      startTime: '2026-03-01T15:00:00.000Z',
    });
    const targetSession = await createCompletedSessionWithClimbsFixture({
      climbs: [
        { attemptCount: 5, colour: 'Blue', completed: true, durationSeconds: 600, grade: 'V2', holdTypes: ['Slab', 'Crimp'] },
        { attemptCount: 2, colour: 'Purple', completed: true, durationSeconds: 300, grade: 'V5', holdTypes: ['Overhang', 'Pinch'] },
      ],
      locationId: wallA,
      name: 'Validation project day',
      startTime: '2026-03-03T11:00:00.000Z',
    });
    await createCompletedSessionWithClimbsFixture({
      climbs: [
        { attemptCount: 2, colour: 'Orange', completed: true, durationSeconds: 300, grade: 'V2', holdTypes: ['Slab'] },
      ],
      locationId: wallA,
      name: 'Friend validation',
      startTime: '2026-03-04T12:00:00.000Z',
      userId: 'user_friend',
    });

    const legacyAll = await listLegacyCompletedSessionSummaries();

    invalidateSessionSummaryCache();
    const bulkAll = await sessionSummaryService.listCompletedSessionSummaries();
    expect(serializeSummaries(bulkAll)).toEqual(serializeSummaries(legacyAll));

    const cachedLocal = await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    const legacyLocal = legacyAll.filter((summary) => summary.session.userId === localUserId);
    expect(serializeSummaries(cachedLocal)).toEqual(serializeSummaries(legacyLocal));

    invalidateSessionSummaryCache();
    const daySummaries = await sessionSummaryService.listCompletedSessionSummariesForDay('2026-03-01', {
      userIds: [localUserId],
    });
    const legacyDaySummaries = legacyLocal.filter(
      (summary) => getLocalDayKey(new Date(summary.session.startTime)) === '2026-03-01',
    );
    expect(serializeSummaries(daySummaries)).toEqual(serializeSummaries(legacyDaySummaries));

    invalidateSessionSummaryCache();
    const cellSummaries = await sessionSummaryService.listCompletedSessionSummariesForCollectionCell({
      feature: 'Slab',
      grade: 'V2',
      locationId: wallA,
      scale,
      userIds: [localUserId],
    });
    const legacyCellMatches = findCollectionCellSessionMatches(
      filterCollectionSummaries(legacyLocal, scaleKey, wallA),
      scale,
      'Slab',
      'V2',
    );
    const cellMatches = findCollectionCellSessionMatches(
      filterCollectionSummaries(cellSummaries, scaleKey, wallA),
      scale,
      'Slab',
      'V2',
    );
    expect(serializeCollectionMatches(cellMatches)).toEqual(serializeCollectionMatches(legacyCellMatches));

    invalidateSessionSummaryCache();
    await sessionSummaryService.listCompletedSessionSummaries({ userIds: [localUserId] });
    const cachedLookup = await sessionSummaryService.getSessionSummary(targetSession!.id);
    const legacyLookup = legacyAll.find((summary) => summary.session.id === targetSession!.id);
    expect(serializeSummary(cachedLookup)).toEqual(serializeSummary(legacyLookup));
    expect(firstSession?.id).toBeTruthy();
  });

  it('caps user-entered text before saving or normalizing', async () => {
    const longSessionName = 'S'.repeat(inputLimits.sessionName + 8);
    const longDescription = 'D'.repeat(inputLimits.sessionDescription + 8);
    const longLocationName = 'L'.repeat(inputLimits.locationName + 8);
    const longProfileDisplayName = 'P'.repeat(inputLimits.profileDisplayName + 8);
    const longProfileTagline = 'Type '.repeat(12);
    const longScaleName = 'Scale '.repeat(12);
    const longGradeName = 'Grade '.repeat(8);

    const sessionMetadata = normalizeSessionMetadata({
      description: longDescription,
      name: longSessionName,
    });
    const location = await locationService.createLocation({
      gradingScaleId: 'v_scale',
      name: longLocationName,
      type: 'gym',
    });
    const normalizedGrades = normalizeCustomGrades([longGradeName]);
    const normalizedScales = normalizeCustomScales([
      {
        grades: [longGradeName],
        id: 'custom_long',
        name: longScaleName,
        vGradeRanges: {},
      },
    ]);
    const profile = await profileService.updateLocalProfile({
      displayName: longProfileDisplayName,
      tagline: longProfileTagline,
    });

    expect(sessionMetadata.name).toHaveLength(inputLimits.sessionName);
    expect(sessionMetadata.description).toHaveLength(inputLimits.sessionDescription);
    expect(location.name).toHaveLength(inputLimits.locationName);
    expect(profile.displayName).toHaveLength(inputLimits.profileDisplayName);
    expect(profile.tagline).toHaveLength(inputLimits.profileTagline);
    expect(normalizedGrades[0]).toHaveLength(inputLimits.customGradeName);
    expect(normalizedScales[0]?.name).toHaveLength(inputLimits.customScaleName);
    expect(normalizedScales[0]?.grades[0]).toHaveLength(inputLimits.customGradeName);
  });
});
