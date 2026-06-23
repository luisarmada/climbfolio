import { attemptRepository, climbRepository, sessionRepository } from '../../data/repositories';
import { Attempt, Climb, Session } from '../../domain/models';
import { climbGrades, warmUpHoldType } from '../climbs';

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

function gradeRank(grade: string) {
  const index = climbGrades.indexOf(grade);
  return index === -1 ? -1 : index;
}

function highestGrade(climbs: Climb[]) {
  return climbs.reduce<string | null>((highest, climb) => {
    if (!highest || gradeRank(climb.grade) > gradeRank(highest)) {
      return climb.grade;
    }

    return highest;
  }, null);
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

export function summarizeAggregate(summaries: SessionSummary[]): AggregateStats {
  const climbs = summaries.flatMap((summary) => summary.climbs);
  const completed = climbs.filter((climb) => climb.completed);
  const totalAttempts = summaries.reduce((total, summary) => total + summary.totalAttempts, 0);
  const sessionDurations = summaries
    .map((summary) => summary.session.durationSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const colours = climbs.flatMap((climb) => splitColours(climb.colour));
  const holdTypes = climbs.flatMap((climb) => climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType));

  return {
    averageAttemptsPerClimb: climbs.length === 0 ? 0 : totalAttempts / climbs.length,
    averageClimbsPerSession: summaries.length === 0 ? 0 : climbs.length / summaries.length,
    averageSessionDurationSeconds: average(sessionDurations),
    completedClimbs: completed.length,
    completionRate: climbs.length === 0 ? 0 : Math.round((completed.length / climbs.length) * 100),
    highestGradeAttempted: highestGrade(climbs),
    highestGradeCompleted: highestGrade(completed),
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

export function calculateWeeklyStreak(summaries: SessionSummary[], date = new Date()) {
  const activeWeeks = new Set(
    summaries
      .filter((summary) => summary.totalClimbs > 0)
      .map((summary) => weekKey(new Date(summary.session.startTime))),
  );
  let cursor = startOfWeek(date);
  let streak = 0;

  while (activeWeeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

async function summarizeSession(session: Session): Promise<SessionSummary> {
  const climbs = await climbRepository.listBySessionId(session.id);
  const attemptsByClimb = await Promise.all(climbs.map((climb) => attemptRepository.listByClimbId(climb.id)));
  const attempts = attemptsByClimb.flat();
  const completed = climbs.filter((climb) => climb.completed);
  const restBetweenAttempts = attempts
    .map((attempt) => attempt.restSincePreviousAttemptSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const restBetweenClimbs = climbs
    .map((climb) => climb.restBeforeClimbSeconds)
    .filter((seconds): seconds is number => seconds != null);
  const colours = climbs.flatMap((climb) => splitColours(climb.colour));
  const holdTypes = climbs.flatMap((climb) => climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType));
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
    highestGradeAttempted: highestGrade(climbs),
    highestGradeCompleted: highestGrade(completed),
    mostCommonColour: mostCommon(colours),
    mostCommonHoldType: mostCommon(holdTypes),
    totalAttempts,
    totalClimbs: climbs.length,
  };
}

export const sessionSummaryService = {
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    const session = await sessionRepository.getById(sessionId);

    if (!session) {
      return null;
    }

    return summarizeSession(session);
  },

  async listCompletedSessionSummaries(): Promise<SessionSummary[]> {
    const sessions = await sessionRepository.listCompleted();
    return Promise.all(sessions.map(summarizeSession));
  },

  async getAggregateStats(): Promise<AggregateStats> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries();
    return summarizeAggregate(summaries);
  },

  async getMonthlyAggregateStats(date = new Date()): Promise<AggregateStats> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries();
    return summarizeAggregate(summaries.filter((summary) => isSameMonth(summary.session.startTime, date)));
  },

  async getWeeklyStreak(date = new Date()): Promise<number> {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries();
    return calculateWeeklyStreak(summaries, date);
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

export function formatMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}
