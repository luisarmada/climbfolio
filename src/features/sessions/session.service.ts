import { EndSessionInput, Session, SessionMetadataInput } from '../../domain/models';
import { climbRepository, sessionRepository, statsRepository } from '../../data/repositories';
import { resolveSelectedGradingScale } from '../../domain/gradeScales';
import { nowIso } from '../../utils/dates';
import { climbingPreferencesService } from '../preferences';
import { locationService } from '../locations';
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
    const existingSession = await sessionRepository.getActive();
    const preferences = existingSession ? null : await climbingPreferencesService.getLocalPreferences();
    const locations = existingSession ? [] : await locationService.listLocations();
    const selectedLocation =
      input.locationId === null
        ? null
        : input.locationId
          ? locations.find((location) => location.id === input.locationId) ?? null
          : locations.find((location) => location.isSelected) ?? null;
    const gradingScale = preferences
      ? resolveSelectedGradingScale({
          customScales: preferences.customScales,
          selectedGradingScaleId: selectedLocation?.gradingScaleId ?? preferences.selectedGradingScaleId,
        })
      : null;
    const session =
      existingSession ??
      (await sessionRepository.create(
        gradingScale
          ? {
              gradingScaleGrades: gradingScale.gradingScaleGrades,
              gradingScaleIsTape: gradingScale.gradingScaleIsTape,
              gradingScaleName: gradingScale.gradingScaleName,
              gradingScaleType: gradingScale.gradingScaleType,
              gradingScaleVGradeRanges: gradingScale.gradingScaleVGradeRanges,
              locationId: selectedLocation?.id ?? null,
              locationName: selectedLocation?.name ?? null,
              locationType: selectedLocation?.type ?? null,
            }
          : undefined,
      ));

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

  async endSession(sessionId: string, input: EndSessionInput = {}): Promise<Session | null> {
    const endTime = input.endTime ?? nowIso();
    const metadata = normalizeSessionMetadata(input, new Date(endTime));

    return sessionRepository.end(sessionId, { ...metadata, endTime });
  },

  async updateSavedSession(sessionId: string, input: SessionMetadataInput): Promise<Session | null> {
    const name = input.name?.trim() || null;
    const description = input.description?.trim() || null;
    const locationName = input.locationName?.trim() || null;

    return sessionRepository.update(sessionId, {
      description,
      locationId: locationName ? input.locationId ?? null : null,
      locationName,
      locationType: locationName ? input.locationType ?? null : null,
      name,
    });
  },

  async deleteSavedSession(sessionId: string): Promise<Session | null> {
    return sessionRepository.update(sessionId, { deletedAt: nowIso() });
  },

  async discardSession(sessionId: string): Promise<Session | null> {
    return sessionRepository.update(sessionId, { deletedAt: nowIso() });
  },
};
