import { ComponentProps, useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { SectionHeader } from '../components/SectionHeader';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { resolveSelectedGradingScale } from '../domain/gradeScales';
import { useClimbingPreferencesStore } from '../features/preferences';
import { formatProfileBadge, useProfileStore } from '../features/profile';
import { getSessionDisplayName } from '../features/sessions';
import {
  calculateWeeklyStreak,
  formatDuration,
  formatSessionDate,
  formatSessionTime,
  SessionSummary,
  sessionSummaryService,
  summarizeAggregate,
} from '../features/summaries';

type FeatherName = ComponentProps<typeof Feather>['name'];
type DashboardAction = {
  accent: string;
  href?: '/calendar';
  icon: FeatherName;
  label: string;
};

const dashboardActions: DashboardAction[] = [
  { accent: colors.mint, icon: 'bar-chart-2', label: 'Statistics' },
  { accent: colors.amber, icon: 'grid', label: 'Collection' },
  { accent: colors.sky, icon: 'activity', label: 'Measures' },
  { accent: colors.lavender, href: '/calendar', icon: 'calendar', label: 'Calendar' },
];

function formatSessionHistorySubtitle(summary: SessionSummary) {
  const date = formatSessionDate(summary.session.startTime);
  const time = formatSessionTime(summary.session.startTime);
  const dateTime = `${date}, ${time}`;

  if (summary.session.locationName) {
    return `${dateTime} @ ${summary.session.locationName}`;
  }

  return dateTime;
}

export function ProfileScreen() {
  const router = useRouter();
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const profile = useProfileStore((state) => state.profile);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      const [nextSummaries] = await Promise.all([
        sessionSummaryService.listCompletedSessionSummaries(),
        loadProfile(),
        loadClimbingPreferences(),
      ]);

      if (isMounted) {
        setSummaries(nextSummaries);
        setIsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [loadClimbingPreferences, loadProfile]);

  const aggregateStats = summarizeAggregate(summaries);
  const weeklyStreak = calculateWeeklyStreak(summaries);
  const selectedScale = resolveSelectedGradingScale(climbingPreferences ?? { customScales: [], selectedGradingScaleId: 'v_scale' });
  const displayName = profile?.displayName ?? 'Local Climber';
  const climberType = profile?.climberType ?? 'Indoor boulderer';
  const badgeText = formatProfileBadge(summaries, selectedScale);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Profile</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel="Open profile settings"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={styles.iconButton}
        >
          <Feather name="settings" size={23} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <ProfileAccountCard
        badgeText={badgeText}
        climberType={climberType}
        displayName={displayName}
        onEditPress={() => router.push('/settings/profile')}
        stats={[
          { label: 'Sessions', value: String(aggregateStats.sessions) },
          { label: 'Followers', value: '0' },
          { label: 'Following', value: '0' },
        ]}
        streakCount={weeklyStreak}
      />

      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
      </View>

      <View style={styles.dashboardGrid}>
        {dashboardActions.map((action) => (
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel={action.href ? `Open ${action.label}` : `${action.label} dashboard placeholder`}
            accessibilityRole="button"
            key={action.label}
            onPress={action.href ? () => router.push('/calendar') : undefined}
            style={styles.dashboardButton}
          >
            <View style={[styles.dashboardIcon, { backgroundColor: action.accent }]}>
              <Feather name={action.icon} size={21} color={colors.charcoal} />
            </View>
            <Text style={styles.dashboardButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Session History" />

      {isLoading ? (
        <AppCard style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading sessions...</Text>
        </AppCard>
      ) : summaries.length === 0 ? (
        <AppCard style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={26} color={colors.charcoal} />
          </View>
          <Text style={styles.emptyTitle}>No sessions logged</Text>
          <Text style={styles.emptyCopy}>Completed sessions will appear here after you end a climbing session.</Text>
        </AppCard>
      ) : (
        <View style={styles.sessionList}>
          {summaries.map((summary) => (
            <ActivityHighlightCard
              key={summary.session.id}
              onPress={() => router.push(`/session/${summary.session.id}`)}
              stats={[
                { label: 'Time', value: formatDuration(summary.session.durationSeconds) },
                { label: 'Climbs', value: String(summary.totalClimbs) },
                { label: 'Best', value: summary.highestGradeCompleted ?? 'None' },
              ]}
              subtitle={formatSessionHistorySubtitle(summary)}
              title={getSessionDisplayName(summary.session)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  dashboardButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '48%',
  },
  dashboardButtonText: {
    color: colors.charcoal,
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dashboardHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  dashboardIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  dashboardTitle: {
    ...typography.h2,
    color: colors.charcoal,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 58,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sessionList: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
});
