import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { resolveSelectedGradingScale } from '../domain/gradeScales';
import { useClimbingPreferencesStore } from '../features/preferences';
import { formatProfileBadge, useProfileStore } from '../features/profile';
import { calculateWeeklyStreak, SessionSummary, sessionSummaryService, summarizeAggregate } from '../features/summaries';
import { useToastStore } from '../features/toasts';
import { getErrorMessage } from '../utils/errorMessage';
import { inputLimits, limitInput } from '../utils/inputValidation';

export function ProfileSettingsScreen() {
  const { goBackWithTransition } = useProfileReturnTransition();
  const router = useRouter();
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const showError = useToastStore((state) => state.showError);
  const showSuccess = useToastStore((state) => state.showSuccess);
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const error = useProfileStore((state) => state.error);
  const [displayName, setDisplayName] = useState('Local Climber');
  const [tagline, setTagline] = useState('Indoor boulderer');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateProfile() {
      const [nextProfile] = await Promise.all([loadProfile(), loadClimbingPreferences()]);
      const nextSummaries = await sessionSummaryService.listCompletedSessionSummaries({
        userIds: [nextProfile.userId],
      });

      if (isMounted) {
        setDisplayName(nextProfile.displayName);
        setTagline(nextProfile.tagline);
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
    setTagline(profile.tagline);
  }, [profile]);

  async function handleSave() {
    try {
      await updateProfile({ badgePreference: 'best_grade', displayName, tagline });
      setSavedMessage('Saved locally');
      showSuccess('Profile saved');
    } catch (saveError) {
      showError('Profile was not saved', getErrorMessage(saveError, 'Could not save profile changes.'));
    }
  }

  const canSave = displayName.trim().length > 0 && tagline.trim().length > 0 && !isLoading;
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
          onPress={() => goBackWithTransition('/settings')}
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
        displayName={displayName.trim() || 'Local Climber'}
        onProfilePicturePress={() => router.push('/settings/profile-picture')}
        profilePictureAccessibilityLabel="Choose profile picture"
        profilePictureId={profile?.profilePictureId}
        stats={[
          { label: 'Sessions', value: String(aggregateStats.sessions) },
          { label: 'Followers', value: '0' },
          { label: 'Following', value: '0' },
        ]}
        streakCount={weeklyStreak}
        style={styles.previewCard}
        tagline={tagline.trim() || 'Indoor boulderer'}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <AppCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Display name</Text>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            maxLength={inputLimits.profileDisplayName}
            onChangeText={(name) => setDisplayName(limitInput(name, inputLimits.profileDisplayName))}
            placeholder="Local Climber"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={displayName}
          />

          <Text style={[styles.inputLabel, styles.nextInputLabel]}>Tagline</Text>
          <TextInput
            accessibilityLabel="Tagline"
            autoCapitalize="sentences"
            maxLength={inputLimits.profileTagline}
            onChangeText={(nextTagline) => setTagline(limitInput(nextTagline, inputLimits.profileTagline))}
            placeholder="Indoor boulderer"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={tagline}
          />
        </AppCard>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}

      <View style={styles.saveAction}>
        <AppButton disabled={!canSave} icon="check" onPress={() => void handleSave()} title={isLoading ? 'Saving...' : 'Save Profile'} />
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
    ...typography.sectionTitle,
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
