import { Climb, Session } from '../../domain/models';
import { ActiveSessionTotals } from './session.types';

export type ActiveSessionSnapshot = {
  activeClimbId: string | null;
  activeClimbLabel: string | null;
  attemptsLogged: number;
  climbsLogged: number;
  sessionId: string;
  sessionStartedAt: string;
};

export function createActiveSessionSnapshot(input: {
  activeClimb: Climb | null;
  session: Session;
  totals: ActiveSessionTotals;
}): ActiveSessionSnapshot {
  return {
    activeClimbId: input.activeClimb?.id ?? null,
    activeClimbLabel: input.activeClimb
      ? `${input.activeClimb.grade}${input.activeClimb.colour ? ` - ${input.activeClimb.colour}` : ''}`
      : null,
    attemptsLogged: input.totals.attemptsLogged,
    climbsLogged: input.totals.climbsLogged,
    sessionId: input.session.id,
    sessionStartedAt: input.session.startTime,
  };
}
