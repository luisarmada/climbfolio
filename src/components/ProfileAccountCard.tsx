import { Feather, Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { AppCard } from './AppCard';

export type ProfileAccountCardStat = {
  label: string;
  value: string;
};

type ProfileAccountCardProps = {
  badgeText: string;
  climberType: string;
  displayName: string;
  editAccessibilityLabel?: string;
  onEditPress?: () => void;
  stats?: ProfileAccountCardStat[];
  streakCount?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAccountCard({
  badgeText,
  climberType,
  displayName,
  editAccessibilityLabel = 'Edit profile details',
  onEditPress,
  stats,
  streakCount = 0,
  style,
}: ProfileAccountCardProps) {
  return (
    <AppCard style={[styles.card, style]}>
      {onEditPress ? (
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel={editAccessibilityLabel}
          accessibilityRole="button"
          onPress={onEditPress}
          style={styles.editButton}
        >
          <Feather name="edit-2" size={21} color={colors.charcoal} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <View style={styles.avatarBody} />
          <View style={styles.avatarHead} />
          <View style={[styles.avatarHold, styles.avatarHoldOne]} />
          <View style={[styles.avatarHold, styles.avatarHoldTwo]} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.type}>{climberType}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.bestBadge}>{badgeText}</Text>
            {streakCount > 0 ? (
              <View accessibilityLabel={`${streakCount} week streak`} style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>{streakCount}</Text>
                <Ionicons name="flame" size={15} color={colors.charcoal} />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </AppCard>
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
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  card: {
    padding: spacing.lg,
    position: 'relative',
  },
  copy: {
    flex: 1,
    paddingRight: spacing.xl,
  },
  editButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 38,
    zIndex: 1,
  },
  name: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 32,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 2,
  },
  stats: {
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
    fontSize: 22,
    fontWeight: '900',
  },
  streakBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  streakBadgeText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  type: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.md,
    marginTop: 4,
  },
});
