import { withDatabaseTransaction } from '../../data/db/client';
import { isDatabaseConstraintError } from '../../data/db/errors';
import { attemptRepository, climbRepository } from '../../data/repositories';
import { Attempt, Climb } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { secondsBetween } from '../../utils/time';
import { warmUpHoldType } from './climb.options';
import { StartClimbInput } from './climb.types';

async function requireActiveClimb(climbId: string) {
  const climb = await climbRepository.getById(climbId);

  if (!climb || climb.endTime) {
    throw new Error('No active climb found.');
  }

  return climb;
}

function normalizeAttemptCount(attemptCount: number) {
  return Math.max(1, Math.floor(attemptCount));
}

function safeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

function resolveAttemptEditEndTime(climb: Climb, durationSeconds: number | null | undefined) {
  if (durationSeconds != null) {
    return new Date(safeTimestamp(climb.startTime) + Math.max(0, durationSeconds) * 1000).toISOString();
  }

  return climb.endTime ?? nowIso();
}

function interpolateAttemptTimestamp(startTime: string, endTime: string, index: number, total: number) {
  const start = safeTimestamp(startTime);
  const end = Math.max(start, safeTimestamp(endTime));
  const step = total <= 0 ? 0 : (end - start) / total;

  return new Date(start + step * index).toISOString();
}

async function reconcileAttemptRows(climb: Climb, targetAttemptCount: number, editEndTime: string) {
  const attempts = await attemptRepository.listByClimbId(climb.id);

  if (attempts.length > targetAttemptCount) {
    const deletedAt = nowIso();

    for (const attempt of attempts.slice(targetAttemptCount)) {
      await attemptRepository.update(attempt.id, { deletedAt });
    }

    return;
  }

  let latestAttempt: Attempt | undefined = attempts[attempts.length - 1];
  let currentAttemptCount = attempts.length;

  if (!latestAttempt) {
    latestAttempt = await attemptRepository.create({
      attemptNumber: 1,
      climbId: climb.id,
      timestamp: climb.startTime,
    });
    currentAttemptCount = 1;
  }

  if (currentAttemptCount >= targetAttemptCount) {
    return;
  }

  const attemptsToCreate = targetAttemptCount - currentAttemptCount;
  const interpolationStart = latestAttempt.timestamp;

  for (let index = 1; index <= attemptsToCreate; index += 1) {
    const timestamp = interpolateAttemptTimestamp(interpolationStart, editEndTime, index, attemptsToCreate);

    latestAttempt = await attemptRepository.create({
      attemptNumber: latestAttempt.attemptNumber + 1,
      climbId: climb.id,
      restSincePreviousAttemptSeconds: secondsBetween(latestAttempt.timestamp, timestamp),
      timestamp,
    });
  }
}

export const climbService = {
  async startClimb(input: StartClimbInput): Promise<Climb> {
    try {
      return await withDatabaseTransaction(async () => {
        const existingActiveClimb = await climbRepository.getActiveBySessionId(input.sessionId);

        if (existingActiveClimb) {
          return existingActiveClimb;
        }

        const startedAt = nowIso();
        const lastFinishedClimb = await climbRepository.getLastFinishedBySessionId(input.sessionId);
        const climb = await climbRepository.create({
          colour: input.colour ?? null,
          grade: input.grade,
          gradingScaleGrades: input.gradingScaleGrades,
          gradingScaleIsTape: input.gradingScaleIsTape,
          gradingScaleName: input.gradingScaleName,
          gradingScaleType: input.gradingScaleType,
          gradingScaleVGradeRanges: input.gradingScaleVGradeRanges,
          holdTypes: input.holdTypes ?? [],
          restBeforeClimbSeconds: lastFinishedClimb?.endTime ? secondsBetween(lastFinishedClimb.endTime, startedAt) : null,
          sessionId: input.sessionId,
          startTime: startedAt,
        });

        await attemptRepository.create({
          attemptNumber: 1,
          climbId: climb.id,
          timestamp: startedAt,
        });

        const updatedClimb = await climbRepository.update(climb.id, { attemptCount: 1 });

        if (!updatedClimb) {
          throw new Error('Could not start climb.');
        }

        return updatedClimb;
      });
    } catch (error) {
      if (isDatabaseConstraintError(error)) {
        const existingActiveClimb = await climbRepository.getActiveBySessionId(input.sessionId);

        if (existingActiveClimb) {
          return existingActiveClimb;
        }
      }

      throw error;
    }
  },

  async addAttempt(climbId: string): Promise<Climb> {
    return withDatabaseTransaction(async () => {
      const climb = await requireActiveClimb(climbId);
      const latestAttempt = await attemptRepository.getLastByClimbId(climb.id);
      const attemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1;
      const timestamp = nowIso();

      await attemptRepository.create({
        attemptNumber,
        climbId: climb.id,
        restSincePreviousAttemptSeconds: latestAttempt ? secondsBetween(latestAttempt.timestamp, timestamp) : null,
        timestamp,
      });

      const updatedClimb = await climbRepository.update(climb.id, { attemptCount: attemptNumber });

      if (!updatedClimb) {
        throw new Error('Could not add attempt.');
      }

      return updatedClimb;
    });
  },

  async undoAttempt(climbId: string): Promise<Climb> {
    return withDatabaseTransaction(async () => {
      const climb = await requireActiveClimb(climbId);
      const attempts = await attemptRepository.listByClimbId(climb.id);

      if (attempts.length <= 1) {
        return climb;
      }

      await attemptRepository.softDeleteLatestByClimbId(climb.id);

      const updatedClimb = await climbRepository.update(climb.id, { attemptCount: attempts.length - 1 });

      if (!updatedClimb) {
        throw new Error('Could not undo attempt.');
      }

      return updatedClimb;
    });
  },

  async setCompleted(climbId: string, completed: boolean): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const updatedClimb = await climbRepository.update(climb.id, { completed });

    if (!updatedClimb) {
      throw new Error('Could not update climb.');
    }

    return updatedClimb;
  },

  async updateClimb(climbId: string, input: Omit<StartClimbInput, 'sessionId'>): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const updatedClimb = await climbRepository.update(climb.id, {
      colour: input.colour ?? null,
      grade: input.grade,
      gradingScaleGrades: input.gradingScaleGrades,
      gradingScaleIsTape: input.gradingScaleIsTape,
      gradingScaleName: input.gradingScaleName,
      gradingScaleType: input.gradingScaleType,
      gradingScaleVGradeRanges: input.gradingScaleVGradeRanges,
      holdTypes: input.holdTypes ?? [],
    });

    if (!updatedClimb) {
      throw new Error('Could not update climb.');
    }

    return updatedClimb;
  },

  async updateLoggedClimb(
    climbId: string,
    input: Omit<StartClimbInput, 'sessionId'> & {
      attemptCount?: number;
      completed?: boolean;
      durationSeconds?: number | null;
    },
  ): Promise<Climb> {
    return withDatabaseTransaction(async () => {
      const climb = await climbRepository.getById(climbId);

      if (!climb) {
        throw new Error('No climb found.');
      }

      const attemptCount =
        input.attemptCount === undefined ? undefined : normalizeAttemptCount(input.attemptCount);

      if (attemptCount !== undefined) {
        await reconcileAttemptRows(climb, attemptCount, resolveAttemptEditEndTime(climb, input.durationSeconds));
      }

      const updatedClimb = await climbRepository.update(climb.id, {
        attemptCount,
        colour: input.colour ?? null,
        completed: input.completed,
        durationSeconds: input.durationSeconds,
        grade: input.grade,
        gradingScaleGrades: input.gradingScaleGrades,
        gradingScaleIsTape: input.gradingScaleIsTape,
        gradingScaleName: input.gradingScaleName,
        gradingScaleType: input.gradingScaleType,
        gradingScaleVGradeRanges: input.gradingScaleVGradeRanges,
        holdTypes: input.holdTypes ?? [],
      });

      if (!updatedClimb) {
        throw new Error('Could not update climb.');
      }

      return updatedClimb;
    });
  },

  async reorderSessionClimbs(sessionId: string, climbIds: string[]) {
    await climbRepository.reorderSessionClimbs(sessionId, climbIds);
  },

  async finishClimb(climbId: string, completed?: boolean): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const updatedClimb = await climbRepository.finish(climb.id, { completed: completed ?? climb.completed });

    if (!updatedClimb) {
      throw new Error('Could not finish climb.');
    }

    return updatedClimb;
  },

  async discardClimb(climbId: string): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const discardedClimb = await climbRepository.discard(climb.id);

    if (!discardedClimb) {
      throw new Error('Could not discard climb.');
    }

    return discardedClimb;
  },

  async deleteClimb(climbId: string): Promise<Climb> {
    const climb = await climbRepository.getById(climbId);

    if (!climb) {
      throw new Error('No climb found.');
    }

    const deletedClimb = await climbRepository.discard(climb.id);

    if (!deletedClimb) {
      throw new Error('Could not remove climb.');
    }

    return deletedClimb;
  },

  async logWarmUpClimb(input: Pick<StartClimbInput, 'grade' | 'gradingScaleGrades' | 'gradingScaleIsTape' | 'gradingScaleName' | 'gradingScaleType' | 'gradingScaleVGradeRanges' | 'sessionId'>): Promise<Climb> {
    return withDatabaseTransaction(async () => {
      const timestamp = nowIso();
      const lastFinishedClimb = await climbRepository.getLastFinishedBySessionId(input.sessionId);
      const climb = await climbRepository.create({
        grade: input.grade,
        gradingScaleGrades: input.gradingScaleGrades,
        gradingScaleIsTape: input.gradingScaleIsTape,
        gradingScaleName: input.gradingScaleName,
        gradingScaleType: input.gradingScaleType,
        gradingScaleVGradeRanges: input.gradingScaleVGradeRanges,
        holdTypes: [warmUpHoldType],
        restBeforeClimbSeconds: lastFinishedClimb?.endTime ? secondsBetween(lastFinishedClimb.endTime, timestamp) : null,
        sessionId: input.sessionId,
        startTime: timestamp,
      });

      await attemptRepository.create({
        attemptNumber: 1,
        climbId: climb.id,
        timestamp,
      });

      const countedClimb = await climbRepository.update(climb.id, { attemptCount: 1 });

      if (!countedClimb) {
        throw new Error('Could not log warm-up.');
      }

      const finishedClimb = await climbRepository.finish(countedClimb.id, {
        completed: true,
        endTime: timestamp,
      });

      if (!finishedClimb) {
        throw new Error('Could not finish warm-up.');
      }

      return finishedClimb;
    });
  },
};
