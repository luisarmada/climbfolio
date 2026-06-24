import { Feather } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../design/tokens';
import { formatDuration } from '../features/summaries';
import { useActiveSessionStore } from '../features/sessions';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';

function formatClimbLabel(grade: string, colour: string | null) {
  return colour ? `${grade} | ${colour}` : grade;
}

function formatAttemptLabel(attemptCount: number) {
  return `${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}`;
}

export function ActiveSessionBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const addAttempt = useActiveSessionStore((state) => state.addAttempt);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const elapsedSeconds = useElapsedSeconds(activeSession?.startTime);
  const isActiveSessionRoute = pathname.startsWith('/session/active');
  const canAddAttempt = Boolean(activeClimb) && !isLoading;

  if (!activeSession || isActiveSessionRoute) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityLabel="Open active session"
        accessibilityRole="button"
        onPress={() => router.push('/session/active')}
        style={styles.mainAction}
      >
        <View style={styles.iconCircle}>
          <Feather name="activity" size={18} color={colors.charcoal} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Session in progress</Text>
          <Text numberOfLines={1} style={styles.detail}>
            {formatDuration(elapsedSeconds)} | {activeClimb ? formatClimbLabel(activeClimb.grade, activeClimb.colour) : 'Resting'}
          </Text>
        </View>
      </TouchableOpacity>

      {activeClimb ? (
        <View style={styles.attemptCountBlock}>
          <Text numberOfLines={1} style={styles.attemptCountText}>
            {formatAttemptLabel(activeClimb.attemptCount)}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.78}
        accessibilityLabel="Add attempt to current climb"
        accessibilityRole="button"
        disabled={!canAddAttempt}
        onPress={() => void addAttempt()}
        style={[styles.attemptButton, !canAddAttempt && styles.disabledAttemptButton]}
      >
        <Feather name="plus" size={16} color={colors.charcoal} />
        <Text style={styles.attemptText}>Attempt</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  attemptButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.mint,
    borderColor: 'rgba(30,30,30,0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minWidth: 96,
    paddingHorizontal: spacing.md,
  },
  attemptCountBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 66,
  },
  attemptCountText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  attemptText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  detail: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  disabledAttemptButton: {
    backgroundColor: colors.surfaceSoft,
    opacity: 0.58,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mainAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },
  wrapper: {
    ...shadow,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.stoneDark,
    borderBottomWidth: 2,
    borderColor: colors.stone,
    borderRadius: radius.xxl,
    borderWidth: 1,
    bottom: 102,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    minHeight: 68,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 20,
  },
});
