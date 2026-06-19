import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { colors, spacing, typography } from '../design/tokens';

const summaryStats = [
  { label: 'Duration', value: '0m' },
  { label: 'Climbs', value: '0' },
  { label: 'Attempts', value: '0' },
  { label: 'Completed', value: '0 / 0' },
];

export function SessionSummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Session Summary</Text>
      <Text style={styles.subtitle}>
        {sessionId ? `Saved session ${sessionId}` : 'This placeholder will use saved session data after the summary milestone.'}
      </Text>

      <View style={styles.grid}>
        {summaryStats.map((stat) => (
          <AppCard key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </AppCard>
        ))}
      </View>

      <AppCard style={styles.detailCard}>
        <Text style={styles.detailTitle}>Session saved</Text>
        <Text style={styles.detailCopy}>
          Duration is now persisted when you end a session. Climb totals, rest, highest grade, and common hold types arrive in the next milestones.
        </Text>
      </AppCard>

      <View style={styles.actions}>
        <AppButton icon="file-text" onPress={() => router.push('/session/preview')} title="Open Session Detail" />
        <AppButton icon="home" onPress={() => router.push('/')} title="Back Home" variant="secondary" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
    fontSize: 39,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    padding: spacing.lg,
    width: '48%',
  },
  statValue: {
    color: colors.charcoal,
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  detailCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  detailTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  detailCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
