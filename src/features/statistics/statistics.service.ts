import { getGradeVRank, vScaleGrades } from '../../domain/gradeScales';
import { Climb } from '../../domain/models';
import { getClimbScaleSnapshot } from '../climbs';
import {
  AggregateStats,
  SessionSummary,
  SessionSummaryQuery,
  sessionSummaryService,
  summarizeAggregate,
} from '../summaries';

export type StatisticsPeriod = '4_weeks' | '3_months' | 'year' | 'all';

export type StatisticsState = 'empty' | 'empty_period' | 'one_session' | 'ready';

export type StatisticsDeltaDirection = 'down' | 'none' | 'same' | 'up';

export type StatisticsDelta = {
  direction: StatisticsDeltaDirection;
  label: string;
  value: number | null;
};

export type StatisticsSnapshot = {
  bestSent: {
    delta: StatisticsDelta;
    label: string;
    rank: number | null;
  };
  climbs: {
    delta: StatisticsDelta;
    value: number;
  };
  sessions: {
    delta: StatisticsDelta;
    value: number;
  };
};

export type StatisticsTrendBucket = {
  attempts: number;
  climbs: number;
  completedClimbs: number;
  highestSentGrade: string | null;
  highestSentRank: number | null;
  key: string;
  label: string;
  sessions: number;
  shortLabel: string;
};

export type StatisticsQualityMetric = {
  detail: string;
  key: 'completion_rate' | 'avg_attempts' | 'avg_climbs';
  label: string;
  value: string;
};

export type StatisticsRecoveryMetric = {
  detail: string;
  key: 'rest_attempts' | 'rest_climbs' | 'session_duration';
  label: string;
  seconds: number | null;
};

export type StatisticsGradeMixItem = {
  attempted: number;
  grade: string;
  rank: number;
  sent: number;
  tried: number;
};

export type StatisticsDashboard = {
  gradeMix: StatisticsGradeMixItem[];
  gradeProgress: {
    buckets: StatisticsTrendBucket[];
    highestAttemptedGrade: string | null;
    highestSentGrade: string | null;
    maxRank: number;
    mostClimbedGrade: string | null;
  };
  period: StatisticsPeriod;
  periodLabel: string;
  quality: StatisticsQualityMetric[];
  recovery: StatisticsRecoveryMetric[];
  selectedSessionCount: number;
  snapshot: StatisticsSnapshot;
  state: StatisticsState;
  totalSessionCount: number;
  volumeTrend: {
    buckets: StatisticsTrendBucket[];
    maxClimbs: number;
  };
};

type PeriodBucket = {
  end: Date;
  key: string;
  label: string;
  shortLabel: string;
  start: Date;
};

type PeriodWindow = {
  buckets: PeriodBucket[];
  end: Date;
  label: string;
  previousEnd: Date | null;
  previousStart: Date | null;
  start: Date;
};

type RankedGrade = {
  label: string;
  rank: number;
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = nextDate.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  nextDate.setDate(nextDate.getDate() - daysSinceMonday);
  return nextDate;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const nextDate = cloneDate(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function weekKey(date: Date) {
  const start = startOfWeek(date);
  return `${start.getFullYear()}-W${String(Math.ceil((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date) {
  return `${monthLabels[date.getMonth()] ?? 'Month'} ${date.getFullYear()}`;
}

function formatShortMonthLabel(date: Date) {
  return monthLabels[date.getMonth()] ?? 'Month';
}

function createWeeklyBuckets(start: Date, count: number): PeriodBucket[] {
  return Array.from({ length: count }, (_, index) => {
    const bucketStart = addWeeks(start, index);
    const bucketEnd = addWeeks(bucketStart, 1);

    return {
      end: bucketEnd,
      key: weekKey(bucketStart),
      label: `Week of ${bucketStart.getDate()} ${formatShortMonthLabel(bucketStart)}`,
      shortLabel: `${bucketStart.getDate()} ${formatShortMonthLabel(bucketStart)}`,
      start: bucketStart,
    };
  });
}

function createMonthlyBuckets(start: Date, count: number): PeriodBucket[] {
  return Array.from({ length: count }, (_, index) => {
    const bucketStart = addMonths(start, index);
    const bucketEnd = addMonths(bucketStart, 1);

    return {
      end: bucketEnd,
      key: monthKey(bucketStart),
      label: formatMonthLabel(bucketStart),
      shortLabel: formatShortMonthLabel(bucketStart),
      start: bucketStart,
    };
  });
}

function getEarliestSessionDate(summaries: SessionSummary[], fallback: Date) {
  const timestamp = summaries
    .map((summary) => new Date(summary.session.startTime).getTime())
    .sort((left, right) => left - right)[0];

  return timestamp == null ? fallback : new Date(timestamp);
}

function getPeriodWindow(period: StatisticsPeriod, summaries: SessionSummary[], now = new Date()): PeriodWindow {
  if (period === '4_weeks') {
    const currentWeekStart = startOfWeek(now);
    const start = addWeeks(currentWeekStart, -3);
    const end = addWeeks(currentWeekStart, 1);

    return {
      buckets: createWeeklyBuckets(start, 4),
      end,
      label: 'Last 4 weeks',
      previousEnd: start,
      previousStart: addWeeks(start, -4),
      start,
    };
  }

  if (period === '3_months') {
    const currentMonthStart = startOfMonth(now);
    const start = addMonths(currentMonthStart, -2);
    const end = addMonths(currentMonthStart, 1);

    return {
      buckets: createMonthlyBuckets(start, 3),
      end,
      label: 'Last 3 months',
      previousEnd: start,
      previousStart: addMonths(start, -3),
      start,
    };
  }

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const monthCount = now.getMonth() + 1;
    const end = addMonths(start, monthCount);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);

    return {
      buckets: createMonthlyBuckets(start, monthCount),
      end,
      label: 'This year',
      previousEnd: addMonths(previousStart, monthCount),
      previousStart,
      start,
    };
  }

  const earliestMonth = startOfMonth(getEarliestSessionDate(summaries, now));
  const currentMonth = startOfMonth(now);
  const monthCount = Math.max(
    1,
    (currentMonth.getFullYear() - earliestMonth.getFullYear()) * 12 + currentMonth.getMonth() - earliestMonth.getMonth() + 1,
  );
  const end = addMonths(earliestMonth, monthCount);

  return {
    buckets: createMonthlyBuckets(earliestMonth, monthCount),
    end,
    label: 'All time',
    previousEnd: null,
    previousStart: null,
    start: earliestMonth,
  };
}

function isInRange(summary: SessionSummary, start: Date, end: Date) {
  const timestamp = new Date(summary.session.startTime).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function filterByRange(summaries: SessionSummary[], start: Date, end: Date) {
  return summaries.filter((summary) => isInRange(summary, start, end));
}

function getClimbRank(summary: SessionSummary, climb: Climb) {
  return getGradeVRank(climb.grade, getClimbScaleSnapshot(climb, summary.session));
}

function getHighestGrade(summaries: SessionSummary[], completedOnly: boolean): RankedGrade | null {
  return summaries.reduce<RankedGrade | null>((highest, summary) => {
    return summary.climbs.reduce<RankedGrade | null>((currentHighest, climb) => {
      if (completedOnly && !climb.completed) {
        return currentHighest;
      }

      const rank = getClimbRank(summary, climb);

      if (!currentHighest || rank > currentHighest.rank) {
        return { label: climb.grade, rank };
      }

      return currentHighest;
    }, highest);
  }, null);
}

function formatCountDelta(current: number, previous: number | null): StatisticsDelta {
  if (previous == null) {
    return { direction: 'none', label: 'All time', value: null };
  }

  const difference = current - previous;

  if (difference > 0) {
    return { direction: 'up', label: `+${difference} vs previous`, value: difference };
  }

  if (difference < 0) {
    return { direction: 'down', label: `${difference} vs previous`, value: difference };
  }

  return { direction: 'same', label: 'Same as previous', value: 0 };
}

function formatGradeDelta(current: RankedGrade | null, previous: RankedGrade | null, hasPreviousWindow: boolean): StatisticsDelta {
  if (!current) {
    return { direction: 'none', label: 'No sent climbs', value: null };
  }

  if (!hasPreviousWindow) {
    return { direction: 'none', label: 'All time', value: null };
  }

  if (!previous) {
    return { direction: 'up', label: 'New this period', value: current.rank };
  }

  const difference = current.rank - previous.rank;

  if (difference > 0) {
    return {
      direction: 'up',
      label: `+${difference} grade${difference === 1 ? '' : 's'} vs previous`,
      value: difference,
    };
  }

  if (difference < 0) {
    const positiveDifference = Math.abs(difference);
    return {
      direction: 'down',
      label: `-${positiveDifference} grade${positiveDifference === 1 ? '' : 's'} vs previous`,
      value: difference,
    };
  }

  return { direction: 'same', label: 'Same as previous', value: 0 };
}

function formatOneDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, '');
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function summarizeBucket(bucket: PeriodBucket, summaries: SessionSummary[]): StatisticsTrendBucket {
  const bucketSummaries = filterByRange(summaries, bucket.start, bucket.end);
  const aggregate = summarizeAggregate(bucketSummaries);
  const highestSent = getHighestGrade(bucketSummaries, true);

  return {
    attempts: aggregate.totalAttempts,
    climbs: aggregate.totalClimbs,
    completedClimbs: aggregate.completedClimbs,
    highestSentGrade: highestSent?.label ?? null,
    highestSentRank: highestSent?.rank ?? null,
    key: bucket.key,
    label: bucket.label,
    sessions: aggregate.sessions,
    shortLabel: bucket.shortLabel,
  };
}

function buildSnapshot(current: AggregateStats, previous: AggregateStats | null, currentHighest: RankedGrade | null, previousHighest: RankedGrade | null) {
  return {
    bestSent: {
      delta: formatGradeDelta(currentHighest, previousHighest, Boolean(previous)),
      label: currentHighest?.label ?? 'None yet',
      rank: currentHighest?.rank ?? null,
    },
    climbs: {
      delta: formatCountDelta(current.totalClimbs, previous?.totalClimbs ?? null),
      value: current.totalClimbs,
    },
    sessions: {
      delta: formatCountDelta(current.sessions, previous?.sessions ?? null),
      value: current.sessions,
    },
  };
}

function buildQualityMetrics(aggregate: AggregateStats): StatisticsQualityMetric[] {
  return [
    {
      detail: `${aggregate.completedClimbs} of ${aggregate.totalClimbs} climbs sent`,
      key: 'completion_rate',
      label: 'Completion rate',
      value: `${aggregate.completionRate}%`,
    },
    {
      detail: 'Average attempts logged for each climb',
      key: 'avg_attempts',
      label: 'Avg attempts',
      value: formatOneDecimal(aggregate.averageAttemptsPerClimb),
    },
    {
      detail: 'Average climbs logged per saved session',
      key: 'avg_climbs',
      label: 'Climbs / session',
      value: formatOneDecimal(aggregate.averageClimbsPerSession),
    },
  ];
}

function buildRecoveryMetrics(summaries: SessionSummary[], aggregate: AggregateStats): StatisticsRecoveryMetric[] {
  const restBetweenAttempts = summaries.flatMap((summary) =>
    summary.attempts
      .map((attempt) => attempt.restSincePreviousAttemptSeconds)
      .filter((seconds): seconds is number => seconds != null),
  );
  const restBetweenClimbs = summaries.flatMap((summary) =>
    summary.climbs
      .map((climb) => climb.restBeforeClimbSeconds)
      .filter((seconds): seconds is number => seconds != null),
  );

  return [
    {
      detail: 'Between attempt timestamps',
      key: 'rest_attempts',
      label: 'Between attempts',
      seconds: average(restBetweenAttempts),
    },
    {
      detail: 'Between finished climbs',
      key: 'rest_climbs',
      label: 'Between climbs',
      seconds: average(restBetweenClimbs),
    },
    {
      detail: 'Saved session duration',
      key: 'session_duration',
      label: 'Session duration',
      seconds: aggregate.averageSessionDurationSeconds,
    },
  ];
}

function rankToGrade(rank: number) {
  return vScaleGrades[Math.max(0, Math.min(rank, vScaleGrades.length - 1))] ?? 'V0';
}

function buildGradeMix(summaries: SessionSummary[]): StatisticsGradeMixItem[] {
  const grades = new Map<number, StatisticsGradeMixItem>();

  summaries.forEach((summary) => {
    summary.climbs.forEach((climb) => {
      const rank = getClimbRank(summary, climb);
      const current = grades.get(rank) ?? {
        attempted: 0,
        grade: rankToGrade(rank),
        rank,
        sent: 0,
        tried: 0,
      };

      current.attempted += 1;

      if (climb.completed) {
        current.sent += 1;
      } else {
        current.tried += 1;
      }

      grades.set(rank, current);
    });
  });

  return [...grades.values()].sort((left, right) => left.rank - right.rank);
}

function buildState(totalSessionCount: number, selectedSessionCount: number): StatisticsState {
  if (totalSessionCount === 0) {
    return 'empty';
  }

  if (selectedSessionCount === 0) {
    return 'empty_period';
  }

  if (selectedSessionCount === 1) {
    return 'one_session';
  }

  return 'ready';
}

export function buildStatisticsDashboard(
  summaries: SessionSummary[],
  period: StatisticsPeriod = '3_months',
  now = new Date(),
): StatisticsDashboard {
  const window = getPeriodWindow(period, summaries, now);
  const selectedSummaries = filterByRange(summaries, window.start, window.end);
  const previousSummaries =
    window.previousStart && window.previousEnd ? filterByRange(summaries, window.previousStart, window.previousEnd) : null;
  const currentAggregate = summarizeAggregate(selectedSummaries);
  const previousAggregate = previousSummaries ? summarizeAggregate(previousSummaries) : null;
  const currentHighestSent = getHighestGrade(selectedSummaries, true);
  const previousHighestSent = previousSummaries ? getHighestGrade(previousSummaries, true) : null;
  const currentHighestAttempted = getHighestGrade(selectedSummaries, false);
  const buckets = window.buckets.map((bucket) => summarizeBucket(bucket, selectedSummaries));

  return {
    gradeMix: buildGradeMix(selectedSummaries),
    gradeProgress: {
      buckets,
      highestAttemptedGrade: currentHighestAttempted?.label ?? null,
      highestSentGrade: currentHighestSent?.label ?? null,
      maxRank: Math.max(1, ...buckets.map((bucket) => bucket.highestSentRank ?? 0), currentHighestSent?.rank ?? 0),
      mostClimbedGrade: currentAggregate.mostClimbedGrade,
    },
    period,
    periodLabel: window.label,
    quality: buildQualityMetrics(currentAggregate),
    recovery: buildRecoveryMetrics(selectedSummaries, currentAggregate),
    selectedSessionCount: selectedSummaries.length,
    snapshot: buildSnapshot(currentAggregate, previousAggregate, currentHighestSent, previousHighestSent),
    state: buildState(summaries.length, selectedSummaries.length),
    totalSessionCount: summaries.length,
    volumeTrend: {
      buckets,
      maxClimbs: Math.max(1, ...buckets.map((bucket) => bucket.climbs)),
    },
  };
}

export const statisticsService = {
  async getDashboard(period: StatisticsPeriod = '3_months', query: SessionSummaryQuery = {}, now = new Date()) {
    const summaries = await sessionSummaryService.listCompletedSessionSummaries(query);
    return buildStatisticsDashboard(summaries, period, now);
  },
};
