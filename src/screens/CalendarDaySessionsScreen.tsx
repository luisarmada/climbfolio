import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { SessionActivityList, useSessionActivityPagination } from '../components/SessionActivityList';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useProfileStore } from '../features/profile';
import {
  formatSessionDate,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

function parseLocalDayKey(dayKey: string) {
  const [year = '0', month = '1', day = '1'] = dayKey.split('-');

  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function CalendarDaySessionsScreen() {
  const router = useRouter();
  const { goBackWithTransition } = useProfileReturnTransition();
  const { date } = useLocalSearchParams<{ date: string }>();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const profile = useProfileStore((state) => state.profile);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dayKey = Array.isArray(date) ? date[0] : date;
  const titleDate = dayKey ? parseLocalDayKey(dayKey) : new Date();
  const displayName = profile?.displayName ?? 'Local Climber';
  const sessionPagination = useSessionActivityPagination(summaries.length);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!dayKey) {
        setIsLoading(false);
        return;
      }

      const nextProfile = await loadProfile();
      const nextSummaries = await sessionSummaryService.listCompletedSessionSummariesForDay(dayKey, {
        userIds: [nextProfile.userId],
      });
      const daySummaries = nextSummaries
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
  }, [dayKey, loadProfile]));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      onScroll={sessionPagination.handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
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

      <SessionActivityList
        displayName={displayName}
        onPress={(summary) =>
          router.push({
            pathname: '/session/[sessionId]',
            params: {
              date: dayKey,
              returnTo: 'calendarDay',
              sessionId: summary.session.id,
            },
          })
        }
        profilePictureId={profile?.profilePictureId}
        style={styles.sessionList}
        summaries={summaries}
        visibleCount={sessionPagination.visibleCount}
      />
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
