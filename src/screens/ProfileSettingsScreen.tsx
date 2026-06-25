import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { resolveSelectedGradingScale } from '../domain/gradeScales';
import { useClimbingPreferencesStore } from '../features/preferences';
import { formatProfileBadge, useProfileStore } from '../features/profile';
import { calculateWeeklyStreak, SessionSummary, sessionSummaryService, summarizeAggregate } from '../features/summaries';

export function ProfileSettingsScreen() {
  const router = useRouter();
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const error = useProfileStore((state) => state.error);
  const [displayName, setDisplayName] = useState('Local Climber');
  const [climberType, setClimberType] = useState('Indoor boulderer');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateProfile() {
      const [nextProfile, nextSummaries] = await Promise.all([
        loadProfile(),
        sessionSummaryService.listCompletedSessionSummaries(),
        loadClimbingPreferences(),
      ]);

      if (isMounted) {
        setDisplayName(nextProfile.displayName);
        setClimberType(nextProfile.climberType);
        setSummaries(nextSummaries);
      }
    }

    void hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [loadClimbingPreferences, loadProfile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setClimberType(profile.climberType);
  }, [profile]);

  async function handleSave() {
    await updateProfile({ badgePreference: 'best_grade', climberType, displayName });
    setSavedMessage('Saved locally');
  }

  const canSave = displayName.trim().length > 0 && climberType.trim().length > 0 && !isLoading;
  const aggregateStats = summarizeAggregate(summaries);
  const weeklyStreak = calculateWeeklyStreak(summaries);
  const selectedScale = resolveSelectedGradingScale(climbingPreferences ?? { customScales: [], selectedGradingScaleId: 'v_scale' });
  const badgeText = formatProfileBadge(summaries, selectedScale);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to settings"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Profile</Text>
        </View>
      </View>

      <ProfileAccountCard
        badgeText={badgeText}
        climberType={climberType.trim() || 'Indoor boulderer'}
        displayName={displayName.trim() || 'Local Climber'}
        stats={[
          { label: 'Sessions', value: String(aggregateStats.sessions) },
          { label: 'Followers', value: '0' },
          { label: 'Following', value: '0' },
        ]}
        streakCount={weeklyStreak}
        style={styles.previewCard}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <AppCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Display name</Text>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            maxLength={32}
            onChangeText={setDisplayName}
            placeholder="Local Climber"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={displayName}
          />

          <Text style={[styles.inputLabel, styles.nextInputLabel]}>Climber type</Text>
          <TextInput
            accessibilityLabel="Climber type"
            autoCapitalize="sentences"
            maxLength={40}
            onChangeText={setClimberType}
            placeholder="Indoor boulderer"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={climberType}
          />
        </AppCard>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}

      <View style={styles.saveAction}>
        <AppButton disabled={!canSave} icon="check" onPress={handleSave} title={isLoading ? 'Saving...' : 'Save Profile'} />
      </View>
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
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  errorText: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: spacing.md,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  formCard: {
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  inputLabel: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  nextInputLabel: {
    marginTop: spacing.lg,
  },
  previewCard: {
    marginTop: spacing.xl,
  },
  savedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: spacing.md,
  },
  saveAction: {
    marginTop: spacing.xl,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  titleBlock: {
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
