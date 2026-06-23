import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { AggregateStats, formatDuration, formatMonthLabel, formatSessionDate, SessionSummary, sessionSummaryService } from '../features/summaries';

const emptyStats: AggregateStats = {
  averageAttemptsPerClimb: 0,
  averageClimbsPerSession: 0,
  averageSessionDurationSeconds: null,
  completedClimbs: 0,
  completionRate: 0,
  highestGradeAttempted: null,
  highestGradeCompleted: null,
  mostClimbedGrade: null,
  mostCommonColour: null,
  mostCommonHoldType: null,
  sessions: 0,
  totalAttempts: 0,
  totalClimbs: 0,
};

export function ProfileScreen() {
  const router = useRouter();
  const [monthlyStats, setMonthlyStats] = useState<AggregateStats>(emptyStats);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      const [nextSummaries, nextMonthlyStats] = await Promise.all([
        sessionSummaryService.listCompletedSessionSummaries(),
        sessionSummaryService.getMonthlyAggregateStats(),
      ]);

      if (isMounted) {
        setMonthlyStats(nextMonthlyStats);
        setSummaries(nextSummaries);
        setIsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your climbing identity</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel="Profile settings placeholder"
          accessibilityRole="button"
          style={styles.iconButton}
        >
          <Feather name="settings" size={23} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <AppCard style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <View style={styles.avatarBody} />
            <View style={styles.avatarHead} />
            <View style={[styles.avatarHold, styles.avatarHoldOne]} />
            <View style={[styles.avatarHold, styles.avatarHoldTwo]} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>Local Climber</Text>
            <Text style={styles.profileType}>Indoor boulderer</Text>
            <Text style={styles.bestBadge}>Best Grade Placeholder</Text>
          </View>
        </View>

        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>24</Text>
            <Text style={styles.profileStatLabel}>Climbing Sessions</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>128</Text>
            <Text style={styles.profileStatLabel}>Followers</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>86</Text>
            <Text style={styles.profileStatLabel}>Following</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.monthHeader}>
        <View style={styles.monthTitleRow}>
          <Text style={styles.monthTitle}>This Month</Text>
          <View style={styles.dateFilter}>
            <Feather name="calendar" size={15} color={colors.muted} />
            <Text style={styles.dateText}>{formatMonthLabel()}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} accessibilityRole="button">
          <Text style={styles.moreStatsText}>More stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthGrid}>
        <StatCard compact icon="triangle" accent="mint" value={isLoading ? '...' : String(monthlyStats.sessions)} label="Sessions" style={styles.monthStat} />
        <StatCard compact icon="link" accent="amber" value={isLoading ? '...' : String(monthlyStats.totalClimbs)} label="Climbs" style={styles.monthStat} />
        <StatCard compact icon="bar-chart-2" accent="lavender" value={isLoading ? '...' : String(monthlyStats.totalAttempts)} label="Attempts" style={styles.monthStat} />
        <StatCard
          compact
          icon="star"
          accent="coral"
          value={isLoading ? '...' : monthlyStats.highestGradeCompleted ?? 'None'}
          label="Best"
          style={styles.monthStat}
        />
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
              icon="clock"
              key={summary.session.id}
              onPress={() => router.push(`/session/${summary.session.id}`)}
              stats={[
                { label: 'Time', value: formatDuration(summary.session.durationSeconds) },
                { label: 'Climbs', value: String(summary.totalClimbs) },
                { label: 'Best', value: summary.highestGradeCompleted ?? 'None' },
              ]}
              subtitle={`${summary.completedClimbs}/${summary.totalClimbs} sent - ${summary.totalAttempts} attempts`}
              title={formatSessionDate(summary.session.startTime)}
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
  dateFilter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dateText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
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
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  monthStat: {
    width: '48%',
  },
  monthTitle: {
    ...typography.h2,
    color: colors.charcoal,
  },
  monthTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.sm,
  },
  moreStatsText: {
    color: '#6E55B5',
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  profileCard: {
    padding: spacing.lg,
  },
  profileCopy: {
    flex: 1,
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
