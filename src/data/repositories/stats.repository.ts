import { initializeDatabase } from '../db/client';

export type SessionTotals = {
  attempts: number;
  climbs: number;
};

type SessionTotalsRow = {
  attempts: number | null;
  climbs: number | null;
};

export type StatsRepository = {
  getSessionTotals(sessionId: string): Promise<SessionTotals>;
};

export const statsRepository: StatsRepository = {
  async getSessionTotals(sessionId) {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<SessionTotalsRow>(
      `
        SELECT
          COALESCE(SUM(climbs.attempt_count), 0) AS attempts,
          COUNT(climbs.id) AS climbs
        FROM climbs
        WHERE climbs.session_id = ? AND climbs.deleted_at IS NULL;
      `,
      [sessionId],
    );

    return {
      attempts: row?.attempts ?? 0,
      climbs: row?.climbs ?? 0,
    };
  },
};
