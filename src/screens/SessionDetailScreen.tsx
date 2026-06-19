import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { colors, radius, spacing, typography } from '../design/tokens';

export function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Session Detail</Text>
      <Text style={styles.subtitle}>Route ready for session: {sessionId ?? 'preview'}</Text>

      <AppCard style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Saved Session</Text>
        <Text style={styles.copy}>Climbs will appear here once repositories return completed session records.</Text>
      </AppCard>

      <AppCard style={styles.emptyClimbs}>
        <View style={styles.emptyIcon}>
          <Feather name="list" size={24} color={colors.charcoal} />
        </View>
        <Text style={styles.emptyTitle}>No climbs yet</Text>
        <Text style={styles.copy}>The climb list will show grade, colour, attempts, completion, and time spent.</Text>
      </AppCard>

      <AppButton icon="bar-chart-2" onPress={() => router.push('/activity')} title="Back to Activity" variant="secondary" />
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
  summaryCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyClimbs: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.xxl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 54,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
});
