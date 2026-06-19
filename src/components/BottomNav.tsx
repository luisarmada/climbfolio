import { Feather } from '@expo/vector-icons';
import { Href, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../design/tokens';

export type ScreenKey = 'home' | 'activity' | 'profile';

type NavItem = {
  key: ScreenKey;
  href: Href;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const items: NavItem[] = [
  { key: 'home', href: '/', label: 'Home', icon: 'home' },
  { key: 'activity', href: '/activity', label: 'Activity', icon: 'bar-chart-2' },
  { key: 'profile', href: '/profile', label: 'Profile', icon: 'user' },
];

function getActiveScreen(pathname: string): ScreenKey {
  if (pathname.startsWith('/activity')) {
    return 'activity';
  }

  if (pathname.startsWith('/profile')) {
    return 'profile';
  }

  return 'home';
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = getActiveScreen(pathname);

  return (
    <View style={styles.wrapper}>
      <View style={styles.nav}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => router.push(item.href)}
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
    paddingHorizontal: 42,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.charcoal,
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
