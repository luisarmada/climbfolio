import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useActiveSessionStore } from '../features/sessions';

export function ClimbScreen() {
  const router = useRouter();
  const error = useActiveSessionStore((state) => state.error);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const startSession = useActiveSessionStore((state) => state.startSession);

  async function handleStartSession() {
    await startSession();
    router.push('/session/active');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Climb</Text>
      <Text style={styles.title}>Ready to climb?</Text>

      <View style={styles.hero} accessibilityLabel="Minimal indoor climbing wall illustration">
        <View style={styles.wallOne} />
        <View style={styles.wallTwo} />
        <View style={styles.wallLight} />
        <View style={[styles.hold, styles.holdOne]} />
        <View style={[styles.hold, styles.holdTwo]} />
        <View style={[styles.hold, styles.holdThree]} />
        <View style={[styles.hold, styles.holdFour]} />
        <View style={[styles.hold, styles.holdFive]} />
        <View style={[styles.leaf, styles.leafOne]} />
        <View style={[styles.leaf, styles.leafTwo]} />
        <View style={[styles.leaf, styles.leafThree]} />
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        accessibilityRole="button"
        disabled={isLoading}
        onPress={handleStartSession}
        style={[styles.cta, isLoading && styles.ctaDisabled]}
      >
        <View style={styles.ctaLeft}>
          <Feather name="triangle" size={34} color={colors.white} />
          <Text style={styles.ctaText}>{isLoading ? 'Starting Session...' : 'Start New Session'}</Text>
        </View>
        <View style={styles.ctaArrow}>
          <Feather name="arrow-right" size={32} color={colors.charcoal} />
        </View>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 24,
    elevation: 3,
    flexDirection: 'row',
    height: 88,
    justifyContent: 'space-between',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
  },
  ctaArrow: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  ctaDisabled: {
    opacity: 0.66,
  },
  ctaLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  ctaText: {
    color: colors.white,
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  errorText: {
    color: '#B85A3B',
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  eyebrow: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 4,
  },
  hero: {
    backgroundColor: '#E8DED1',
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 170,
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
    overflow: 'hidden',
  },
  hold: {
    borderRadius: 999,
    height: 18,
    position: 'absolute',
    width: 26,
  },
  holdFive: { backgroundColor: '#262A28', left: '54%', top: 112, transform: [{ rotate: '12deg' }] },
  holdFour: { backgroundColor: '#7C5AC9', right: 95, top: 108, transform: [{ rotate: '16deg' }] },
  holdOne: { backgroundColor: '#F17642', left: '39%', top: 70, transform: [{ rotate: '-18deg' }] },
  holdThree: { backgroundColor: '#EFBF35', height: 42, right: 24, top: 58, width: 48, transform: [{ rotate: '-20deg' }] },
  holdTwo: { backgroundColor: '#80BE84', left: '44%', top: 34, transform: [{ rotate: '12deg' }] },
  leaf: {
    backgroundColor: '#2D5B47',
    borderBottomLeftRadius: 999,
    borderTopRightRadius: 999,
    bottom: -8,
    height: 78,
    position: 'absolute',
    width: 28,
  },
  leafOne: { left: 8, transform: [{ rotate: '-28deg' }] },
  leafThree: { backgroundColor: '#244936', left: 50, transform: [{ rotate: '18deg' }] },
  leafTwo: { backgroundColor: '#37694F', left: 28, transform: [{ rotate: '-8deg' }] },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  wallLight: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    height: '120%',
    left: '12%',
    position: 'absolute',
    top: -10,
    transform: [{ skewX: '-18deg' }],
    width: '18%',
  },
  wallOne: {
    backgroundColor: '#C9C8C3',
    height: '120%',
    left: '23%',
    position: 'absolute',
    top: -10,
    transform: [{ skewX: '-16deg' }],
    width: '32%',
  },
  wallTwo: {
    backgroundColor: '#969794',
    height: '120%',
    left: '47%',
    position: 'absolute',
    top: -10,
    transform: [{ skewX: '-14deg' }],
    width: '14%',
  },
});
