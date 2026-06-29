import { ComponentProps, useCallback, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { SavedSessionEditorModal } from '../components/SavedSessionEditorModal';
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
  href?: '/calendar' | '/collection';
  icon: FeatherName;
  label: string;
};

const dashboardActions: DashboardAction[] = [
  { accent: colors.mint, icon: 'bar-chart-2', label: 'Statistics' },
  { accent: colors.amber, href: '/collection', icon: 'grid', label: 'Collection' },
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

let cachedProfileSummaries: SessionSummary[] | null = null;

export function ProfileScreen() {
  const router = useRouter();
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const profile = useProfileStore((state) => state.profile);
  const [summaries, setSummaries] = useState<SessionSummary[]>(cachedProfileSummaries ?? []);
  const [editingSummary, setEditingSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(cachedProfileSummaries === null);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadSessions() {
      if (cachedProfileSummaries === null) {
        setIsLoading(true);
      }

      const [nextSummaries] = await Promise.all([
        sessionSummaryService.listCompletedSessionSummaries(),
        loadProfile(),
        loadClimbingPreferences(),
      ]);

      if (isMounted) {
        cachedProfileSummaries = nextSummaries;
        setSummaries(nextSummaries);
        setIsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [loadClimbingPreferences, loadProfile]));

  const aggregateStats = summarizeAggregate(summaries);
  const weeklyStreak = calculateWeeklyStreak(summaries);
  const selectedScale = resolveSelectedGradingScale(climbingPreferences ?? { customScales: [], selectedGradingScaleId: 'v_scale' });
  const displayName = profile?.displayName ?? 'Local Climber';
  const climberType = profile?.climberType ?? 'Indoor boulderer';
  const badgeText = formatProfileBadge(summaries, selectedScale);
  const replaceSessionSummary = useCallback((nextSummary: SessionSummary) => {
    setSummaries((currentSummaries) => {
      const nextSummaries = currentSummaries.map((summary) => (summary.session.id === nextSummary.session.id ? nextSummary : summary));
      cachedProfileSummaries = nextSummaries;
      return nextSummaries;
    });
  }, []);
  const removeSessionSummary = useCallback((sessionId: string) => {
    setSummaries((currentSummaries) => {
      const nextSummaries = currentSummaries.filter((summary) => summary.session.id !== sessionId);
      cachedProfileSummaries = nextSummaries;
      return nextSummaries;
    });
  }, []);

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
        {dashboardActions.map((action) => {
          const href = action.href;

          return (
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityLabel={href ? `Open ${action.label}` : `${action.label} dashboard placeholder`}
              accessibilityRole="button"
              key={action.label}
              onPress={href ? () => router.push(href) : undefined}
              style={styles.dashboardButton}
            >
              <View style={[styles.dashboardIcon, { backgroundColor: action.accent }]}>
                <Feather name={action.icon} size={21} color={colors.charcoal} />
              </View>
              <Text style={styles.dashboardButtonText}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
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
              actionAccessibilityLabel={`Open actions for ${getSessionDisplayName(summary.session)}`}
              actionIcon="more-horizontal"
              key={summary.session.id}
              onActionPress={() => setEditingSummary(summary)}
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

      <SavedSessionEditorModal
        onDeleted={removeSessionSummary}
        onDismiss={() => setEditingSummary(null)}
        onSaved={replaceSessionSummary}
        summary={editingSummary}
        visible={Boolean(editingSummary)}
      />
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
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 86,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  dashboardButtonText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
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
