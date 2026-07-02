import { Feather } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import type { ProfileFlairDisplay } from '../features/profile';
import { AppCard } from './AppCard';
import { ProfileFlairPill } from './ProfileFlairPill';
import { ProfilePicture } from './ProfilePicture';

export type ProfileAccountCardStat = {
  label: string;
  value: string;
};

type ProfileAccountCardProps = {
  badgeText: string;
  displayName: string;
  editAccessibilityLabel?: string;
  onEditPress?: () => void;
  onProfilePicturePress?: () => void;
  profilePictureAccessibilityLabel?: string;
  profilePictureId?: string | null;
  flairs?: ProfileFlairDisplay[];
  showStreakFlair?: boolean;
  stats?: ProfileAccountCardStat[];
  streakCount?: number;
  style?: StyleProp<ViewStyle>;
  tagline: string;
};

export function ProfileAccountCard({
  badgeText,
  displayName,
  editAccessibilityLabel = 'Edit profile details',
  onEditPress,
  onProfilePicturePress,
  profilePictureAccessibilityLabel,
  profilePictureId,
  flairs,
  showStreakFlair = true,
  stats,
  streakCount = 0,
  style,
  tagline,
}: ProfileAccountCardProps) {
  const visibleFlairs = flairs ?? [
    {
      backgroundColor: 'rgba(229,222,212,0.55)',
      borderColor: 'rgba(216,208,198,0.9)',
      id: 'best_grade',
      label: badgeText,
      textColor: '#494039',
    },
  ];

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
        <ProfilePicture
          accessibilityLabel={profilePictureAccessibilityLabel}
          onPress={onProfilePicturePress}
          profilePictureId={profilePictureId}
          showEditBadge={Boolean(onProfilePicturePress)}
        />
        <View style={[styles.copy, onEditPress && styles.copyWithEdit]}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.name}>{displayName}</Text>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.type}>{tagline}</Text>
          <View style={styles.flairRow}>
            {visibleFlairs.map((flair) => (
              <ProfileFlairPill
                backgroundColor={flair.backgroundColor}
                borderColor={flair.borderColor}
                key={flair.id}
                label={flair.label}
                textColor={flair.textColor}
              />
            ))}
            {showStreakFlair && streakCount > 0 ? (
              <ProfileFlairPill
                backgroundColor={colors.amber}
                borderColor="rgba(30,30,30,0.12)"
                isStreak
                label={`${streakCount} week streak`}
                textColor={colors.charcoal}
              />
            ) : null}
          </View>
        </View>
      </View>

      {stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  flairRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    maxWidth: '100%',
    minWidth: 0,
  },
  card: {
    padding: spacing.lg,
    position: 'relative',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  copyWithEdit: {
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
    lineHeight: 36,
  },
  stat: {
    flex: 1,
    minWidth: 0,
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
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    minWidth: 0,
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
