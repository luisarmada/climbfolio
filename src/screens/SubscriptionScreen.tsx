import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';

type SubscriptionFeature = {
  accent: string;
  detail: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
};

const subscriptionFeatures: SubscriptionFeature[] = [
  {
    accent: colors.mint,
    detail: 'Trends for grades, attempts, rest, and session load over time.',
    icon: 'bar-chart-2',
    title: 'Advanced statistics',
  },
  {
    accent: colors.sky,
    detail: 'Deeper collection views by grade, feature, location, and goals.',
    icon: 'grid',
    title: 'Collection insights',
  },
  {
    accent: colors.lavender,
    detail: 'A richer beta library for videos, notes, and climb references.',
    icon: 'video',
    title: 'Beta library',
  },
  {
    accent: colors.coral,
    detail: 'Backup-ready profile and history surfaces for future sync.',
    icon: 'shield',
    title: 'Cloud-ready backup',
  },
];

export function SubscriptionScreen() {
  const { goBackWithTransition } = useProfileReturnTransition();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to settings"
          accessibilityRole="button"
          onPress={() => goBackWithTransition('/settings')}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Subscription</Text>
        </View>
      </View>

      <AppCard style={styles.heroCard}>
        <View style={styles.planPill}>
          <Feather name="circle" size={10} color={colors.success} />
          <Text style={styles.planPillText}>Free plan</Text>
        </View>
        <Text style={styles.heroTitle}>Climbfolio Premium</Text>
        <Text style={styles.heroCopy}>Keep logging locally for free. Premium is designed for deeper review, richer collections, and backup-ready progress.</Text>
      </AppCard>

      <View style={styles.statusGrid}>
        <AppCard style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current plan</Text>
          <Text style={styles.statusValue}>Free</Text>
        </AppCard>
        <AppCard style={styles.statusCard}>
          <Text style={styles.statusLabel}>Subscription</Text>
          <Text style={styles.statusValue}>None</Text>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Features</Text>
        <View style={styles.featureList}>
          {subscriptionFeatures.map((feature) => (
            <AppCard key={feature.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: feature.accent }]}>
                <Feather name={feature.icon} size={20} color={colors.charcoal} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDetail}>{feature.detail}</Text>
              </View>
            </AppCard>
          ))}
        </View>
      </View>

      <AppCard style={styles.planCard}>
        <View style={styles.planHeaderRow}>
          <View>
            <Text style={styles.planName}>Premium</Text>
            <Text style={styles.planDetail}>Monthly and yearly options</Text>
          </View>
          <View style={styles.previewPill}>
            <Text style={styles.previewPillText}>Preview</Text>
          </View>
        </View>
        <Text style={styles.planCopy}>Pricing and purchases are not enabled in this build.</Text>
        <AppButton disabled icon="star" title="Upgrade to Premium" />
        <AppButton disabled icon="refresh-cw" style={styles.secondaryAction} title="Restore Purchase" variant="secondary" />
      </AppCard>
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
    paddingBottom: 204,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  featureCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 3,
  },
  featureIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  featureList: {
    gap: spacing.md,
  },
  featureTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
    padding: spacing.xl,
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.76)',
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
    marginTop: spacing.lg,
  },
  planCard: {
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  planCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  planDetail: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  planHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planName: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
  },
  planPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  planPillText: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewPill: {
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewPillText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryAction: {
    marginTop: -spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  statusCard: {
    flex: 1,
    padding: spacing.lg,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statusLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
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
    marginBottom: spacing.xl,
  },
});
