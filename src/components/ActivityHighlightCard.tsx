import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { AppCard } from './AppCard';

type HighlightStat = {
  label: string;
  value: string;
};

type ActivityHighlightCardProps = {
  actionAccessibilityLabel?: string;
  actionIcon?: keyof typeof Feather.glyphMap;
  icon?: keyof typeof Feather.glyphMap;
  onActionPress?: () => void;
  onPress?: () => void;
  stats: HighlightStat[];
  subtitle: string;
  title: string;
};

export function ActivityHighlightCard({
  actionAccessibilityLabel,
  actionIcon,
  icon,
  onActionPress,
  onPress,
  stats,
  subtitle,
  title,
}: ActivityHighlightCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.contentRow}>
        <TouchableOpacity
          activeOpacity={onPress ? 0.78 : 1}
          accessibilityLabel={onPress ? `Open ${title}` : undefined}
          accessibilityRole={onPress ? 'button' : undefined}
          disabled={!onPress}
          onPress={onPress}
          style={styles.mainPressArea}
        >
          <View style={styles.topRow}>
            {icon ? (
              <View style={styles.iconCircle}>
                <Feather name={icon} size={19} color={colors.charcoal} />
              </View>
            ) : null}
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={`${stat.label}-${stat.value}`} style={styles.stat}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {onActionPress && actionIcon ? (
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel={actionAccessibilityLabel ?? `${title} action`}
            accessibilityRole="button"
            onPress={onActionPress}
            style={styles.actionButton}
          >
            <Feather name={actionIcon} size={18} color={colors.charcoal} />
          </TouchableOpacity>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  card: {
    padding: spacing.lg,
  },
  contentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
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
  mainPressArea: {
    flex: 1,
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
