import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { ProgressRow } from '../components/ProgressRow';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing, typography } from '../design/tokens';

type ActivityView = 'general' | 'per-session';

export function ActivityScreen() {
  const [activityView, setActivityView] = useState<ActivityView>('general');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.subtitle}>Your climbing progress</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.iconButton} accessibilityRole="button">
          <Feather name="calendar" size={23} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <SegmentedControl
        onChange={setActivityView}
        segments={[
          { label: 'General', value: 'general' },
          { label: 'Per Session', value: 'per-session' },
        ]}
        value={activityView}
      />

      <SectionHeader
        title="This Month"
        right={<Feather name="chevron-down" size={18} color={colors.muted} />}
      />

      {activityView === 'general' ? (
        <>
          <View style={styles.grid}>
            <StatCard icon="triangle" accent="mint" value="12" label="Sessions" trend="20%" style={styles.stat} />
            <StatCard icon="link" accent="amber" value="68" label="Climbs" trend="15%" style={styles.stat} />
            <StatCard icon="bar-chart-2" accent="lavender" value="214" label="Attempts" trend="18%" style={styles.stat} />
            <StatCard icon="star" accent="coral" value="V5" label="Highest Completed" badge="NEW PB" style={styles.stat} />
          </View>

          <AppCard style={styles.overview}>
            <Text style={styles.overviewTitle}>Overview</Text>
            <ProgressRow icon="percent" accent="mint" label="Completion Rate" value="62%" percent={62} />
            <ProgressRow icon="trending-up" accent="amber" label="Average Attempts / Climb" value="3.1" percent={56} />
            <ProgressRow icon="clock" accent="lavender" label="Average Session" value="1h 24m" percent={48} />
            <ProgressRow icon="triangle" accent="coral" label="Most Climbed Grade" value="V3" percent={70} />
          </AppCard>
        </>
      ) : (
        <AppCard style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={26} color={colors.charcoal} />
          </View>
          <Text style={styles.emptyTitle}>No sessions logged</Text>
          <Text style={styles.emptyCopy}>Completed sessions will appear here once the local data layer is connected.</Text>
        </AppCard>
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
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.35,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    width: '48%',
  },
  overview: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  overviewTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
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
  emptyTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
