import { attemptRepository, climbRepository, sessionRepository } from '../../data/repositories';
import { Attempt, Climb, Session } from '../../domain/models';
import { GradingScaleSnapshot, getGradeVRank } from '../../domain/gradeScales';
import { getClimbScaleSnapshot, getKnownFeatures, normalizeFeature, warmUpHoldType } from '../climbs';
import { getCollectionGradeIndex, getCollectionScaleKey } from '../collections/collection.service';
import { getSessionSummaryCacheRevision } from './session-summary.cache';

export type SessionSummary = {
  session: Session;
  climbs: Climb[];
  attempts: Attempt[];
  averageAttemptsPerClimb: number;
  averageRestBetweenAttemptsSeconds: number | null;
  averageRestBetweenClimbsSeconds: number | null;
  completedClimbs: number;
  completionRate: number;
  highestGradeAttempted: string | null;
  highestGradeCompleted: string | null;
  mostCommonColour: string | null;
  mostCommonHoldType: string | null;
  totalAttempts: number;
  totalClimbs: number;
};

export type AggregateStats = {
  averageAttemptsPerClimb: number;
  averageClimbsPerSession: number;
  averageSessionDurationSeconds: number | null;
  completedClimbs: number;
  completionRate: number;
  highestGradeAttempted: string | null;
  highestGradeCompleted: string | null;
  mostClimbedGrade: string | null;
  mostCommonColour: string | null;
  mostCommonHoldType: string | null;
  sessions: number;
  totalAttempts: number;
  totalClimbs: number;
};

export type CalendarStats = {
  highestWeeklyStreak: number;
  restDaysSinceLastSession: number;
  sessionDayKeys: Set<string>;
  weeklyStreak: number;
};

export type SessionSummaryQuery = {
  locationId?: string | null;
  sessionIds?: string[];
  startTimeBefore?: string;
  startTimeFrom?: string;
  userIds?: string[];
};

export type CollectionCellSessionSummaryQuery = {
  feature: string;
  grade: string;
  locationId?: string | null;
  scale: GradingScaleSnapshot;
  userIds?: string[];
};

function highestGrade(entries: { climb: Climb; scale: Pick<GradingScaleSnapshot, 'gradingScaleVGradeRanges'> }[]) {
  return entries.reduce<{ grade: string; rank: number } | null>((highest, entry) => {
    const rank = getGradeVRank(entry.climb.grade, entry.scale);

    if (!highest || rank > highest.rank) {
      return { grade: entry.climb.grade, rank };
    }

    return highest;
  }, null)?.grade ?? null;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function mostCommon(values: string[]) {
  if (values.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function splitColours(colour: string | null) {
  if (!colour) {
    return [];
  }

  return colour
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

let completedSummaryCache: SessionSummary[] | null = null;
let completedSummaryCachePromise: Promise<SessionSummary[]> | null = null;
let completedSummaryCacheRevision = getSessionSummaryCacheRevision();

function ensureCompletedSummaryCacheFresh() {
  const revision = getSessionSummaryCacheRevision();

  if (revision !== completedSummaryCacheRevision) {
    completedSummaryCache = null;
    completedSummaryCachePromise = null;
    completedSummaryCacheRevision = revision;
  }
}

function hasEmptyListFilter(query: SessionSummaryQuery) {
  return query.userIds?.length === 0 || query.sessionIds?.length === 0;
}

function canUseWholeHistoryCache(query: SessionSummaryQuery) {
  return (
    query.locationId === undefined &&
    query.sessionIds === undefined &&
    query.startTimeBefore === undefined &&
    query.startTimeFrom === undefined
  );
}

function filterSummaries(summaries: SessionSummary[], query: SessionSummaryQuery) {
  if (hasEmptyListFilter(query)) {
    return [];
  }

  const userIds = query.userIds ? new Set(query.userIds) : null;
  const sessionIds = query.sessionIds ? new Set(query.sessionIds) : null;

  return summaries.filter((summary) => {
    if (userIds && !userIds.has(summary.session.userId)) {
      return false;
    }

    if (sessionIds && !sessionIds.has(summary.session.id)) {
      return false;
    }

    if (query.startTimeFrom && summary.session.startTime < query.startTimeFrom) {
      return false;
    }

    if (query.startTimeBefore && summary.session.startTime >= query.startTimeBefore) {
      return false;
    }

    if (query.locationId !== undefined && summary.session.locationId !== query.locationId) {
      return false;
    }

    return true;
  });
}

export function summarizeAggregate(summaries: SessionSummary[]): AggregateStats {
  const climbs = summaries.flatMap((summary) => summary.climbs);
  const completed = climbs.filter((climb) => climb.completed);
  const climbEntries = summaries.flatMap((summary) =>
    summary.climbs.map((climb) => ({ climb, scale: getClimbScaleSnapshot(climb, summary.session) })),
  );
  const completedEntries = climbEntries.filter((entry) => entry.climb.completed);
  const totalAttempts = summaries.reduce((total, summary) => total + summary.totalAttempts, 0);
  const sessionDurations = summaries
    .map((summary) => summary.session.durationSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const colours = climbs.flatMap((climb) => splitColours(climb.colour));
  const holdTypes = climbs.flatMap((climb) =>
    climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType).map(normalizeFeature),
  );

  return {
    averageAttemptsPerClimb: climbs.length === 0 ? 0 : totalAttempts / climbs.length,
    averageClimbsPerSession: summaries.length === 0 ? 0 : climbs.length / summaries.length,
    averageSessionDurationSeconds: average(sessionDurations),
    completedClimbs: completed.length,
    completionRate: climbs.length === 0 ? 0 : Math.round((completed.length / climbs.length) * 100),
    highestGradeAttempted: highestGrade(climbEntries),
    highestGradeCompleted: highestGrade(completedEntries),
    mostClimbedGrade: mostCommon(climbs.map((climb) => climb.grade)),
    mostCommonColour: mostCommon(colours),
    mostCommonHoldType: mostCommon(holdTypes),
    sessions: summaries.length,
    totalAttempts,
    totalClimbs: climbs.length,
  };
}

function isSameMonth(value: string, date: Date) {
  const nextDate = new Date(value);

  return nextDate.getFullYear() === date.getFullYear() && nextDate.getMonth() === date.getMonth();
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() - daysSinceMonday);

  return nextDate;
}

function weekKey(date: Date) {
  return startOfWeek(date).toISOString().slice(0, 10);
}

export function getLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function calculateWeeklyStreak(summaries: SessionSummary[], date = new Date()) {
  const activeWeeks = new Set(
    summaries
      .filter((summary) => summary.totalClimbs > 0)
      .map((summary) => weekKey(new Date(summary.session.startTime))),
  );
  let cursor = startOfWeek(date);
  let streak = 0;

  if (!activeWeeks.has(weekKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
  }

  while (activeWeeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

export function calculateHighestWeeklyStreak(summaries: SessionSummary[]) {
  const activeWeekTimestamps = [
    ...new Set(
      summaries
        .filter((summary) => summary.totalClimbs > 0)
        .map((summary) => startOfWeek(new Date(summary.session.startTime)).getTime()),
    ),
  ].sort((left, right) => left - right);
  let highest = 0;
  let current = 0;
  let previousTimestamp: number | null = null;
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  activeWeekTimestamps.forEach((timestamp) => {
    current = previousTimestamp != null && timestamp - previousTimestamp === weekMs ? current + 1 : 1;
    highest = Math.max(highest, current);
    previousTimestamp = timestamp;
  });

  return highest;
}

export function calculateRestDaysSinceLastSession(summaries: SessionSummary[], date = new Date()) {
  const latestSessionTime = summaries
    .map((summary) => new Date(summary.session.startTime).getTime())
    .sort((left, right) => right - left)[0];

  if (latestSessionTime == null) {
    return 0;
  }

  const today = new Date(date);
  const latestSessionDate = new Date(latestSessionTime);

  today.setHours(0, 0, 0, 0);
  latestSessionDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today.getTime() - latestSessionDate.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getCalendarStats(summaries: SessionSummary[], date = new Date()): CalendarStats {
  return {
    highestWeeklyStreak: calculateHighestWeeklyStreak(summaries),
    restDaysSinceLastSession: calculateRestDaysSinceLastSession(summaries, date),
    sessionDayKeys: new Set(summaries.map((summary) => getLocalDayKey(new Date(summary.session.startTime)))),
    weeklyStreak: calculateWeeklyStreak(summaries, date),
  };
}

function groupBy<T>(items: T[], selectKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  items.forEach((item) => {
    const key = selectKey(item);
    const group = groups.get(key);

    if (group) {
      group.push(item);
      return;
    }

    groups.set(key, [item]);
  });

  return groups;
}

function summarizeSessionFromData(session: Session, climbs: Climb[], attempts: Attempt[]): SessionSummary {
  const completed = climbs.filter((climb) => climb.completed);
  const climbEntries = climbs.map((climb) => ({ climb, scale: getClimbScaleSnapshot(climb, session) }));
  const completedEntries = climbEntries.filter((entry) => entry.climb.completed);
  const restBetweenAttempts = attempts
    .map((attempt) => attempt.restSincePreviousAttemptSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const restBetweenClimbs = climbs
    .map((climb) => climb.restBeforeClimbSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const colours = climbs.flatMap((climb) => splitColours(climb.colour));
  const holdTypes = climbs.flatMap((climb) =>
    climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType).map(normalizeFeature),
  );
  const totalAttempts = climbs.reduce((total, climb) => total + climb.attemptCount, 0);

  return {
    session,
    climbs,
    attempts,
    averageAttemptsPerClimb: climbs.length === 0 ? 0 : totalAttempts / climbs.length,
    averageRestBetweenAttemptsSeconds: average(restBetweenAttempts),
    averageRestBetweenClimbsSeconds: average(restBetweenClimbs),
    completedClimbs: completed.length,
    completionRate: climbs.length === 0 ? 0 : Math.round((completed.length / climbs.length) * 100),
    highestGradeAttempted: highestGrade(climbEntries),
    highestGradeCompleted: highestGrade(completedEntries),
    mostCommonColour: mostCommon(colours),
    mostCommonHoldType: mostCommon(holdTypes),
    totalAttempts,
    totalClimbs: climbs.length,
  };
}

async function summarizeSessions(sessions: Session[]): Promise<SessionSummary[]> {
  if (sessions.length === 0) {
    return [];
  }

  const climbs = await climbRepository.listBySessionIds(sessions.map((session) => session.id));
  const attempts = await attemptRepository.listByClimbIds(climbs.map((climb) => climb.id));
  const climbsBySessionId = groupBy(climbs, (climb) => climb.sessionId);
  const attemptsByClimbId = groupBy(attempts, (attempt) => attempt.climbId);

  return sessions.map((session) => {
    const sessionClimbs = climbsBySessionId.get(session.id) ?? [];
    const sessionAttempts = sessionClimbs.flatMap((climb) => attemptsByClimbId.get(climb.id) ?? []);

    return summarizeSessionFromData(session, sessionClimbs, sessionAttempts);
  });
}

async function summarizeSession(session: Session): Promise<SessionSummary> {
  const [summary] = await summarizeSessions([session]);
  return summary ?? summarizeSessionFromData(session, [], []);
}

async function loadCompletedSessionSummaries(query: SessionSummaryQuery = {}) {
  if (hasEmptyListFilter(query)) {
    return [];
  }

  const sessions = await sessionRepository.listCompleted({
    locationId: query.locationId,
    sessionIds: query.sessionIds,
    startTimeBefore: query.startTimeBefore,
    startTimeFrom: query.startTimeFrom,
    userIds: query.userIds,
  });

  return summarizeSessions(sessions);
}

async function getCompletedSummaryCache() {
  ensureCompletedSummaryCacheFresh();

  if (completedSummaryCache) {
    return completedSummaryCache;
  }

  if (completedSummaryCachePromise) {
    return completedSummaryCachePromise;
  }

  const revision = getSessionSummaryCacheRevision();
  completedSummaryCachePromise = loadCompletedSessionSummaries().then((summaries) => {
    if (revision === getSessionSummaryCacheRevision()) {
      completedSummaryCache = summaries;
    }

    return summaries;
  }).finally(() => {
    if (revision === getSessionSummaryCacheRevision()) {
      completedSummaryCachePromise = null;
    }
  });

  return completedSummaryCachePromise;
}

function getLocalDayRange(dayKey: string) {
  const [year = '0', month = '1', day = '1'] = dayKey.split('-');
  const start = new Date(Number(year), Number(month) - 1, Number(day));
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startTimeBefore: end.toISOString(),
    startTimeFrom: start.toISOString(),
  };
}

function collectionCellMatchesSummary(summary: SessionSummary, query: CollectionCellSessionSummaryQuery) {
  const scaleKey = getCollectionScaleKey(query.scale);

  return summary.climbs.some((climb) => {
    const climbScale = getClimbScaleSnapshot(climb, summary.session);

    return (
      getCollectionScaleKey(climbScale) === scaleKey &&
      climb.completed &&
      getKnownFeatures(climb.holdTypes).includes(query.feature) &&
      query.scale.gradingScaleGrades[getCollectionGradeIndex(climb.grade, climbScale, query.scale)] === query.grade
    );
  });
}

export const sessionSummaryService = {
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    ensureCompletedSummaryCacheFresh();

    const cachedSummary = completedSummaryCache?.find((summary) => summary.session.id === sessionId);

    if (cachedSummary) {
      return cachedSummary;
    }

    const [completedSummary] = await loadCompletedSessionSummaries({ sessionIds: [sessionId] });

    if (completedSummary) {
      return completedSummary;
    }

    const session = await sessionRepository.getById(sessionId);

    if (!session) {
      return null;
    }

    return summarizeSession(session);
  },

  async listCompletedSessionSummaries(query: SessionSummaryQuery = {}): Promise<SessionSummary[]> {
    ensureCompletedSummaryCacheFresh();

    if (hasEmptyListFilter(query)) {
      return [];
    }

    if (canUseWholeHistoryCache(query)) {
      return filterSummaries(await getCompletedSummaryCache(), query);
    }

    if (completedSummaryCache) {
      return filterSummaries(completedSummaryCache, query);
    }

    return loadCompletedSessionSummaries(query);
  },

  async listCompletedSessionSummariesForDay(dayKey: string, query: Pick<SessionSummaryQuery, 'userIds'> = {}) {
    return sessionSummaryService.listCompletedSessionSummaries({
      ...query,
      ...getLocalDayRange(dayKey),
    });
  },

  async listCompletedSessionSummariesForCollectionCell(query: CollectionCellSessionSummaryQuery): Promise<SessionSummary[]> {
    ensureCompletedSummaryCacheFresh();

    if (query.userIds?.length === 0) {
      return [];
    }

    const cachedSummaries = completedSummaryCache ?? (completedSummaryCachePromise ? await completedSummaryCachePromise : null);

    if (cachedSummaries) {
      return filterSummaries(cachedSummaries, query).filter((summary) => collectionCellMatchesSummary(summary, query));
    }

    const sessions = await sessionRepository.listCompleted({
      locationId: query.locationId,
      userIds: query.userIds,
    });
    const sessionIds = sessions.map((session) => session.id);

    if (sessionIds.length === 0) {
      return [];
    }

    const sessionsById = new Map(sessions.map((session) => [session.id, session]));
    const completedClimbs = await climbRepository.listBySessionIds(sessionIds, { completedOnly: true });
    const scaleKey = getCollectionScaleKey(query.scale);
    const matchingSessionIds = new Set<string>();

    completedClimbs.forEach((climb) => {
      const session = sessionsById.get(climb.sessionId);

      if (!session) {
        return;
      }

      const climbScale = getClimbScaleSnapshot(climb, session);

      if (
        getCollectionScaleKey(climbScale) === scaleKey &&
        getKnownFeatures(climb.holdTypes).includes(query.feature) &&
        query.scale.gradingScaleGrades[getCollectionGradeIndex(climb.grade, climbScale, query.scale)] === query.grade
      ) {
        matchingSessionIds.add(climb.sessionId);
      }
    });

    return sessionSummaryService.listCompletedSessionSummaries({ sessionIds: [...matchingSessionIds] });
  },

  async getAggregateStats(query: SessionSummaryQuery = {}): Promise<AggregateStats> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries(query);
    return summarizeAggregate(summaries);
  },

  async getMonthlyAggregateStats(date = new Date(), query: SessionSummaryQuery = {}): Promise<AggregateStats> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries(query);
    return summarizeAggregate(summaries.filter((summary) => isSameMonth(summary.session.startTime, date)));
  },

  async getWeeklyStreak(date = new Date(), query: SessionSummaryQuery = {}): Promise<number> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries(query);
    return calculateWeeklyStreak(summaries, date);
  },

  async getCalendarStats(date = new Date(), query: SessionSummaryQuery = {}): Promise<CalendarStats> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries(query);
    return getCalendarStats(summaries, date);
  },
};

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) {
    return '0m';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

export function formatOptionalDuration(seconds: number | null | undefined) {
  return seconds == null ? 'N/A' : formatDuration(seconds);
}

export function formatOneDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}
