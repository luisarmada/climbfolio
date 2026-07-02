import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useProfileStore } from '../features/profile';
import {
  CalendarStats,
  formatMonthLabel,
  getCalendarStats,
  getLocalDayKey,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

type CalendarDay = {
  date: Date;
  inMonth: boolean;
  key: string;
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function buildMonthDays(date: Date): CalendarDay[] {
  const monthStart = startOfMonth(date);
  const firstDay = monthStart.getDay();
  const leadingDays = firstDay === 0 ? 6 : firstDay - 1;
  const gridStart = new Date(monthStart);

  gridStart.setDate(monthStart.getDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);

    return {
      date: day,
      inMonth: day.getMonth() === date.getMonth(),
      key: getLocalDayKey(day),
    };
  });
}

function buildSessionMonths(sessionDayKeys: Set<string>) {
  return [...new Set([...sessionDayKeys].map((dayKey) => dayKey.slice(0, 7)))]
    .sort((left, right) => right.localeCompare(left))
    .map((key) => {
      const [year = '0', month = '1'] = key.split('-');

      return new Date(Number(year), Number(month) - 1, 1);
    });
}

function groupSummariesByDay(summaries: SessionSummary[]) {
  return summaries.reduce<Map<string, SessionSummary[]>>((groups, summary) => {
    const key = getLocalDayKey(new Date(summary.session.startTime));
    const daySummaries = groups.get(key) ?? [];

    groups.set(key, [...daySummaries, summary]);
    return groups;
  }, new Map());
}

export function CalendarScreen() {
  const router = useRouter();
  const { returnToProfile } = useProfileReturnTransition();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const [calendarStats, setCalendarStats] = useState<CalendarStats>({
    highestWeeklyStreak: 0,
    restDaysSinceLastSession: 0,
    sessionDayKeys: new Set(),
    weeklyStreak: 0,
  });
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionMonths = useMemo(() => buildSessionMonths(calendarStats.sessionDayKeys), [calendarStats.sessionDayKeys]);
  const summariesByDay = useMemo(() => groupSummariesByDay(summaries), [summaries]);
  const todayKey = getLocalDayKey(new Date());

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadCalendar() {
      const profile = await loadProfile();
      const summaries = await sessionSummaryService.listCompletedSessionSummaries({
        userIds: [profile.userId],
      });

      if (isMounted) {
        setSummaries(summaries);
        setCalendarStats(getCalendarStats(summaries));
        setIsLoading(false);
      }
    }

    void loadCalendar();

    return () => {
      isMounted = false;
    };
  }, [loadProfile]));

  function openCalendarDay(dayKey: string) {
    const daySummaries = summariesByDay.get(dayKey) ?? [];

    if (daySummaries.length === 1) {
      const [summary] = daySummaries;

      if (summary) {
        router.push({
          pathname: '/session/[sessionId]',
          params: {
            returnTo: 'calendar',
            sessionId: summary.session.id,
          },
        });
      }

      return;
    }

    if (daySummaries.length > 1) {
      router.push(`/calendar/day/${dayKey}`);
    }
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
          <Text style={styles.title}>Calendar</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{calendarStats.weeklyStreak}</Text>
          <Text style={styles.statLabel}>Week streak</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{calendarStats.highestWeeklyStreak}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{calendarStats.restDaysSinceLastSession}</Text>
          <Text style={styles.statLabel}>Rest days</Text>
        </AppCard>
      </View>

      <View style={styles.monthList}>
        {isLoading ? (
          <AppCard style={styles.calendarCard}>
            <Text style={styles.calendarHint}>Loading sessions...</Text>
          </AppCard>
        ) : null}

        {!isLoading && sessionMonths.length === 0 ? (
          <AppCard style={styles.calendarCard}>
            <Text style={styles.calendarHint}>Session days will appear here after you end a session.</Text>
          </AppCard>
        ) : null}

        {sessionMonths.map((month) => {
          const monthDays = buildMonthDays(month);
          const sectionKey = monthKey(month);

          return (
            <AppCard key={sectionKey} style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthTitle}>{formatMonthLabel(month)}</Text>
              </View>

              <View style={styles.weekHeader}>
                {weekDays.map((day) => (
                  <Text key={day} style={styles.weekDay}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.dayGrid}>
                {monthDays.map((day) => {
                  const hasSession = day.inMonth && calendarStats.sessionDayKeys.has(day.key);
                  const isToday = day.key === todayKey;

                  return (
                    <TouchableOpacity
                      activeOpacity={hasSession ? 0.76 : 1}
                      accessibilityLabel={`${day.date.getDate()}${hasSession ? ', session logged' : ''}`}
                      accessibilityRole={hasSession ? 'button' : undefined}
                      accessibilityState={{ disabled: !hasSession }}
                      disabled={!hasSession}
                      key={`${sectionKey}-${day.key}`}
                      onPress={() => openCalendarDay(day.key)}
                      style={[
                        styles.dayCell,
                        !day.inMonth && styles.outsideMonthDay,
                        isToday && styles.todayCell,
                        hasSession && styles.sessionDay,
                      ]}
                    >
                      <Text style={[styles.dayText, !day.inMonth && styles.outsideMonthText, hasSession && styles.sessionDayText]}>
                      {day.date.getDate()}
                    </Text>
                    {hasSession ? <View style={styles.sessionDot} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AppCard>
          );
        })}
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
  calendarCard: {
    padding: spacing.lg,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  calendarHint: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
    width: '13.2%',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  monthList: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  monthTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
  },
  outsideMonthDay: {
    backgroundColor: 'rgba(251,247,239,0.46)',
  },
  outsideMonthText: {
    color: colors.muted,
  },
  sessionDay: {
    backgroundColor: 'rgba(168,221,191,0.62)',
    borderColor: colors.success,
    borderWidth: 2,
  },
  sessionDayText: {
    color: colors.charcoal,
  },
  sessionDot: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.pill,
    bottom: 6,
    height: 4,
    position: 'absolute',
    width: 4,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  statValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 27,
    fontWeight: '900',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  titleBlock: {
    flex: 1,
  },
  todayCell: {
    borderColor: colors.amber,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  weekDay: {
    color: colors.muted,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
});
