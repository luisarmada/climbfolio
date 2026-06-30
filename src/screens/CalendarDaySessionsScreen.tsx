import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { getSessionDisplayName } from '../features/sessions';
import {
  formatDuration,
  formatSessionDate,
  formatSessionTime,
  getLocalDayKey,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

function parseLocalDayKey(dayKey: string) {
  const [year = '0', month = '1', day = '1'] = dayKey.split('-');

  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatSessionCardSubtitle(summary: SessionSummary) {
  const date = formatSessionDate(summary.session.startTime);
  const time = formatSessionTime(summary.session.startTime);
  const dateTime = `${date}, ${time}`;

  if (summary.session.locationName) {
    return `${dateTime} @ ${summary.session.locationName}`;
  }

  return dateTime;
}

export function CalendarDaySessionsScreen() {
  const router = useRouter();
  const { goBackWithTransition } = useProfileReturnTransition();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dayKey = Array.isArray(date) ? date[0] : date;
  const titleDate = dayKey ? parseLocalDayKey(dayKey) : new Date();

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!dayKey) {
        setIsLoading(false);
        return;
      }

      const nextSummaries = await sessionSummaryService.listCompletedSessionSummaries();
      const daySummaries = nextSummaries
        .filter((summary) => getLocalDayKey(new Date(summary.session.startTime)) === dayKey)
        .sort((left, right) => new Date(left.session.startTime).getTime() - new Date(right.session.startTime).getTime());

      if (isMounted) {
        setSummaries(daySummaries);
        setIsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [dayKey]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to calendar"
          accessibilityRole="button"
          onPress={() => goBackWithTransition('/calendar')}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{formatSessionDate(titleDate.toISOString())}</Text>
        </View>
      </View>

      {isLoading ? (
        <AppCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading sessions...</Text>
        </AppCard>
      ) : null}

      {!isLoading && summaries.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No sessions found</Text>
          <Text style={styles.emptyCopy}>There are no saved sessions for this day.</Text>
        </AppCard>
      ) : null}

      <View style={styles.sessionList}>
        {summaries.map((summary) => (
          <ActivityHighlightCard
            key={summary.session.id}
            onPress={() =>
              router.push({
                pathname: '/session/[sessionId]',
                params: {
                  date: dayKey,
                  returnTo: 'calendarDay',
                  sessionId: summary.session.id,
                },
              })
            }
            stats={[
              { label: 'Time', value: formatDuration(summary.session.durationSeconds) },
              { label: 'Climbs', value: String(summary.totalClimbs) },
              { label: 'Best', value: summary.highestGradeCompleted ?? 'None' },
            ]}
            subtitle={formatSessionCardSubtitle(summary)}
            title={getSessionDisplayName(summary.session)}
          />
        ))}
      </View>
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
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.xxl,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionList: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  title: {
    ...typography.title,
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
