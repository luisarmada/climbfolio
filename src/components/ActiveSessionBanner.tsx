import { Feather } from '@expo/vector-icons';
import { memo, useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../design/tokens';
import { formatDuration } from '../features/summaries';
import { useActiveSessionStore } from '../features/sessions';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';

const sharedPulse = new Animated.Value(0);
let sharedPulseAnimation: ReturnType<typeof Animated.loop> | null = null;

function formatClimbLabel(grade: string, colour: string | null) {
  return colour ? `${grade} | ${colour}` : grade;
}

function formatAttemptLabel(attemptCount: number) {
  return `${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}`;
}

function ensurePulseAnimation() {
  if (sharedPulseAnimation) {
    return;
  }

  sharedPulseAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(sharedPulse, {
        duration: 900,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(sharedPulse, {
        duration: 900,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]),
  );

  sharedPulseAnimation.start();
}

type ActiveSessionBannerProps = {
  onLogClimb: () => void;
};

const BannerSessionDetail = memo(function BannerSessionDetail({
  statusLabel,
  startTime,
}: {
  statusLabel: string;
  startTime: string | null | undefined;
}) {
  const elapsedSeconds = useElapsedSeconds(startTime);

  return (
    <Text numberOfLines={1} style={styles.detail}>
      {formatDuration(elapsedSeconds)} | {statusLabel}
    </Text>
  );
});

export const ActiveSessionBanner = memo(function ActiveSessionBanner({ onLogClimb }: ActiveSessionBannerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const addAttempt = useActiveSessionStore((state) => state.addAttempt);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const isActiveSessionRoute = pathname.startsWith('/session/active');
  const canUseQuickAction = !isLoading;
  const statusLabel = activeClimb ? formatClimbLabel(activeClimb.grade, activeClimb.colour) : 'Resting';

  useEffect(() => {
    ensurePulseAnimation();
  }, []);

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
        <View style={styles.chevronIcon}>
          <Feather name="chevron-up" size={20} color={colors.charcoal} />
        </View>
        <View style={styles.copy}>
          <View style={styles.labelRow}>
            <Animated.View
              style={[
                styles.pulseDot,
                {
                  opacity: sharedPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1],
                  }),
                  transform: [
                    {
                      scale: sharedPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.86, 1.18],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.label}>Session in progress</Text>
          </View>
          <BannerSessionDetail startTime={activeSession.startTime} statusLabel={statusLabel} />
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
        accessibilityLabel={activeClimb ? 'Add attempt to current climb' : 'Log a climb'}
        accessibilityRole="button"
        disabled={!canUseQuickAction}
        onPress={() => {
          if (activeClimb) {
            void addAttempt();
            return;
          }

          onLogClimb();
        }}
        style={[styles.attemptButton, !canUseQuickAction && styles.disabledAttemptButton]}
      >
        <Feather name="plus" size={16} color={colors.charcoal} />
        <Text style={styles.attemptText}>{activeClimb ? 'Attempt' : 'Climb'}</Text>
      </TouchableOpacity>
    </View>
  );
});

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
  chevronIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mainAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },
  pulseDot: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
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
