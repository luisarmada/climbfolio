import { Feather } from '@expo/vector-icons';
import { ReactNode, memo } from 'react';
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
  detailDescription?: string | null;
  detailTitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  leadingVisual?: ReactNode;
  onActionPress?: () => void;
  onPress?: () => void;
  stats: HighlightStat[];
  subtitle: string;
  title: string;
};

function ActivityHighlightCardComponent({
  actionAccessibilityLabel,
  actionIcon,
  detailDescription,
  detailTitle,
  icon,
  leadingVisual,
  onActionPress,
  onPress,
  stats,
  subtitle,
  title,
}: ActivityHighlightCardProps) {
  const hasDetails = Boolean(detailTitle || detailDescription);
  const cardContent = (
    <>
      <View style={[styles.topRow, onActionPress && actionIcon && styles.topRowWithAction]}>
        <View style={styles.topCopyRow}>
          {leadingVisual ? <View style={styles.leadingVisual}>{leadingVisual}</View> : null}
          {icon ? (
            <View style={styles.iconCircle}>
              <Feather name={icon} size={19} color={colors.charcoal} />
            </View>
          ) : null}
          <View style={styles.copy}>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>{title}</Text>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>

      {hasDetails ? (
        <View style={styles.detailBlock}>
          {detailTitle ? <Text ellipsizeMode="tail" numberOfLines={1} style={styles.detailTitle}>{detailTitle}</Text> : null}
          {detailDescription ? <Text ellipsizeMode="tail" numberOfLines={1} style={styles.detailDescription}>{detailDescription}</Text> : null}
        </View>
      ) : null}

      <View style={[styles.statsRow, hasDetails && styles.statsRowAfterDetails]}>
        {stats.map((stat) => (
          <View key={`${stat.label}-${stat.value}`} style={styles.stat}>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <AppCard style={styles.card}>
      <View style={styles.cardSurface}>
        {onPress ? (
          <TouchableOpacity
            activeOpacity={0.78}
            accessibilityLabel={`Open ${title}`}
            accessibilityRole="button"
            onPress={onPress}
            style={styles.mainPressArea}
          >
            {cardContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.mainPressArea}>
            {cardContent}
          </View>
        )}

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

export const ActivityHighlightCard = memo(ActivityHighlightCardComponent);

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 38,
  },
  card: {
    position: 'relative',
  },
  cardSurface: {
    minHeight: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailBlock: {
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    gap: 3,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  detailDescription: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '600',
  },
  detailTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '900',
  },
  leadingVisual: {
    height: 38,
    width: 38,
  },
  mainPressArea: {
    padding: spacing.lg,
    minWidth: 0,
  },
  stat: {
    flex: 1,
    minWidth: 0,
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
  statsRowAfterDetails: {
    borderTopWidth: 0,
    marginTop: spacing.md,
    paddingTop: 0,
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
    minWidth: 0,
  },
  topRowWithAction: {
    paddingRight: 44,
  },
  topCopyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },
});
