import { Feather } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../design/tokens';
import { AppToast, useToastStore } from '../features/toasts';

const toastDurationMs = 6000;

export function ToastHost() {
  const dismissToast = useToastStore((state) => state.dismissToast);
  const pathname = usePathname();
  const restoreToast = useToastStore((state) => state.restoreToast);
  const toast = useToastStore((state) => state.toast);
  const [renderedToast, setRenderedToast] = useState<AppToast | null>(toast);
  const progress = useRef(new Animated.Value(toast ? 1 : 0)).current;

  useEffect(() => {
    if (!toast) {
      restoreToast();
    }
  }, [pathname, restoreToast, toast]);

  useEffect(() => {
    if (!toast) {
      Animated.timing(progress, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setRenderedToast(null);
        }
      });
      return undefined;
    }

    setRenderedToast(toast);
    progress.setValue(0);
    Animated.timing(progress, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();

    return undefined;
  }, [progress, toast]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const toastId = toast.id;
    const timer = setTimeout(() => dismissToast(toastId), toastDurationMs);

    return () => clearTimeout(timer);
  }, [dismissToast, pathname, toast]);

  if (!renderedToast) {
    return null;
  }

  const isError = renderedToast.type === 'error';
  const tone = isError ? '#B85A3B' : colors.success;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0],
  });

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View style={[styles.animatedToast, { opacity: progress, transform: [{ translateY }] }]}>
        <Pressable
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
          onPress={() => dismissToast(renderedToast.id)}
          style={styles.toast}
        >
          <View style={[styles.accent, { backgroundColor: tone }]} />
          <View style={[styles.iconCircle, { backgroundColor: isError ? 'rgba(184,90,59,0.12)' : 'rgba(168,221,191,0.28)' }]}>
            <Feather name={isError ? 'alert-circle' : 'check-circle'} size={18} color={tone} />
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>
              {renderedToast.title}
            </Text>
            {renderedToast.message ? (
              <Text numberOfLines={2} style={styles.message}>
                {renderedToast.message}
              </Text>
            ) : null}
          </View>
          <Feather name="x" size={16} color={tone} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  animatedToast: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  accent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  host: {
    left: spacing.xxl,
    position: 'absolute',
    right: spacing.xxl,
    top: spacing.md,
    zIndex: 1000,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  message: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 1,
  },
  title: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  toast: {
    ...shadow,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
