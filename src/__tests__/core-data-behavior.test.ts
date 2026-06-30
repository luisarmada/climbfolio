import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabaseClientForTests } from '../data/db/client';
import { attemptRepository, climbRepository, profileRepository, sessionRepository, statsRepository } from '../data/repositories';
import { normalizeCustomGrades, normalizeCustomScales } from '../domain/gradeScales';
import { Session } from '../domain/models';
import { climbService, StartClimbInput } from '../features/climbs';
import { locationService } from '../features/locations';
import { profileService } from '../features/profile';
import { sessionService } from '../features/sessions';
import { normalizeSessionMetadata } from '../features/sessions/session.finalization';
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

describe('core data behavior', () => {
  beforeEach(() => {
    resetDatabaseClientForTests();
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
    expect(defaultProfile.profilePictureId).toBe('pfp_mug');

    const updatedProfile = await profileRepository.updateLocalProfile({
      profilePictureId: 'pfp_slab',
    });
    expect(updatedProfile.profilePictureId).toBe('pfp_slab');

    const reloadedProfile = await profileRepository.getLocalProfile();
    expect(reloadedProfile.profilePictureId).toBe('pfp_slab');
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
