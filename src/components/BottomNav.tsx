import { Feather } from '@expo/vector-icons';
import { Href, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing } from '../design/tokens';
import {
  clearRememberedScrollOffset,
  createRouteHref,
  createRouteKey,
  getRememberedRouteForTab,
  getTabForPathname,
  getTabRootPath,
  isTabRootPath,
  rememberRouteForPath,
  resetRememberedRouteForTab,
  TabKey,
} from '../navigation/tabState';

type NavItem = {
  key: TabKey;
  href: Href;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const items: NavItem[] = [
  { key: 'home', href: '/', label: 'Home', icon: 'home' },
  { key: 'climb', href: '/climb', label: 'Climb', icon: 'triangle' },
  { key: 'profile', href: '/profile', label: 'Profile', icon: 'user' },
];

type BottomNavProps = {
  onActiveTabPress?: (key: TabKey) => void;
  onProfilePress?: () => void;
};

export function BottomNav({ onActiveTabPress, onProfilePress }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const router = useRouter();
  const active = getTabForPathname(pathname);
  const handlePress = (item: NavItem) => {
    rememberRouteForPath(pathname, createRouteHref(pathname, searchParams));

    if (item.key === active) {
      if (isTabRootPath(item.key, pathname)) {
        onActiveTabPress?.(item.key);
        return;
      }

      if (item.key === 'profile') {
        resetRememberedRouteForTab(item.key);

        if (onProfilePress) {
          onProfilePress();
          return;
        }

        router.replace(item.href);
        return;
      }

      const currentRouteKey = createRouteKey(pathname, searchParams);
      resetRememberedRouteForTab(item.key);
      clearRememberedScrollOffset(currentRouteKey);
      clearRememberedScrollOffset(getTabRootPath(item.key));

      router.replace(item.href);
      return;
    }

    router.replace(getRememberedRouteForTab(item.key));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.nav}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => handlePress(item)}
              style={styles.item}
            >
              <Feather name={item.icon} size={27} color={isActive ? colors.charcoal : colors.muted} strokeWidth={isActive ? 2.7 : 2.2} />
              <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'rgba(255,253,248,0.94)',
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
  },
  nav: {
    flexDirection: 'row',
    width: '100%',
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 50,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontWeight: '800',
  },
  homeIndicator: {
    alignSelf: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    height: 5,
    marginTop: spacing.md,
    width: 128,
  },
});
