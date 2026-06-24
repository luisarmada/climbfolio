import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { StatCard } from '../components/StatCard';
import { colors, spacing, typography } from '../design/tokens';
import { getSessionDisplayName } from '../features/sessions';
import {
  formatDuration,
  formatOneDecimal,
  formatOptionalDuration,
  formatSessionDate,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

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

export function SessionSummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      const nextSummary = await sessionSummaryService.getSessionSummary(sessionId);

      if (isMounted) {
        setSummary(nextSummary);
        setIsLoading(false);
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

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

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{sessionTitle}</Text>
      <Text style={styles.subtitle}>{formatSessionDate(summary.session.startTime)}</Text>

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

      <View style={styles.actions}>
        <AppButton
          icon="file-text"
          onPress={() => router.push(`/session/${summary.session.id}`)}
          title="Open Session Detail"
        />
        <AppButton icon="home" onPress={() => router.push('/')} title="Back Home" variant="secondary" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  detailCard: {
    marginTop: spacing.xl,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
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
    ...typography.title,
    color: colors.charcoal,
    fontSize: 39,
  },
});
