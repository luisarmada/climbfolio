import { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { CelebrationConfetti } from '../components/CelebrationConfetti';
import { SessionMonthCalendar } from '../components/SessionMonthCalendar';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing, typography } from '../design/tokens';
import { getSessionDisplayName } from '../features/sessions';
import {
  formatDuration,
  formatOneDecimal,
  formatOptionalDuration,
  formatSessionDate,
  formatSessionTime,
  getLocalDayKey,
  SessionSummary,
  sessionSummaryService,
  summarizeAggregate,
} from '../features/summaries';

type SummaryCelebrationContext = {
  lifetimeClimbCount: number;
  sessionDayKeys: Set<string>;
  sessionNumber: number;
};

function getSummaryStats(summary: SessionSummary) {
  return [
    { accent: 'mint' as const, icon: 'clock' as const, label: 'Duration', value: formatDuration(summary.session.durationSeconds) },
    { accent: 'amber' as const, icon: 'triangle' as const, label: 'Climbs', value: String(summary.totalClimbs) },
    { accent: 'lavender' as const, icon: 'bar-chart-2' as const, label: 'Attempts', value: String(summary.totalAttempts) },
    {
      accent: 'coral' as const,
      icon: 'check-circle' as const,
      label: 'Completed',
      value: `${summary.completedClimbs} / ${summary.totalClimbs}`,
    },
    {
      accent: 'sky' as const,
      icon: 'trending-up' as const,
      label: 'Highest Sent',
      value: summary.highestGradeCompleted ?? 'None',
    },
    {
      accent: 'mint' as const,
      icon: 'target' as const,
      label: 'Avg Attempts',
      value: formatOneDecimal(summary.averageAttemptsPerClimb),
    },
  ];
}

function formatOrdinal(value: number) {
  const tens = value % 100;

  if (tens >= 11 && tens <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function SessionSummaryScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const entryProgress = useRef(new Animated.Value(1)).current;
  const doneProgress = useRef(new Animated.Value(0)).current;
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [celebrationContext, setCelebrationContext] = useState<SummaryCelebrationContext>({
    lifetimeClimbCount: 0,
    sessionDayKeys: new Set(),
    sessionNumber: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionStatisticsOpen, setIsSessionStatisticsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      const [nextSummary, summaries] = await Promise.all([
        sessionSummaryService.getSessionSummary(sessionId),
        sessionSummaryService.listCompletedSessionSummaries(),
      ]);
      const aggregateStats = summarizeAggregate(summaries);
      const orderedSummaries = [...summaries].sort(
        (left, right) => new Date(left.session.startTime).getTime() - new Date(right.session.startTime).getTime(),
      );
      const sessionIndex = orderedSummaries.findIndex((item) => item.session.id === sessionId);

      if (isMounted) {
        setSummary(nextSummary);
        setCelebrationContext({
          lifetimeClimbCount: aggregateStats.totalClimbs,
          sessionDayKeys: new Set(summaries.map((item) => getLocalDayKey(new Date(item.session.startTime)))),
          sessionNumber: sessionIndex >= 0 ? sessionIndex + 1 : summaries.length,
        });
        setIsLoading(false);
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    entryProgress.setValue(1);
    Animated.timing(entryProgress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [entryProgress]);

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.title}>Session Summary</Text>
        <Text style={styles.subtitle}>Loading saved session...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Session Summary</Text>
        <Text style={styles.subtitle}>No saved session was found for this summary.</Text>
        <AppButton icon="home" onPress={() => router.push('/')} title="Back Home" variant="secondary" />
      </ScrollView>
    );
  }

  const stats = getSummaryStats(summary);
  const sessionTitle = getSessionDisplayName(summary.session);
  const doneTranslateY = doneProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });
  const entryTranslateX = entryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  function handleDonePress() {
    Animated.timing(doneProgress, {
      duration: 280,
      easing: Easing.in(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start(() => router.replace('/'));
  }

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX: entryTranslateX }, { translateY: doneTranslateY }] }]}>
      <CelebrationConfetti />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroText}>
          <Text style={styles.title}>Session saved</Text>
          <Text style={styles.celebrationTitle}>This is your {formatOrdinal(celebrationContext.sessionNumber)} session.</Text>
          <Text style={styles.celebrationCopy}>Your lifetime climb count is {celebrationContext.lifetimeClimbCount}.</Text>
        </View>

        <SessionMonthCalendar sessionDayKeys={celebrationContext.sessionDayKeys} />

        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityLabel="View statistics"
          accessibilityRole="button"
          accessibilityState={{ expanded: isSessionStatisticsOpen }}
          onPress={() => setIsSessionStatisticsOpen((value) => !value)}
          style={styles.statisticsButton}
        >
          <View style={styles.statisticsButtonIcon}>
            <Feather name="bar-chart-2" size={18} color={colors.charcoal} />
          </View>
          <Text style={styles.statisticsButtonText}>View Statistics</Text>
          <Feather name={isSessionStatisticsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
        </TouchableOpacity>

        {isSessionStatisticsOpen ? (
          <View style={styles.statisticsPanel}>
            <AppCard style={styles.sessionCard}>
              <Text style={styles.sessionTitle}>{sessionTitle}</Text>
              <Text style={styles.sessionSubtitle}>{formatSessionDate(summary.session.startTime)}, {formatSessionTime(summary.session.startTime)}</Text>
            </AppCard>

            <View style={styles.grid}>
              {stats.map((stat) => (
                <StatCard
                  accent={stat.accent}
                  compact
                  icon={stat.icon}
                  key={stat.label}
                  label={stat.label}
                  style={styles.statCard}
                  value={stat.value}
                />
              ))}
            </View>

            <AppCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>Session notes</Text>
              <View style={styles.detailRows}>
                {summary.session.description ? <Text style={styles.detailRow}>{summary.session.description}</Text> : null}
                <Text style={styles.detailRow}>Location: {summary.session.locationName ?? 'Not set'}</Text>
                {summary.session.locationType ? <Text style={styles.detailRow}>Location type: {summary.session.locationType}</Text> : null}
                <Text style={styles.detailRow}>Completion rate: {summary.completionRate}%</Text>
                <Text style={styles.detailRow}>Highest attempted: {summary.highestGradeAttempted ?? 'None'}</Text>
                <Text style={styles.detailRow}>Most common hold colour: {summary.mostCommonColour ?? 'None'}</Text>
                <Text style={styles.detailRow}>Most common feature: {summary.mostCommonHoldType ?? 'None'}</Text>
                <Text style={styles.detailRow}>
                  Average rest between attempts: {formatOptionalDuration(summary.averageRestBetweenAttemptsSeconds)}
                </Text>
                <Text style={styles.detailRow}>
                  Average rest between climbs: {formatOptionalDuration(summary.averageRestBetweenClimbsSeconds)}
                </Text>
              </View>
            </AppCard>

            <AppButton
              icon="file-text"
              onPress={() => router.push(`/session/${summary.session.id}`)}
              title="Open Session Detail"
              variant="secondary"
            />
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            icon="check-circle"
            onPress={handleDonePress}
            style={styles.doneButton}
            title="Done"
            variant="secondary"
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  celebrationCopy: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  celebrationTitle: {
    color: colors.charcoal,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    position: 'relative',
    zIndex: 2,
  },
  detailCard: {
    padding: spacing.lg,
  },
  detailRow: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  detailRows: {
    gap: spacing.sm,
  },
  detailTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  doneButton: {
    backgroundColor: colors.amber,
    borderColor: 'rgba(30,30,30,0.1)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  heroText: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
  },
  screen: {
    flex: 1,
  },
  sessionCard: {
    padding: spacing.lg,
  },
  sessionSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  sessionTitle: {
    ...typography.h2,
    color: colors.charcoal,
  },
  statisticsButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  statisticsButtonIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,209,102,0.58)',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statisticsButtonText: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  statisticsPanel: {
    gap: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.charcoal,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
    textAlign: 'center',
  },
});
