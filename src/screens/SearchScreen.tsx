import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';

export function SearchScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.title}>Search</Text>
      </View>

      <AppCard style={styles.comingSoonCard}>
        <View style={styles.iconCircle}>
          <Feather name="search" size={24} color={colors.charcoal} />
        </View>
        <Text style={styles.cardTitle}>Friend search coming soon</Text>
        <Text style={styles.cardCopy}>
          This will eventually help you find friends and add climbing connections. For now, Climb Book stays focused on your own sessions.
        </Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 340,
    textAlign: 'center',
  },
  cardTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  comingSoonCard: {
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.xxl,
  },
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 58,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
