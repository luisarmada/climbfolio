import { Session } from '../../domain/models';
import { climbRepository, sessionRepository, statsRepository } from '../../data/repositories';
import { nowIso } from '../../utils/dates';
import { ActiveSessionState, ActiveSessionTotals } from './session.types';

async function getSessionTotals(sessionId: string): Promise<ActiveSessionTotals> {
  const totals = await statsRepository.getSessionTotals(sessionId);

  return {
    attemptsLogged: totals.attempts,
    climbsLogged: totals.climbs,
  };
}

async function toActiveSessionState(session: Session): Promise<ActiveSessionState> {
  return {
    activeClimb: await climbRepository.getActiveBySessionId(session.id),
    climbs: await climbRepository.listBySessionId(session.id),
    session,
    totals: await getSessionTotals(session.id),
  };
}

export const sessionService = {
  async startSession(): Promise<ActiveSessionState> {
    const existingSession = await sessionRepository.getActive();
    const session = existingSession ?? (await sessionRepository.create());

    return toActiveSessionState(session);
  },

  async restoreActiveSession(): Promise<ActiveSessionState | null> {
    const session = await sessionRepository.getActive();

    return session ? toActiveSessionState(session) : null;
  },

  async getActiveSession(): Promise<ActiveSessionState | null> {
    return sessionService.restoreActiveSession();
  },

  async refreshActiveSession(sessionId: string): Promise<ActiveSessionState | null> {
    const session = await sessionRepository.getById(sessionId);

    if (!session || session.endTime) {
      return null;
    }

    return toActiveSessionState(session);
  },

  async endSession(sessionId: string): Promise<Session | null> {
    return sessionRepository.end(sessionId);
  },

  async discardSession(sessionId: string): Promise<Session | null> {
    return sessionRepository.update(sessionId, { deletedAt: nowIso() });
  },
};
