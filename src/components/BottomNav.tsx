import { Feather } from '@expo/vector-icons';
import { Href, usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing } from '../design/tokens';

export type ScreenKey = 'home' | 'climb' | 'profile';

type NavItem = {
  key: ScreenKey;
  href: Href;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const items: NavItem[] = [
  { key: 'home', href: '/', label: 'Home', icon: 'home' },
  { key: 'climb', href: '/climb', label: 'Climb', icon: 'triangle' },
  { key: 'profile', href: '/profile', label: 'Profile', icon: 'user' },
];

function getActiveScreen(pathname: string): ScreenKey {
  if (pathname.startsWith('/climb') || pathname.startsWith('/session')) {
    return 'climb';
  }

  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
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
              accessibilityLabel={item.label}
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
