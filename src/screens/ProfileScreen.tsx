import { ComponentProps, useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { SectionHeader } from '../components/SectionHeader';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { ProfileBadgePreference } from '../domain/models';
import { useProfileStore } from '../features/profile';
import { getSessionDisplayName } from '../features/sessions';
import {
  calculateWeeklyStreak,
  formatDuration,
  formatSessionDate,
  SessionSummary,
  sessionSummaryService,
  summarizeAggregate,
} from '../features/summaries';

type FeatherName = ComponentProps<typeof Feather>['name'];
type DashboardAction = {
  accent: string;
  icon: FeatherName;
  label: string;
};

const dashboardActions: DashboardAction[] = [
  { accent: colors.mint, icon: 'bar-chart-2', label: 'Statistics' },
  { accent: colors.amber, icon: 'grid', label: 'Collection' },
  { accent: colors.sky, icon: 'activity', label: 'Measures' },
  { accent: colors.lavender, icon: 'calendar', label: 'Calendar' },
];

function formatProfileBadge(preference: ProfileBadgePreference, summaries: SessionSummary[]) {
  const aggregateStats = summarizeAggregate(summaries);
  const weeklyStreak = calculateWeeklyStreak(summaries);

  if (preference === 'sessions') {
    return `${aggregateStats.sessions} Sessions`;
  }

  if (preference === 'weekly_streak') {
    return `${weeklyStreak} Week Streak`;
  }

  if (preference === 'local_only') {
    return 'Local Only';
  }

  return `Best Grade ${aggregateStats.highestGradeCompleted ?? 'None Yet'}`;
}

export function ProfileScreen() {
  const router = useRouter();
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
  }, [loadProfile]);

  const aggregateStats = summarizeAggregate(summaries);
  const weeklyStreak = calculateWeeklyStreak(summaries);
  const displayName = profile?.displayName ?? 'Local Climber';
  const climberType = profile?.climberType ?? 'Indoor boulderer';
  const badgeText = formatProfileBadge(profile?.badgePreference ?? 'best_grade', summaries);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your climbing identity</Text>
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

      <AppCard style={styles.profileCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel="Edit profile details"
          accessibilityRole="button"
          onPress={() => router.push('/settings/profile')}
          style={styles.profileEditButton}
        >
          <Feather name="edit-2" size={21} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <View style={styles.avatarBody} />
            <View style={styles.avatarHead} />
            <View style={[styles.avatarHold, styles.avatarHoldOne]} />
            <View style={[styles.avatarHold, styles.avatarHoldTwo]} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileType}>{climberType}</Text>
            <Text style={styles.bestBadge}>{badgeText}</Text>
          </View>
        </View>

        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>{aggregateStats.sessions}</Text>
            <Text style={styles.profileStatLabel}>Sessions</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>{aggregateStats.totalClimbs}</Text>
            <Text style={styles.profileStatLabel}>Climbs</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>{weeklyStreak}</Text>
            <Text style={styles.profileStatLabel}>Week Streak</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
      </View>

      <View style={styles.dashboardGrid}>
        {dashboardActions.map((action) => (
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel={`${action.label} dashboard placeholder`}
            accessibilityRole="button"
            key={action.label}
            style={styles.dashboardButton}
          >
            <View style={[styles.dashboardIcon, { backgroundColor: action.accent }]}>
              <Feather name={action.icon} size={21} color={colors.charcoal} />
            </View>
            <Text style={styles.dashboardButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Per Session" />

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
              subtitle={`${formatSessionDate(summary.session.startTime)} - ${summary.completedClimbs}/${summary.totalClimbs} sent - ${summary.totalAttempts} attempts`}
              title={getSessionDisplayName(summary.session)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#E6DDD0',
    borderRadius: radius.pill,
    height: 96,
    overflow: 'hidden',
    position: 'relative',
    width: 96,
  },
  avatarBody: {
    backgroundColor: '#5DB194',
    borderRadius: 24,
    height: 66,
    left: 39,
    position: 'absolute',
    top: 26,
    transform: [{ rotate: '18deg' }],
    width: 36,
  },
  avatarHead: {
    backgroundColor: '#232323',
    borderRadius: radius.pill,
    height: 22,
    left: 42,
    position: 'absolute',
    top: 16,
    width: 22,
  },
  avatarHold: {
    backgroundColor: '#F07C43',
    borderRadius: radius.pill,
    height: 16,
    position: 'absolute',
    width: 22,
  },
  avatarHoldOne: {
    right: 18,
    top: 21,
    transform: [{ rotate: '-20deg' }],
  },
  avatarHoldTwo: {
    backgroundColor: colors.lavender,
    bottom: 35,
    right: 25,
    transform: [{ rotate: '20deg' }],
  },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,222,212,0.55)',
    borderRadius: radius.pill,
    color: '#494039',
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
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
  profileCard: {
    padding: spacing.lg,
    position: 'relative',
  },
  profileCopy: {
    flex: 1,
    paddingRight: spacing.xl,
  },
  profileEditButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 38,
    zIndex: 1,
  },
  profileName: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 32,
  },
  profileStat: {
    flex: 1,
  },
  profileStatLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 2,
  },
  profileStats: {
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  profileStatValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
  },
  profileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  profileType: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  sessionList: {
    gap: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
