import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppChip } from '../components/AppChip';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { ProfileBadgePreference } from '../domain/models';
import { getProfileBadgeOption, profileBadgeOptions, useProfileStore } from '../features/profile';

export function ProfileSettingsScreen() {
  const router = useRouter();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const error = useProfileStore((state) => state.error);
  const [displayName, setDisplayName] = useState('Local Climber');
  const [climberType, setClimberType] = useState('Indoor boulderer');
  const [badgePreference, setBadgePreference] = useState<ProfileBadgePreference>('best_grade');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateProfile() {
      const nextProfile = await loadProfile();

      if (isMounted) {
        setDisplayName(nextProfile.displayName);
        setClimberType(nextProfile.climberType);
        setBadgePreference(nextProfile.badgePreference);
      }
    }

    void hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setClimberType(profile.climberType);
    setBadgePreference(profile.badgePreference);
  }, [profile]);

  async function handleSave() {
    await updateProfile({ badgePreference, climberType, displayName });
    setSavedMessage('Saved locally');
  }

  const selectedBadge = getProfileBadgeOption(badgePreference);
  const canSave = displayName.trim().length > 0 && climberType.trim().length > 0 && !isLoading;

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
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
      </View>

      <AppCard style={styles.previewCard}>
        <View style={styles.previewIcon}>
          <Feather name="user" size={24} color={colors.charcoal} />
        </View>
        <View style={styles.previewCopy}>
          <Text style={styles.previewName}>{displayName.trim() || 'Local Climber'}</Text>
          <Text style={styles.previewType}>{climberType.trim() || 'Indoor boulderer'}</Text>
          <Text style={styles.previewBadge}>{selectedBadge.label}</Text>
        </View>
      </AppCard>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badge preference</Text>
        <AppCard style={styles.badgeCard}>
          <Text style={styles.helperText}>Choose the badge shown on your Profile card.</Text>
          <View style={styles.chipWrap}>
            {profileBadgeOptions.map((option) => (
              <AppChip
                key={option.value}
                label={option.label}
                onPress={() => {
                  setBadgePreference(option.value);
                  setSavedMessage(null);
                }}
                selected={option.value === badgePreference}
              />
            ))}
          </View>
          <View style={styles.badgeDescription}>
            <View style={styles.badgeDescriptionIcon}>
              <Feather name="award" size={18} color={colors.charcoal} />
            </View>
            <Text style={styles.badgeDescriptionText}>{selectedBadge.description}</Text>
          </View>
        </AppCard>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}

      <AppButton disabled={!canSave} icon="check" onPress={handleSave} title={isLoading ? 'Saving...' : 'Save Profile'} />
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
  badgeCard: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  badgeDescription: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  badgeDescriptionIcon: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  badgeDescriptionText: {
    color: colors.muted,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  helperText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
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
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,209,102,0.5)',
    borderColor: 'rgba(30,30,30,0.08)',
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  previewCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  previewCopy: {
    flex: 1,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  previewName: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
  },
  previewType: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 3,
  },
  savedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: spacing.md,
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
