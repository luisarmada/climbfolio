import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { profilePicturePresets, useProfileStore } from '../features/profile';
import type { ProfilePicturePreset } from '../features/profile';

export function ProfilePicturePickerScreen() {
  const { goBackWithTransition } = useProfileReturnTransition();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const profile = useProfileStore((state) => state.profile);
  const selectedProfilePictureId = profile?.profilePictureId;
  const generalProfilePicturePresets = profilePicturePresets.filter((preset) => preset.group === 'general');
  const characterProfilePicturePresets = profilePicturePresets.filter((preset) => preset.group === 'characters');

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSelectProfilePicture(profilePictureId: string) {
    await updateProfile({ profilePictureId });
    goBackWithTransition('/settings/profile');
  }

  function renderProfilePictureButton(preset: ProfilePicturePreset) {
    const isSelected = preset.id === selectedProfilePictureId;

    return (
      <TouchableOpacity
        activeOpacity={0.76}
        accessibilityLabel={`Choose ${preset.label}`}
        accessibilityRole="button"
        key={preset.id}
        onPress={() => handleSelectProfilePicture(preset.id)}
        style={[styles.pictureButton, isSelected && styles.pictureButtonSelected]}
      >
        <Image accessibilityIgnoresInvertColors resizeMode="cover" source={preset.source} style={styles.pictureImage} />
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Feather name="check" size={15} color={colors.charcoal} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
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
        <Text style={styles.title}>Profile Picture</Text>
      </View>

      {profilePicturePresets.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No pictures found</Text>
          <Text style={styles.emptyCopy}>Add PNG files to src/assets/profile-pictures, including pfp_mug.png.</Text>
        </AppCard>
      ) : (
        <>
          {generalProfilePicturePresets.length > 0 ? (
            <View style={styles.grid}>{generalProfilePicturePresets.map(renderProfilePictureButton)}</View>
          ) : null}
          {generalProfilePicturePresets.length > 0 && characterProfilePicturePresets.length > 0 ? (
            <View style={styles.characterBreak} />
          ) : null}
          {characterProfilePicturePresets.length > 0 ? (
            <View style={styles.grid}>{characterProfilePicturePresets.map(renderProfilePictureButton)}</View>
          ) : null}
        </>
      )}
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
    paddingBottom: 204,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  characterBreak: {
    height: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pictureButton: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexBasis: '22.5%',
    flexGrow: 0,
    justifyContent: 'center',
    maxWidth: '22.5%',
    minWidth: 58,
    overflow: 'hidden',
    padding: spacing.xs,
    position: 'relative',
  },
  pictureButtonSelected: {
    borderColor: colors.charcoal,
    borderWidth: 1.5,
  },
  pictureImage: {
    borderRadius: radius.lg,
    height: '100%',
    transform: [{ scale: 1.04 }],
    width: '100%',
  },
  selectedBadge: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
    width: 24,
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
    marginBottom: spacing.xl,
  },
});
