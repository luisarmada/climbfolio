import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { getLocationTypeLabel, LocationEditorModal } from '../components/LocationEditorModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { ClimbingLocation } from '../domain/models';
import { builtInGradingScales } from '../domain/gradeScales';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';

export function LocationSettingsScreen() {
  const router = useRouter();
  const { goBackWithTransition } = useProfileReturnTransition();
  const error = useLocationStore((state) => state.error);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const removeLocation = useLocationStore((state) => state.removeLocation);
  const selectLocation = useLocationStore((state) => state.selectLocation);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [editingLocation, setEditingLocation] = useState<ClimbingLocation | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  useEffect(() => {
    void loadLocations();
    void loadPreferences();
  }, [loadLocations, loadPreferences]);

  const gradeScaleOptions = useMemo(
    () => [
      ...builtInGradingScales.map((scale) => ({ id: scale.gradingScaleType, name: scale.gradingScaleName })),
      ...(preferences?.customScales ?? []).map((scale) => ({ id: scale.id, name: scale.name })),
    ],
    [preferences?.customScales],
  );

  function getScaleName(scaleId: string) {
    return gradeScaleOptions.find((scale) => scale.id === scaleId)?.name ?? 'V Scale';
  }

  function openCreateEditor() {
    setEditingLocation(null);
    setIsEditorVisible(true);
  }

  function openEditEditor(location: ClimbingLocation) {
    setEditingLocation(location);
    setIsEditorVisible(true);
  }

  function openCreateCustomGradeScale() {
    setIsEditorVisible(false);
    setEditingLocation(null);
    router.push('/settings/climbing');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.title}>Locations</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Session locations</Text>
            <Text style={styles.sectionCopy}>Set places for sessions without assuming every place is a gym.</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Add location"
            accessibilityRole="button"
            onPress={openCreateEditor}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationList}>
          {locations.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No locations yet</Text>
              <Text style={styles.emptyCopy}>Add a wall, venue, outdoor area, or any place you want attached to sessions.</Text>
            </AppCard>
          ) : null}

          {locations.map((location) => (
            <AppCard key={location.id} style={[styles.locationCard, location.isSelected && styles.selectedLocationCard]}>
              <View style={styles.locationTopRow}>
                <View style={styles.locationCopy}>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationName}>{location.name}</Text>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationDetail}>
                    {getLocationTypeLabel(location.type)} - {getScaleName(location.gradingScaleId)}
                  </Text>
                </View>
                <Text style={styles.selectedText}>{location.isSelected ? 'Selected' : ''}</Text>
              </View>
              <View style={styles.actions}>
                <AppButton
                  disabled={location.isSelected}
                  onPress={() => void selectLocation(location.id)}
                  style={styles.actionButton}
                  title={location.isSelected ? 'Selected' : 'Use'}
                  variant="secondary"
                />
                <AppButton onPress={() => openEditEditor(location)} style={styles.actionButton} title="Edit" variant="secondary" />
                <AppButton onPress={() => void removeLocation(location.id)} style={styles.actionButton} title="Remove" variant="destructive" />
              </View>
            </AppCard>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grade scales</Text>
        <Text style={styles.sectionCopy}>If the grading scale for a location does not exist yet, create it first.</Text>
        <AppButton onPress={() => router.push('/settings/climbing')} title="Open Grade Scales" variant="secondary" />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <LocationEditorModal
        defaultGradeScaleId={preferences?.selectedGradingScaleId ?? 'v_scale'}
        editingLocation={editingLocation}
        isSelectedOnCreate={locations.length === 0}
        onCreateCustomGradeScale={openCreateCustomGradeScale}
        onDismiss={() => {
          setIsEditorVisible(false);
          setEditingLocation(null);
        }}
        visible={isEditorVisible}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  createButtonText: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    padding: spacing.lg,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  errorText: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  locationCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  locationList: {
    gap: spacing.md,
  },
  locationName: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '800',
  },
  locationTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  selectedLocationCard: {
    backgroundColor: 'rgba(168,221,191,0.2)',
    borderColor: colors.mint,
  },
  selectedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
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
