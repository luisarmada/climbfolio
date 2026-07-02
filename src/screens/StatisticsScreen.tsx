import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SegmentedControl } from '../components/SegmentedControl';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useProfileStore } from '../features/profile';
import { SessionSummary, formatOptionalDuration, sessionSummaryService } from '../features/summaries';
import {
  StatisticsGradeMixItem,
  StatisticsPeriod,
  StatisticsQualityMetric,
  StatisticsRecoveryMetric,
  StatisticsTrendBucket,
  buildStatisticsDashboard,
} from '../features/statistics';
import { runAfterInteractionsWithFallback } from '../utils/runAfterInteractions';

type FeatherName = ComponentProps<typeof Feather>['name'];

const periodSegments: { label: string; value: StatisticsPeriod }[] = [
  { label: '4 weeks', value: '4_weeks' },
  { label: '3 months', value: '3_months' },
  { label: 'Year', value: 'year' },
  { label: 'All', value: 'all' },
];

const qualityIcons: Record<StatisticsQualityMetric['key'], FeatherName> = {
  avg_attempts: 'target',
  avg_climbs: 'activity',
  completion_rate: 'check-circle',
};

const recoveryIcons: Record<StatisticsRecoveryMetric['key'], FeatherName> = {
  rest_attempts: 'pause-circle',
  rest_climbs: 'clock',
  session_duration: 'clock',
};

const recoveryAccents: Record<StatisticsRecoveryMetric['key'], string> = {
  rest_attempts: colors.sky,
  rest_climbs: colors.mint,
  session_duration: colors.lavender,
};

function getDeltaColor(direction: string) {
  if (direction === 'up') {
    return colors.success;
  }

  if (direction === 'down') {
    return colors.coral;
  }

  return colors.muted;
}

function SnapshotMetric({
  accent,
  deltaLabel,
  deltaDirection,
  icon,
  label,
  value,
}: {
  accent: string;
  deltaDirection: string;
  deltaLabel: string;
  icon: FeatherName;
  label: string;
  value: string;
}) {
  return (
    <AppCard style={styles.snapshotCard}>
      <View style={[styles.snapshotIcon, { backgroundColor: accent }]}>
        <Feather name={icon} size={16} color={colors.charcoal} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.snapshotValue}>{value}</Text>
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text numberOfLines={2} style={[styles.deltaText, { color: getDeltaColor(deltaDirection) }]}>{deltaLabel}</Text>
    </AppCard>
  );
}

function EmptyStatisticsState({ onOpenClimb }: { onOpenClimb: () => void }) {
  return (
    <AppCard style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Feather name="bar-chart-2" size={25} color={colors.charcoal} />
      </View>
      <Text style={styles.emptyTitle}>No statistics yet</Text>
      <Text style={styles.emptyCopy}>End a climbing session and your progress trends will appear here.</Text>
      <AppButton icon="plus" onPress={onOpenClimb} title="Go to Climb" variant="secondary" />
    </AppCard>
  );
}

function PeriodEmptyState({ periodLabel }: { periodLabel: string }) {
  return (
    <AppCard style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.sky }]}>
        <Feather name="calendar" size={25} color={colors.charcoal} />
      </View>
      <Text style={styles.emptyTitle}>No sessions in this period</Text>
      <Text style={styles.emptyCopy}>{periodLabel} has no saved sessions yet.</Text>
    </AppCard>
  );
}

function OneSessionState() {
  return (
    <AppCard style={styles.noticeCard}>
      <View style={styles.noticeIcon}>
        <Feather name="trending-up" size={18} color={colors.charcoal} />
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>One session logged</Text>
        <Text style={styles.noticeText}>A little more history will make the trend cards clearer.</Text>
      </View>
    </AppCard>
  );
}

function VolumeTrendCard({
  buckets,
  maxClimbs,
  periodLabel,
}: {
  buckets: StatisticsTrendBucket[];
  maxClimbs: number;
  periodLabel: string;
}) {
  return (
    <AppCard style={styles.chartCard}>
      <View style={styles.cardTitleRow}>
        <View>
          <Text style={styles.cardTitle}>Volume trend</Text>
          <Text style={styles.cardSubtitle}>{periodLabel} climbs</Text>
        </View>
        <View style={[styles.cardIcon, { backgroundColor: colors.amber }]}>
          <Feather name="bar-chart-2" size={17} color={colors.charcoal} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.barChart}>
          {buckets.map((bucket) => {
            const barPercent = bucket.climbs === 0 ? 0 : Math.max(8, (bucket.climbs / maxClimbs) * 100);

            return (
              <View
                accessible
                accessibilityLabel={`${bucket.label}: ${bucket.climbs} climbs, ${bucket.sessions} sessions, ${bucket.attempts} attempts`}
                key={bucket.key}
                style={styles.barColumn}
              >
                <Text style={styles.barValue}>{bucket.climbs}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${barPercent}%` }]} />
                </View>
                <Text numberOfLines={1} style={styles.barLabel}>{bucket.shortLabel}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </AppCard>
  );
}

function GradeProgressCard({
  buckets,
  highestAttemptedGrade,
  highestSentGrade,
  maxRank,
  mostClimbedGrade,
}: {
  buckets: StatisticsTrendBucket[];
  highestAttemptedGrade: string | null;
  highestSentGrade: string | null;
  maxRank: number;
  mostClimbedGrade: string | null;
}) {
  const hasSentGrade = buckets.some((bucket) => bucket.highestSentRank != null);

  return (
    <AppCard style={styles.chartCard}>
      <View style={styles.cardTitleRow}>
        <View>
          <Text style={styles.cardTitle}>Grade progress</Text>
          <Text style={styles.cardSubtitle}>Highest sent by period</Text>
        </View>
        <View style={[styles.cardIcon, { backgroundColor: colors.coral }]}>
          <Feather name="trending-up" size={17} color={colors.charcoal} />
        </View>
      </View>

      {hasSentGrade ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gradeChart}>
            {buckets.map((bucket) => {
              const rank = bucket.highestSentRank;
              const dotPercent = rank == null ? 0 : Math.max(10, ((rank + 1) / (maxRank + 1)) * 100);

              return (
                <View
                  accessible
                  accessibilityLabel={`${bucket.label}: highest sent ${bucket.highestSentGrade ?? 'none'}`}
                  key={bucket.key}
                  style={styles.gradeColumn}
                >
                  <View style={styles.gradeTrack}>
                    {rank != null ? <View style={[styles.gradeDot, { bottom: `${dotPercent}%` }]} /> : null}
                  </View>
                  <Text numberOfLines={1} style={styles.gradeValue}>{bucket.highestSentGrade ?? '-'}</Text>
                  <Text numberOfLines={1} style={styles.gradeLabel}>{bucket.shortLabel}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Sent grades will appear after completed climbs.</Text>
        </View>
      )}

      <View style={styles.inlineStats}>
        <InlineStat label="Highest sent" value={highestSentGrade ?? 'None'} />
        <InlineStat label="Highest tried" value={highestAttemptedGrade ?? 'None'} />
        <InlineStat label="Most climbed" value={mostClimbedGrade ?? 'None'} />
      </View>
    </AppCard>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineStat}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.inlineStatValue}>{value}</Text>
      <Text style={styles.inlineStatLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({
  accent,
  detail,
  icon,
  label,
  value,
}: {
  accent: string;
  detail: string;
  icon: FeatherName;
  label: string;
  value: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}. ${detail}`} style={styles.metricRow}>
      <View style={[styles.metricIcon, { backgroundColor: accent }]}>
        <Feather name={icon} size={16} color={colors.charcoal} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricDetail}>{detail}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SessionQualityCard({ metrics }: { metrics: StatisticsQualityMetric[] }) {
  return (
    <AppCard style={styles.metricCard}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>Session quality</Text>
        <View style={[styles.cardIcon, { backgroundColor: colors.mint }]}>
          <Feather name="check-circle" size={17} color={colors.charcoal} />
        </View>
      </View>
      <View style={styles.metricList}>
        {metrics.map((metric) => (
          <MetricRow
            accent={metric.key === 'completion_rate' ? colors.mint : metric.key === 'avg_attempts' ? colors.lavender : colors.amber}
            detail={metric.detail}
            icon={qualityIcons[metric.key]}
            key={metric.key}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </View>
    </AppCard>
  );
}

function RecoveryRhythmCard({ metrics }: { metrics: StatisticsRecoveryMetric[] }) {
  return (
    <AppCard style={styles.metricCard}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>Recovery rhythm</Text>
        <View style={[styles.cardIcon, { backgroundColor: colors.sky }]}>
          <Feather name="clock" size={17} color={colors.charcoal} />
        </View>
      </View>
      <View style={styles.metricList}>
        {metrics.map((metric) => (
          <MetricRow
            accent={recoveryAccents[metric.key]}
            detail={metric.detail}
            icon={recoveryIcons[metric.key]}
            key={metric.key}
            label={metric.label}
            value={formatOptionalDuration(metric.seconds)}
          />
        ))}
      </View>
    </AppCard>
  );
}

function GradeMixRow({ item, maxAttempted }: { item: StatisticsGradeMixItem; maxAttempted: number }) {
  const sentWidth = (item.sent / maxAttempted) * 100;
  const triedWidth = (item.tried / maxAttempted) * 100;

  return (
    <View
      accessible
      accessibilityLabel={`${item.grade}: ${item.sent} sent, ${item.tried} tried, ${item.attempted} total`}
      style={styles.gradeMixRow}
    >
      <View style={styles.gradePill}>
        <Text style={styles.gradePillText}>{item.grade}</Text>
      </View>
      <View style={styles.gradeMixTrack}>
        <View style={[styles.gradeMixSent, { width: `${sentWidth}%` }]} />
        <View style={[styles.gradeMixTried, { width: `${triedWidth}%` }]} />
      </View>
      <Text style={styles.gradeMixValue}>{item.sent} / {item.attempted}</Text>
    </View>
  );
}

function GradeMixCard({ items }: { items: StatisticsGradeMixItem[] }) {
  const maxAttempted = Math.max(1, ...items.map((item) => item.attempted));

  return (
    <AppCard style={styles.metricCard}>
      <View style={styles.cardTitleRow}>
        <View>
          <Text style={styles.cardTitle}>Grade mix</Text>
          <Text style={styles.cardSubtitle}>Sent / total climbs</Text>
        </View>
        <View style={[styles.cardIcon, { backgroundColor: colors.lavender }]}>
          <Feather name="layers" size={17} color={colors.charcoal} />
        </View>
      </View>
      {items.length === 0 ? (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Logged grades will appear here.</Text>
        </View>
      ) : (
        <View style={styles.gradeMixList}>
          {items.map((item) => (
            <GradeMixRow item={item} key={item.grade} maxAttempted={maxAttempted} />
          ))}
        </View>
      )}
    </AppCard>
  );
}

export function StatisticsScreen() {
  const router = useRouter();
  const { returnToProfile } = useProfileReturnTransition();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const [period, setPeriod] = useState<StatisticsPeriod>('3_months');
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const dashboard = useMemo(() => buildStatisticsDashboard(summaries, period), [period, summaries]);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadStatistics() {
      const profile = await loadProfile();
      const nextSummaries = await sessionSummaryService.listCompletedSessionSummaries({
        userIds: [profile.userId],
      });

      if (isMounted) {
        setSummaries(nextSummaries);
        setIsLoading(false);
      }
    }

    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      void loadStatistics();
      return () => {
        isMounted = false;
      };
    }

    const interactionTask = runAfterInteractionsWithFallback(() => {
      void loadStatistics();
    });

    return () => {
      isMounted = false;
      interactionTask.cancel();
    };
  }, [loadProfile]));

  function openClimb() {
    router.push('/climb');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to profile"
          accessibilityRole="button"
          onPress={returnToProfile}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>Your climbing progress</Text>
        </View>
      </View>

      <SegmentedControl onChange={setPeriod} segments={periodSegments} value={period} />

      {isLoading ? (
        <AppCard style={styles.loadingCard}>
          <LoadingSpinner size="large" />
        </AppCard>
      ) : dashboard.state === 'empty' ? (
        <EmptyStatisticsState onOpenClimb={openClimb} />
      ) : dashboard.state === 'empty_period' ? (
        <PeriodEmptyState periodLabel={dashboard.periodLabel} />
      ) : (
        <>
          <View style={styles.snapshotGrid}>
            <SnapshotMetric
              accent={colors.coral}
              deltaDirection={dashboard.snapshot.bestSent.delta.direction}
              deltaLabel={dashboard.snapshot.bestSent.delta.label}
              icon="star"
              label="Best sent"
              value={dashboard.snapshot.bestSent.label}
            />
            <SnapshotMetric
              accent={colors.mint}
              deltaDirection={dashboard.snapshot.sessions.delta.direction}
              deltaLabel={dashboard.snapshot.sessions.delta.label}
              icon="calendar"
              label="Sessions"
              value={String(dashboard.snapshot.sessions.value)}
            />
            <SnapshotMetric
              accent={colors.amber}
              deltaDirection={dashboard.snapshot.climbs.delta.direction}
              deltaLabel={dashboard.snapshot.climbs.delta.label}
              icon="triangle"
              label="Climbs"
              value={String(dashboard.snapshot.climbs.value)}
            />
          </View>

          {dashboard.state === 'one_session' ? <OneSessionState /> : null}

          <VolumeTrendCard
            buckets={dashboard.volumeTrend.buckets}
            maxClimbs={dashboard.volumeTrend.maxClimbs}
            periodLabel={dashboard.periodLabel}
          />
          <GradeProgressCard
            buckets={dashboard.gradeProgress.buckets}
            highestAttemptedGrade={dashboard.gradeProgress.highestAttemptedGrade}
            highestSentGrade={dashboard.gradeProgress.highestSentGrade}
            maxRank={dashboard.gradeProgress.maxRank}
            mostClimbedGrade={dashboard.gradeProgress.mostClimbedGrade}
          />
          <SessionQualityCard metrics={dashboard.quality} />
          <RecoveryRhythmCard metrics={dashboard.recovery} />
          <GradeMixCard items={dashboard.gradeMix} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  barChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 180,
    paddingTop: spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 54,
  },
  barFill: {
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    minHeight: 3,
    width: '100%',
  },
  barLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 58,
    textAlign: 'center',
  },
  barTrack: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    height: 116,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 22,
  },
  barValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '900',
  },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardSubtitle: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
  },
  cardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  chartCard: {
    padding: spacing.lg,
  },
  chartEmpty: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  chartEmptyText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  deltaText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 58,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  gradeChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 184,
    paddingTop: spacing.sm,
  },
  gradeColumn: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 58,
  },
  gradeDot: {
    backgroundColor: colors.coral,
    borderColor: colors.charcoal,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 15,
    marginBottom: -7,
    position: 'absolute',
    width: 15,
  },
  gradeLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 60,
    textAlign: 'center',
  },
  gradeMixList: {
    gap: spacing.md,
  },
  gradeMixRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 34,
  },
  gradeMixSent: {
    backgroundColor: colors.mint,
    borderBottomLeftRadius: radius.pill,
    borderTopLeftRadius: radius.pill,
    height: '100%',
  },
  gradeMixTrack: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    height: 12,
    overflow: 'hidden',
  },
  gradeMixTried: {
    backgroundColor: 'rgba(255,150,102,0.36)',
    height: '100%',
  },
  gradeMixValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'right',
  },
  gradePill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  gradePillText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  gradeTrack: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    height: 118,
    justifyContent: 'flex-end',
    position: 'relative',
    width: 4,
  },
  gradeValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: 60,
    textAlign: 'center',
  },
  inlineStat: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
  },
  inlineStatLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 2,
  },
  inlineStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  inlineStatValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
  },
  loadingCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  metricCard: {
    padding: spacing.lg,
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
  },
  metricDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 1,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricLabel: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
  },
  metricList: {
    gap: spacing.sm,
  },
  metricRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metricValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
    maxWidth: 88,
    textAlign: 'right',
  },
  noticeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  noticeText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 1,
  },
  noticeTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '900',
  },
  snapshotCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
  },
  snapshotGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  snapshotIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 32,
  },
  snapshotLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  snapshotValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 2,
  },
  title: {
    ...typography.compactTitle,
    color: colors.charcoal,
  },
  titleBlock: {
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
