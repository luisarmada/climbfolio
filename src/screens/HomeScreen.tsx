import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { AggregateStats, sessionSummaryService } from '../features/summaries';

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

const friendHighlights = [
  {
    subtitle: 'Lena logged a strong board session',
    title: 'New high point',
    stats: [
      { label: 'Sent', value: 'V4' },
      { label: 'Climbs', value: '9' },
      { label: 'Attempts', value: '18' },
    ],
  },
  {
    subtitle: 'Sam wrapped a short lunch climb',
    title: 'Quick session',
    stats: [
      { label: 'Time', value: '32m' },
      { label: 'Sent', value: '6' },
      { label: 'Best', value: 'V3' },
    ],
  },
];

export function HomeScreen() {
  const [lifetimeStats, setLifetimeStats] = useState<AggregateStats>(emptyStats);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [weeklyStreak, setWeeklyStreak] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeStats() {
      const [nextStats, nextWeeklyStreak] = await Promise.all([
        sessionSummaryService.getAggregateStats(),
        sessionSummaryService.getWeeklyStreak(),
      ]);

      if (isMounted) {
        setLifetimeStats(nextStats);
        setWeeklyStreak(nextWeeklyStreak);
        setIsStatsLoading(false);
      }
    }

    void loadHomeStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Welcome back</Text>
      <Text style={styles.title}>Home</Text>

      <View style={styles.streakFlair}>
        <Feather name="zap" size={15} color={colors.charcoal} />
        <Text style={styles.streakText}>{isStatsLoading ? '...' : `${weeklyStreak} week streak`}</Text>
      </View>

      <SectionHeader title="Lifetime Statistics" />

      <View style={styles.grid}>
        <StatCard
          compact
          icon="triangle"
          accent="mint"
          value={isStatsLoading ? '...' : String(lifetimeStats.sessions)}
          label="Sessions"
          style={styles.stat}
        />
        <StatCard
          compact
          icon="link"
          accent="amber"
          value={isStatsLoading ? '...' : String(lifetimeStats.totalClimbs)}
          label="Climbs Logged"
          style={styles.stat}
        />
        <StatCard
          compact
          icon="bar-chart-2"
          accent="lavender"
          value={isStatsLoading ? '...' : String(lifetimeStats.totalAttempts)}
          label="Total Attempts"
          style={styles.stat}
        />
        <StatCard
          compact
          icon="star"
          accent="coral"
          value={isStatsLoading ? '...' : lifetimeStats.highestGradeCompleted ?? 'None'}
          label="Highest Completed"
          style={styles.stat}
        />
      </View>

      <SectionHeader title="Friend Activity" />
      <View style={styles.highlightList}>
        {friendHighlights.map((highlight) => (
          <ActivityHighlightCard
            icon="users"
            key={highlight.title}
            stats={highlight.stats}
            subtitle={highlight.subtitle}
            title={highlight.title}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  eyebrow: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  highlightList: {
    gap: spacing.md,
  },
  stat: {
    width: '47.8%',
  },
  streakFlair: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streakText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
});
