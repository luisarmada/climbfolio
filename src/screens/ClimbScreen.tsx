import { useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useActiveSessionStore } from '../features/sessions';

const climbingGymImage = require('../assets/images/climbing-gym.png');

export function ClimbScreen() {
  const router = useRouter();
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const error = useActiveSessionStore((state) => state.error);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const startSession = useActiveSessionStore((state) => state.startSession);
  const hasActiveSession = Boolean(activeSession);

  useEffect(() => {
    void restoreActiveSession();
  }, [restoreActiveSession]);

  async function handleSessionAction() {
    if (!hasActiveSession) {
      await startSession();
    }

    router.push('/session/active');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Climb</Text>
      <Text style={styles.title}>Ready to climb?</Text>

      <View
        accessibilityLabel="Soft illustration of an indoor climbing gym wall"
        style={styles.hero}
      >
        <Image resizeMode="cover" source={climbingGymImage} style={styles.heroImage} />
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        accessibilityRole="button"
        disabled={isLoading}
        onPress={handleSessionAction}
        style={[styles.cta, isLoading && styles.ctaDisabled]}
      >
        <View style={styles.ctaLeft}>
          <Feather name={hasActiveSession ? 'play-circle' : 'triangle'} size={34} color={colors.white} />
          <Text style={styles.ctaText}>
            {isLoading ? (hasActiveSession ? 'Opening Session...' : 'Starting Session...') : hasActiveSession ? 'Back to Session' : 'Start New Session'}
          </Text>
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
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 170,
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
    overflow: 'hidden',
    width: '100%',
  },
  heroImage: {
    height: '106%',
    left: '-3%',
    position: 'absolute',
    top: '-3%',
    width: '106%',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
});
