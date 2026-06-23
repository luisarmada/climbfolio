import { attemptRepository, climbRepository } from '../../data/repositories';
import { Climb } from '../../domain/models';
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

export const climbService = {
  async startClimb(input: StartClimbInput): Promise<Climb> {
    const existingActiveClimb = await climbRepository.getActiveBySessionId(input.sessionId);

    if (existingActiveClimb) {
      throw new Error('Finish or discard the active climb before starting another.');
    }

    const startedAt = nowIso();
    const lastFinishedClimb = await climbRepository.getLastFinishedBySessionId(input.sessionId);
    const climb = await climbRepository.create({
      colour: input.colour ?? null,
      grade: input.grade,
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
  },

  async addAttempt(climbId: string): Promise<Climb> {
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
  },

  async undoAttempt(climbId: string): Promise<Climb> {
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
  },

  async setCompleted(climbId: string, completed: boolean): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const updatedClimb = await climbRepository.update(climb.id, { completed });

    if (!updatedClimb) {
      throw new Error('Could not update climb.');
    }

    return updatedClimb;
  },

  async updateClimb(climbId: string, input: Pick<StartClimbInput, 'colour' | 'grade' | 'holdTypes'>): Promise<Climb> {
    const climb = await requireActiveClimb(climbId);
    const updatedClimb = await climbRepository.update(climb.id, {
      colour: input.colour ?? null,
      grade: input.grade,
      holdTypes: input.holdTypes ?? [],
    });

    if (!updatedClimb) {
      throw new Error('Could not update climb.');
    }

    return updatedClimb;
  },

  async updateLoggedClimb(
    climbId: string,
    input: Pick<StartClimbInput, 'colour' | 'grade' | 'holdTypes'> & {
      attemptCount?: number;
      completed?: boolean;
      durationSeconds?: number | null;
    },
  ): Promise<Climb> {
    const climb = await climbRepository.getById(climbId);

    if (!climb) {
      throw new Error('No climb found.');
    }

    const updatedClimb = await climbRepository.update(climb.id, {
      attemptCount: input.attemptCount,
      colour: input.colour ?? null,
      completed: input.completed,
      durationSeconds: input.durationSeconds,
      grade: input.grade,
      holdTypes: input.holdTypes ?? [],
    });

    if (!updatedClimb) {
      throw new Error('Could not update climb.');
    }

    return updatedClimb;
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

  async logWarmUpClimb(input: { grade: string; sessionId: string }): Promise<Climb> {
    const timestamp = nowIso();
    const lastFinishedClimb = await climbRepository.getLastFinishedBySessionId(input.sessionId);
    const climb = await climbRepository.create({
      grade: input.grade,
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
  },
};
