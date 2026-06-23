import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { AppCard } from './AppCard';

type HighlightStat = {
  label: string;
  value: string;
};

type ActivityHighlightCardProps = {
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  stats: HighlightStat[];
  subtitle: string;
  title: string;
};

export function ActivityHighlightCard({ icon = 'zap', onPress, stats, subtitle, title }: ActivityHighlightCardProps) {
  const content = (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Feather name={icon} size={19} color={colors.charcoal} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {onPress ? <Feather name="chevron-right" size={21} color={colors.muted} /> : null}
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={`${stat.label}-${stat.value}`} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </AppCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.78} accessibilityLabel={`Open ${title}`} accessibilityRole="button" onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  statValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  title: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    fontWeight: '900',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
