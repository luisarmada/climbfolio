import { ReactNode, createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { Href, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { ActiveSessionBanner } from './ActiveSessionBanner';
import { BottomNav } from './BottomNav';
import { NewClimbPickerModal } from './NewClimbPickerModal';
import { colors } from '../design/tokens';
import { useActiveSessionStore } from '../features/sessions';
import { createRouteHref, rememberRouteForPath, TabKey } from '../navigation/tabState';

type AppShellProps = PropsWithChildren<{
  returnToProfileUnderlay?: ReactNode;
  showBottomNav?: boolean;
  transition?: 'slideLeft';
  underlay?: ReactNode;
}>;

type ProfileReturnTransitionContextValue = {
  goBackWithTransition: (fallbackHref?: Href) => void;
  returnToProfile: () => void;
};

type TabScrollToTopContextValue = {
  registerTabScrollToTop: (key: TabKey, handler: () => void) => () => void;
};

let hasRequestedActiveSessionRestore = false;
let shouldSkipNextEnterTransition = false;

function consumePendingEnterTransitionSkip() {
  if (!shouldSkipNextEnterTransition) {
    return false;
  }

  shouldSkipNextEnterTransition = false;
  return true;
}

const ProfileReturnTransitionContext = createContext<ProfileReturnTransitionContextValue>({
  goBackWithTransition: () => undefined,
  returnToProfile: () => undefined,
});
const TabScrollToTopContext = createContext<TabScrollToTopContextValue>({
  registerTabScrollToTop: () => () => undefined,
});

function shouldFadeTabScreen(pathname: string) {
  return pathname === '/' || pathname === '/climb' || pathname === '/profile';
}

export function useProfileReturnTransition() {
  return useContext(ProfileReturnTransitionContext);
}

export function useAppShellTransition() {
  return useContext(ProfileReturnTransitionContext);
}

export function useTabScrollToTop(key: TabKey, handler: () => void) {
  const { registerTabScrollToTop } = useContext(TabScrollToTopContext);

  useEffect(() => registerTabScrollToTop(key, handler), [handler, key, registerTabScrollToTop]);
}

export function AppShell({ children, returnToProfileUnderlay, showBottomNav = true, transition, underlay }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shouldSlideContent = transition === 'slideLeft';
  const shouldFadeContent = useRef(!shouldSlideContent && shouldFadeTabScreen(pathname)).current;
  const shouldSkipInitialTransitionRef = useRef(consumePendingEnterTransitionSkip());
  const hasHandledInitialFocusRef = useRef(false);
  const shouldSkipInitialTransition = shouldSkipInitialTransitionRef.current;
  const initialTransitionProgress = shouldSlideContent ? (shouldSkipInitialTransition ? 0 : 1) : shouldFadeContent && !shouldSkipInitialTransition ? 0 : 1;
  const transitionProgress = useRef(new Animated.Value(initialTransitionProgress)).current;
  const isLeavingSlideScreenRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isRevealingProfileUnderlay, setIsRevealingProfileUnderlay] = useState(false);
  const [isBannerClimbPickerVisible, setIsBannerClimbPickerVisible] = useState(false);
  const tabScrollHandlersRef = useRef<Partial<Record<TabKey, () => void>>>({});
  const edges: Edge[] = showBottomNav ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right'];
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasRequestedActiveSessionRestore) {
      return;
    }

    hasRequestedActiveSessionRestore = true;
    void restoreActiveSession();
  }, [restoreActiveSession]);

  useEffect(() => {
    if (!showBottomNav) {
      return;
    }

    rememberRouteForPath(pathname, createRouteHref(pathname, searchParams));
  }, [pathname, searchParams, showBottomNav]);

  useFocusEffect(
    useCallback(() => {
      const shouldSkipFocusTransition =
        (!isLeavingSlideScreenRef.current && consumePendingEnterTransitionSkip()) ||
        (!hasHandledInitialFocusRef.current && shouldSkipInitialTransitionRef.current);

      hasHandledInitialFocusRef.current = true;

      if (shouldSkipFocusTransition) {
        transitionProgress.setValue(shouldSlideContent ? 0 : 1);
        return undefined;
      }

      if (shouldSlideContent) {
        transitionProgress.setValue(1);
        Animated.timing(transitionProgress, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }).start();
        return undefined;
      }

      if (!shouldFadeContent) {
        transitionProgress.setValue(1);
        return undefined;
      }

      transitionProgress.setValue(0);
      Animated.timing(transitionProgress, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();

      return undefined;
    }, [shouldFadeContent, shouldSlideContent, transitionProgress]),
  );

  useEffect(() => {
    if (shouldSkipInitialTransition) {
      transitionProgress.setValue(shouldSlideContent ? 0 : 1);
      return;
    }
  }, [shouldSkipInitialTransition, shouldSlideContent, transitionProgress]);

  const leaveSlideScreen = useCallback(
    (navigate: () => void, options: { revealProfileUnderlay?: boolean } = {}) => {
      if (isLeavingSlideScreenRef.current) {
        return;
      }

      if (!shouldSlideContent) {
        navigate();
        return;
      }

      isLeavingSlideScreenRef.current = true;

      if (options.revealProfileUnderlay && returnToProfileUnderlay) {
        setIsRevealingProfileUnderlay(true);
      }

      requestAnimationFrame(() => {
        Animated.timing(transitionProgress, {
          duration: 260,
          easing: Easing.in(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }).start(() => {
          shouldSkipNextEnterTransition = true;
          navigate();
          setTimeout(() => {
            isLeavingSlideScreenRef.current = false;
            if (isMountedRef.current) {
              setIsRevealingProfileUnderlay(false);
            }
          }, 320);
        });
      });
    },
    [returnToProfileUnderlay, shouldSlideContent, transitionProgress],
  );

  const goBackWithTransition = useCallback(
    (fallbackHref: Href = '/profile') => {
      leaveSlideScreen(() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(fallbackHref);
      });
    },
    [leaveSlideScreen, router],
  );

  const returnToProfile = useCallback(() => {
    if (pathname === '/profile') {
      return;
    }

    leaveSlideScreen(() => {
      router.replace('/profile');
    }, {
      revealProfileUnderlay: true,
    });
  }, [leaveSlideScreen, pathname, router]);

  const registerTabScrollToTop = useCallback((key: TabKey, handler: () => void) => {
    tabScrollHandlersRef.current[key] = handler;

    return () => {
      if (tabScrollHandlersRef.current[key] === handler) {
        delete tabScrollHandlersRef.current[key];
      }
    };
  }, []);

  const handleActiveTabPress = useCallback((key: TabKey) => {
    tabScrollHandlersRef.current[key]?.();
  }, []);

  const translateX = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.container}>
        <ProfileReturnTransitionContext.Provider value={{ goBackWithTransition, returnToProfile }}>
          <TabScrollToTopContext.Provider value={{ registerTabScrollToTop }}>
            {isRevealingProfileUnderlay && returnToProfileUnderlay ? (
              <View pointerEvents="none" style={styles.underlay}>
                {returnToProfileUnderlay}
              </View>
            ) : underlay ? (
              <View pointerEvents="none" style={styles.underlay}>
                {underlay}
              </View>
            ) : null}
            <Animated.View
              style={[
                styles.content,
                shouldFadeContent && { opacity: transitionProgress },
                shouldSlideContent && { transform: [{ translateX }] },
              ]}
            >
              {children}
            </Animated.View>
          </TabScrollToTopContext.Provider>
        </ProfileReturnTransitionContext.Provider>
        {showBottomNav ? (
          <>
            <ActiveSessionBanner onLogClimb={() => setIsBannerClimbPickerVisible(true)} />
            <NewClimbPickerModal allowQuickAdd onDismiss={() => setIsBannerClimbPickerVisible(false)} visible={isBannerClimbPickerVisible} />
            <BottomNav onActiveTabPress={handleActiveTabPress} onProfilePress={returnToProfile} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
  container: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
  content: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
