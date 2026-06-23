import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { colors, radius, spacing, typography } from '../design/tokens';
import {
  formatDuration,
  formatOneDecimal,
  formatSessionDate,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

export function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
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
        <Text style={styles.title}>Session Detail</Text>
        <Text style={styles.subtitle}>Loading climbs...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Session Detail</Text>
        <Text style={styles.subtitle}>No saved session was found.</Text>
        <AppButton icon="user" onPress={() => router.push('/profile')} title="Back to Profile" variant="secondary" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Session Detail</Text>
      <Text style={styles.subtitle}>{formatSessionDate(summary.session.startTime)}</Text>

      <AppCard style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Saved Session</Text>
        <View style={styles.summaryGrid}>
          <View>
            <Text style={styles.summaryValue}>{formatDuration(summary.session.durationSeconds)}</Text>
            <Text style={styles.summaryLabel}>Duration</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{summary.totalClimbs}</Text>
            <Text style={styles.summaryLabel}>Climbs</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{summary.completionRate}%</Text>
            <Text style={styles.summaryLabel}>Sent</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{formatOneDecimal(summary.averageAttemptsPerClimb)}</Text>
            <Text style={styles.summaryLabel}>Avg tries</Text>
          </View>
        </View>
      </AppCard>

      {summary.climbs.length === 0 ? (
        <AppCard style={styles.emptyClimbs}>
          <View style={styles.emptyIcon}>
            <Feather name="list" size={24} color={colors.charcoal} />
          </View>
          <Text style={styles.emptyTitle}>No climbs saved</Text>
          <Text style={styles.copy}>This session ended without saved climbs.</Text>
        </AppCard>
      ) : (
        <View style={styles.climbList}>
          {summary.climbs.map((climb, index) => (
            <AppCard key={climb.id} style={styles.climbCard}>
              <View style={styles.climbTopRow}>
                <View>
                  <Text style={styles.climbTitle}>
                    {index + 1}. {climb.grade}
                  </Text>
                  <Text style={styles.climbMeta}>
                    {climb.colour ?? 'No colour'} - {climb.completed ? 'Sent it' : 'Gave up'}
                  </Text>
                </View>
                <View style={[styles.statusPill, climb.completed ? styles.sentPill : styles.gaveUpPill]}>
                  <Text style={styles.statusText}>{climb.completed ? 'Sent' : 'Tried'}</Text>
                </View>
              </View>
              <Text style={styles.climbDetail}>
                {climb.attemptCount} {climb.attemptCount === 1 ? 'attempt' : 'attempts'} - {formatDuration(climb.durationSeconds)}
              </Text>
              <Text style={styles.climbDetail}>
                {climb.holdTypes.length > 0 ? climb.holdTypes.join(', ') : 'No type selected'}
              </Text>
            </AppCard>
          ))}
        </View>
      )}

      <AppButton icon="user" onPress={() => router.push('/profile')} title="Back to Profile" variant="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  climbCard: {
    padding: spacing.lg,
  },
  climbDetail: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  climbList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  climbMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  climbTitle: {
    color: colors.charcoal,
    fontSize: 21,
    fontWeight: '800',
  },
  climbTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  content: {
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyClimbs: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.xxl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 54,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  gaveUpPill: {
    backgroundColor: 'rgba(255,150,102,0.2)',
  },
  sentPill: {
    backgroundColor: 'rgba(88,170,129,0.18)',
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  summaryValue: {
    color: colors.charcoal,
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
    fontSize: 39,
  },
});
