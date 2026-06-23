import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from './Card';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';

type Accent = 'mint' | 'amber' | 'lavender' | 'coral' | 'sky';

type StatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  accent: Accent;
  value: string;
  label: string;
  trend?: string;
  trendPrefix?: string;
  badge?: string;
  compact?: boolean;
  style?: ViewStyle;
};

export function StatCard({ icon, accent, value, label, trend, trendPrefix = '▲', badge, compact = false, style }: StatCardProps) {
  return (
    <Card style={[compact ? styles.compactCard : styles.card, style]}>
      <View style={[styles.iconBubble, compact && styles.compactIcon, { backgroundColor: colors[accent] }]}>
        <Feather name={icon} size={compact ? 18 : 26} color={colors.charcoal} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, compact && styles.compactValue]}>{value}</Text>
        <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
        {trend ? (
          <Text style={styles.trend}>
            <Text style={styles.trendStrong}>{trendPrefix} {trend}</Text>{'\n'}vs Apr
          </Text>
        ) : null}
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 142,
    padding: spacing.xl,
  },
  compactCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  compactIcon: {
    height: 38,
    width: 38,
  },
  content: {
    flex: 1,
  },
  value: {
    ...typography.stat,
    color: colors.charcoal,
    marginBottom: 2,
  },
  compactValue: {
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: 0,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  compactLabel: {
    fontSize: 12,
    lineHeight: 15,
  },
  trend: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.lg,
  },
  trendStrong: {
    color: colors.success,
    fontFamily: fonts.extraBold,
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,150,102,0.18)',
    borderRadius: radius.pill,
    color: '#F06F33',
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
});
