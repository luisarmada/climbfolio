import { EndSessionInput, Session, SessionMetadataInput } from '../../domain/models';
import { withDatabaseTransaction } from '../../data/db/client';
import { isDatabaseConstraintError } from '../../data/db/errors';
import { climbRepository, sessionRepository, statsRepository } from '../../data/repositories';
import { resolveSelectedGradingScale } from '../../domain/gradeScales';
import { nowIso } from '../../utils/dates';
import { inputLimits, normalizeMultilineInput, normalizeSingleLineInput } from '../../utils/inputValidation';
import { climbingPreferencesService } from '../preferences';
import { locationService } from '../locations';
import { invalidateSessionSummaryCache } from '../summaries/session-summary.cache';
import { ActiveSessionState, ActiveSessionTotals } from './session.types';
import { normalizeSessionMetadata } from './session.finalization';

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
  async startSession(input: { locationId?: string | null } = {}): Promise<ActiveSessionState> {
    try {
      const activeSession = await withDatabaseTransaction(async () => {
        const existingSession = await sessionRepository.getActive();

        if (existingSession) {
          return toActiveSessionState(existingSession);
        }

        const preferences = await climbingPreferencesService.getLocalPreferences();
        const locations = await locationService.listLocations();
        const selectedLocation =
          input.locationId === null
            ? null
            : input.locationId
              ? locations.find((location) => location.id === input.locationId) ?? null
              : locations.find((location) => location.isSelected) ?? null;
        const gradingScale = resolveSelectedGradingScale({
          customScales: preferences.customScales,
          selectedGradingScaleId: selectedLocation?.gradingScaleId ?? preferences.selectedGradingScaleId,
        });
        const session = await sessionRepository.create({
          gradingScaleGrades: gradingScale.gradingScaleGrades,
          gradingScaleIsTape: gradingScale.gradingScaleIsTape,
          gradingScaleName: gradingScale.gradingScaleName,
          gradingScaleType: gradingScale.gradingScaleType,
          gradingScaleVGradeRanges: gradingScale.gradingScaleVGradeRanges,
          locationId: selectedLocation?.id ?? null,
          locationName: selectedLocation?.name ?? null,
          locationType: selectedLocation?.type ?? null,
        });

        return toActiveSessionState(session);
      });

      invalidateSessionSummaryCache();
      return activeSession;
    } catch (error) {
      if (isDatabaseConstraintError(error)) {
        const existingSession = await sessionRepository.getActive();

        if (existingSession) {
          return toActiveSessionState(existingSession);
        }
      }

      throw error;
    }
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

  async endSession(sessionId: string, input: EndSessionInput = {}): Promise<Session | null> {
    const endTime = input.endTime ?? nowIso();
    const metadata = normalizeSessionMetadata(input, new Date(endTime));

    const endedSession = await sessionRepository.end(sessionId, { ...metadata, endTime });
    invalidateSessionSummaryCache();
    return endedSession;
  },

  async updateSavedSession(sessionId: string, input: SessionMetadataInput): Promise<Session | null> {
    const name = normalizeSingleLineInput(input.name, inputLimits.sessionName) || null;
    const description = normalizeMultilineInput(input.description, inputLimits.sessionDescription) || null;
    const locationName = normalizeSingleLineInput(input.locationName, inputLimits.locationName) || null;

    const updatedSession = await sessionRepository.update(sessionId, {
      description,
      locationId: locationName ? input.locationId ?? null : null,
      locationName,
      locationType: locationName ? input.locationType ?? null : null,
      name,
    });
    invalidateSessionSummaryCache();
    return updatedSession;
  },

  async deleteSavedSession(sessionId: string): Promise<Session | null> {
    const deletedSession = await sessionRepository.update(sessionId, { deletedAt: nowIso() });
    invalidateSessionSummaryCache();
    return deletedSession;
  },

  async discardSession(sessionId: string): Promise<Session | null> {
    const discardedSession = await sessionRepository.update(sessionId, { deletedAt: nowIso() });
    invalidateSessionSummaryCache();
    return discardedSession;
  },
};
