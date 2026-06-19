import { create } from 'zustand';
import { Climb, Session } from '../../domain/models';
import { climbService, StartClimbInput } from '../climbs';
import { sessionService } from './session.service';
import { ActiveSessionState, ActiveSessionTotals } from './session.types';

type ActiveSessionStore = {
  activeClimb: Climb | null;
  activeSession: Session | null;
  climbs: Climb[];
  error: string | null;
  isLoading: boolean;
  totals: ActiveSessionTotals;
  addAttempt: () => Promise<Climb | null>;
  clearError: () => void;
  deleteClimb: (climbId: string) => Promise<Climb | null>;
  discardActiveClimb: () => Promise<Climb | null>;
  endSession: () => Promise<Session | null>;
  finishActiveClimb: (completed: boolean) => Promise<Climb | null>;
  quickAddWarmUpClimb: (grade: string) => Promise<Climb | null>;
  reorderTimeline: (climbIds: string[]) => Promise<void>;
  restoreActiveSession: () => Promise<Session | null>;
  setActiveClimbCompleted: (completed: boolean) => Promise<Climb | null>;
  startClimb: (input: Omit<StartClimbInput, 'sessionId'>) => Promise<Climb>;
  startSession: () => Promise<Session>;
  undoAttempt: () => Promise<Climb | null>;
  updateActiveClimb: (input: Omit<StartClimbInput, 'sessionId'>) => Promise<Climb | null>;
  updateLoggedClimb: (
    climbId: string,
    input: Omit<StartClimbInput, 'sessionId'> & {
      attemptCount?: number;
      completed?: boolean;
      durationSeconds?: number | null;
    },
  ) => Promise<Climb | null>;
};

const emptyTotals: ActiveSessionTotals = {
  attemptsLogged: 0,
  climbsLogged: 0,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function getStatePatch(activeSession: ActiveSessionState | null) {
  return {
    activeClimb: activeSession?.activeClimb ?? null,
    activeSession: activeSession?.session ?? null,
    climbs: activeSession?.climbs ?? [],
    totals: activeSession?.totals ?? emptyTotals,
  };
}

export const useActiveSessionStore = create<ActiveSessionStore>((set, get) => ({
  activeClimb: null,
  activeSession: null,
  climbs: [],
  error: null,
  isLoading: false,
  totals: emptyTotals,

  clearError() {
    set({ error: null });
  },

  async startSession() {
    set({ error: null, isLoading: true });

    try {
      const activeSession = await sessionService.startSession();
      set({
        ...getStatePatch(activeSession),
        error: null,
        isLoading: false,
      });

      return activeSession.session;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async restoreActiveSession() {
    set({ error: null, isLoading: true });

    try {
      const activeSession = await sessionService.restoreActiveSession();
      set({
        ...getStatePatch(activeSession),
        error: null,
        isLoading: false,
      });

      return activeSession?.session ?? null;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      return null;
    }
  },

  async endSession() {
    const session = get().activeSession;

    if (!session) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const activeClimb = get().activeClimb;

      if (activeClimb) {
        await climbService.finishClimb(activeClimb.id, activeClimb.completed);
      }

      const endedSession = await sessionService.endSession(session.id);
      set({
        activeClimb: null,
        activeSession: null,
        climbs: [],
        error: null,
        isLoading: false,
        totals: emptyTotals,
      });

      return endedSession;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async startClimb(input) {
    const session = get().activeSession;

    if (!session) {
      throw new Error('Start a session before starting a climb.');
    }

    set({ error: null, isLoading: true });

    try {
      await climbService.startClimb({ ...input, sessionId: session.id });
      const activeSession = await sessionService.refreshActiveSession(session.id);
      set({
        ...getStatePatch(activeSession),
        error: null,
        isLoading: false,
      });

      const activeClimb = activeSession?.activeClimb;

      if (!activeClimb) {
        throw new Error('Could not restore active climb.');
      }

      return activeClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async addAttempt() {
    const activeClimb = get().activeClimb;
    const activeSession = get().activeSession;

    if (!activeClimb || !activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      await climbService.addAttempt(activeClimb.id);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return refreshedSession?.activeClimb ?? null;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async undoAttempt() {
    const activeClimb = get().activeClimb;
    const activeSession = get().activeSession;

    if (!activeClimb || !activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      await climbService.undoAttempt(activeClimb.id);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return refreshedSession?.activeClimb ?? null;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async setActiveClimbCompleted(completed) {
    const activeClimb = get().activeClimb;

    if (!activeClimb) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const updatedClimb = await climbService.setCompleted(activeClimb.id, completed);
      set({ activeClimb: updatedClimb, error: null, isLoading: false });

      return updatedClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async updateActiveClimb(input) {
    const activeClimb = get().activeClimb;
    const activeSession = get().activeSession;

    if (!activeClimb || !activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      await climbService.updateClimb(activeClimb.id, input);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return refreshedSession?.activeClimb ?? null;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async updateLoggedClimb(climbId, input) {
    const activeSession = get().activeSession;

    if (!activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const updatedClimb = await climbService.updateLoggedClimb(climbId, input);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return updatedClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async reorderTimeline(climbIds) {
    const activeSession = get().activeSession;

    if (!activeSession) {
      return;
    }

    set({ error: null, isLoading: true });

    try {
      await climbService.reorderSessionClimbs(activeSession.id, climbIds);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async finishActiveClimb(completed) {
    const activeClimb = get().activeClimb;
    const activeSession = get().activeSession;

    if (!activeClimb || !activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const finishedClimb = await climbService.finishClimb(activeClimb.id, completed);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return finishedClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async quickAddWarmUpClimb(grade) {
    const activeSession = get().activeSession;

    if (!activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const warmUpClimb = await climbService.logWarmUpClimb({ grade, sessionId: activeSession.id });
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return warmUpClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async discardActiveClimb() {
    const activeClimb = get().activeClimb;
    const activeSession = get().activeSession;

    if (!activeClimb || !activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const discardedClimb = await climbService.discardClimb(activeClimb.id);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return discardedClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async deleteClimb(climbId) {
    const activeSession = get().activeSession;

    if (!activeSession) {
      return null;
    }

    set({ error: null, isLoading: true });

    try {
      const deletedClimb = await climbService.deleteClimb(climbId);
      const refreshedSession = await sessionService.refreshActiveSession(activeSession.id);
      set({ ...getStatePatch(refreshedSession), error: null, isLoading: false });

      return deletedClimb;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },
}));
