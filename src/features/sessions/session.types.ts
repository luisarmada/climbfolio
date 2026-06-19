import { Climb, Session } from '../../domain/models';

export type ActiveSessionTotals = {
  attemptsLogged: number;
  climbsLogged: number;
};

export type ActiveSessionState = {
  activeClimb: Climb | null;
  climbs: Climb[];
  session: Session;
  totals: ActiveSessionTotals;
};
