import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { ProfileFlairPill } from '../components/ProfileFlairPill';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import type { ProfileFlairId } from '../domain/models';
import { resolveSelectedGradingScale } from '../domain/gradeScales';
import { useClimbingPreferencesStore } from '../features/preferences';
import {
  formatProfileBadge,
  maxSelectedProfileFlairs,
  normalizeSelectedProfileFlairIds,
  profileFlairPresets,
  resolveProfileFlairs,
  useProfileStore,
} from '../features/profile';
import { calculateWeeklyStreak, SessionSummary, sessionSummaryService } from '../features/summaries';
import { useToastStore } from '../features/toasts';
import { getErrorMessage } from '../utils/errorMessage';

export function ProfileFlairPickerScreen() {
  const { goBackWithTransition } = useProfileReturnTransition();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const showError = useToastStore((state) => state.showError);
  const showSuccess = useToastStore((state) => state.showSuccess);
  const [selectedFlairIds, setSelectedFlairIds] = useState<ProfileFlairId[]>(['best_grade']);
  const [showStreakFlair, setShowStreakFlair] = useState(true);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateFlairs() {
      const [nextProfile] = await Promise.all([loadProfile(), loadClimbingPreferences()]);
      const nextSummaries = await sessionSummaryService.listCompletedSessionSummaries({
        userIds: [nextProfile.userId],
      });

      if (isMounted) {
        setSelectedFlairIds(normalizeSelectedProfileFlairIds(nextProfile.selectedFlairIds));
        setShowStreakFlair(nextProfile.showStreakFlair);
        setSummaries(nextSummaries);
      }
    }

    void hydrateFlairs();

    return () => {
      isMounted = false;
    };
  }, [loadClimbingPreferences, loadProfile]);

  const selectedScale = resolveSelectedGradingScale(climbingPreferences ?? { customScales: [], selectedGradingScaleId: 'v_scale' });
  const badgeText = formatProfileBadge(summaries, selectedScale);
  const flairs = useMemo(() => resolveProfileFlairs(selectedFlairIds, badgeText), [badgeText, selectedFlairIds]);
  const weeklyStreak = useMemo(() => calculateWeeklyStreak(summaries), [summaries]);
  const displayName = profile?.displayName ?? 'Local Climber';
  const tagline = profile?.tagline ?? 'Indoor boulderer';
  const selectedCount = selectedFlairIds.length;
  const isAtLimit = selectedCount >= maxSelectedProfileFlairs;

  function toggleFlair(flairId: ProfileFlairId) {
    setSelectedFlairIds((currentFlairIds) => {
      if (currentFlairIds.includes(flairId)) {
        return currentFlairIds.filter((selectedId) => selectedId !== flairId);
      }

      if (currentFlairIds.length >= maxSelectedProfileFlairs) {
        showError('Flair limit reached', `Choose up to ${maxSelectedProfileFlairs} profile flairs.`);
        return currentFlairIds;
      }

      return normalizeSelectedProfileFlairIds([...currentFlairIds, flairId]);
    });
  }

  async function handleSave() {
    try {
      await updateProfile({ selectedFlairIds, showStreakFlair });
      showSuccess('Profile flairs saved');
      goBackWithTransition('/settings/profile');
    } catch (saveError) {
      showError('Flairs were not saved', getErrorMessage(saveError, 'Could not update profile flairs.'));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to profile settings"
          accessibilityRole="button"
          onPress={() => goBackWithTransition('/settings/profile')}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile Flairs</Text>
      </View>

      <ProfileAccountCard
        badgeText={badgeText}
        displayName={displayName}
        flairs={flairs}
        profilePictureId={profile?.profilePictureId}
        showStreakFlair={showStreakFlair}
        stats={[
          { label: 'Selected', value: String(selectedCount) },
          { label: 'Limit', value: String(maxSelectedProfileFlairs) },
          { label: 'Streak', value: showStreakFlair ? 'On' : 'Off' },
        ]}
        streakCount={weeklyStreak}
        tagline={tagline}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose flairs</Text>
          <Text style={styles.countText}>{selectedCount}/{maxSelectedProfileFlairs}</Text>
        </View>

        <View style={styles.flairGrid}>
          {profileFlairPresets.map((flair) => {
            const selected = selectedFlairIds.includes(flair.id);
            const disabled = !selected && isAtLimit;
            const label = flair.id === 'best_grade' ? badgeText : flair.label;

            return (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel={`${selected ? 'Remove' : 'Select'} ${label} flair`}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                key={flair.id}
                onPress={() => toggleFlair(flair.id)}
                style={[styles.flairOption, selected && styles.selectedFlairOption, disabled && styles.disabledFlairOption]}
              >
                <View style={styles.flairOptionHeader}>
                  <ProfileFlairPill
                    backgroundColor={flair.backgroundColor}
                    borderColor={flair.borderColor}
                    label={label}
                    textColor={flair.textColor}
                  />
                  <View style={[styles.checkCircle, selected && styles.selectedCheckCircle]}>
                    {selected ? <Feather name="check" size={14} color={colors.charcoal} /> : null}
                  </View>
                </View>
                <Text style={styles.flairDescription}>{flair.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streak flair</Text>
        <AppCard style={styles.streakCard}>
          <View style={styles.streakCopy}>
            <Text style={styles.streakTitle}>Show streak flair</Text>
            <Text style={styles.streakMeta}>{weeklyStreak} week streak</Text>
          </View>
          <Switch
            accessibilityLabel="Show streak flair"
            onValueChange={setShowStreakFlair}
            thumbColor={showStreakFlair ? colors.charcoal : colors.surface}
            trackColor={{ false: colors.stoneDark, true: colors.amber }}
            value={showStreakFlair}
          />
        </AppCard>
      </View>

      <AppButton disabled={isLoading} icon="check" onPress={() => void handleSave()} title={isLoading ? 'Saving...' : 'Save Flairs'} />
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
  checkCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: 152,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  countText: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledFlairOption: {
    opacity: 0.48,
  },
  flairDescription: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  flairGrid: {
    gap: spacing.md,
  },
  flairOption: {
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  flairOptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.charcoal,
  },
  selectedCheckCircle: {
    backgroundColor: colors.mint,
    borderColor: colors.success,
  },
  selectedFlairOption: {
    borderColor: colors.charcoal,
    borderWidth: 1.5,
  },
  streakCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  streakCopy: {
    flex: 1,
    minWidth: 0,
  },
  streakMeta: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  streakTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    ...typography.compactTitle,
    color: colors.charcoal,
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
