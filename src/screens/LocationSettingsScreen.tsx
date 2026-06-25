import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DismissibleModal } from '../components/DismissibleModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { ClimbingLocation, ClimbingLocationType } from '../domain/models';
import { builtInGradingScales } from '../domain/gradeScales';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';

const locationTypes: { label: string; value: ClimbingLocationType }[] = [
  { label: 'Gym', value: 'gym' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Other', value: 'other' },
];

function getTypeLabel(type: ClimbingLocationType) {
  return locationTypes.find((option) => option.value === type)?.label ?? 'Other';
}

export function LocationSettingsScreen() {
  const router = useRouter();
  const createLocation = useLocationStore((state) => state.createLocation);
  const error = useLocationStore((state) => state.error);
  const isLoading = useLocationStore((state) => state.isLoading);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const removeLocation = useLocationStore((state) => state.removeLocation);
  const selectLocation = useLocationStore((state) => state.selectLocation);
  const updateLocation = useLocationStore((state) => state.updateLocation);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [draftGradeScaleId, setDraftGradeScaleId] = useState('v_scale');
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState<ClimbingLocationType>('gym');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
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
  const canSave = draftName.trim().length > 0 && Boolean(draftGradeScaleId);

  function getScaleName(scaleId: string) {
    return gradeScaleOptions.find((scale) => scale.id === scaleId)?.name ?? 'V Scale';
  }

  function openCreateEditor() {
    setDraftGradeScaleId(preferences?.selectedGradingScaleId ?? 'v_scale');
    setDraftName('');
    setDraftType('gym');
    setEditingLocationId(null);
    setIsEditorVisible(true);
  }

  function openEditEditor(location: ClimbingLocation) {
    setDraftGradeScaleId(location.gradingScaleId);
    setDraftName(location.name);
    setDraftType(location.type);
    setEditingLocationId(location.id);
    setIsEditorVisible(true);
  }

  function openCreateCustomGradeScale() {
    setIsEditorVisible(false);
    router.push('/settings/climbing');
  }

  async function handleSaveLocation() {
    if (!canSave) {
      return;
    }

    if (editingLocationId) {
      await updateLocation(editingLocationId, {
        gradingScaleId: draftGradeScaleId,
        name: draftName,
        type: draftType,
      });
    } else {
      await createLocation({
        gradingScaleId: draftGradeScaleId,
        isSelected: locations.length === 0,
        name: draftName,
        type: draftType,
      });
    }

    setIsEditorVisible(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationDetail}>
                    {getTypeLabel(location.type)} - {getScaleName(location.gradingScaleId)}
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

      <DismissibleModal onDismiss={() => setIsEditorVisible(false)} visible={isEditorVisible}>
          <AppCard style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>{editingLocationId ? 'Edit location' : 'Add location'}</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close location editor"
                accessibilityRole="button"
                onPress={() => setIsEditorVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Location name</Text>
              <TextInput
                accessibilityLabel="Location name"
                onChangeText={setDraftName}
                placeholder="The Depot, Stanage, Local wall..."
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={draftName}
              />

              <Text style={styles.inputLabel}>Location type</Text>
              <View style={styles.optionGrid}>
                {locationTypes.map((option) => {
                  const selected = draftType === option.value;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`Set location type to ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => setDraftType(option.value)}
                      style={[styles.optionButton, selected && styles.selectedOptionButton]}
                    >
                      <Text style={styles.optionButtonText}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Grade scale</Text>
              <View style={styles.optionList}>
                {gradeScaleOptions.map((scale) => {
                  const selected = draftGradeScaleId === scale.id;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`Use ${scale.name} grade scale`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={scale.id}
                      onPress={() => setDraftGradeScaleId(scale.id)}
                      style={[styles.gradeScaleRow, selected && styles.selectedOptionButton]}
                    >
                      <Text style={styles.gradeScaleName}>{scale.name}</Text>
                      <Text style={styles.gradeScaleState}>{selected ? 'Selected' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Create custom grade scale"
                  accessibilityRole="button"
                  onPress={openCreateCustomGradeScale}
                  style={[styles.gradeScaleRow, styles.createOption]}
                >
                  <View style={styles.createOptionCopy}>
                    <Feather name="plus" size={18} color={colors.charcoal} />
                    <Text style={styles.gradeScaleName}>Create custom grade scale</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.editorActions}>
                <AppButton disabled={!canSave || isLoading} onPress={() => void handleSaveLocation()} title={editingLocationId ? 'Save Location' : 'Add Location'} />
                <AppButton onPress={() => setIsEditorVisible(false)} title="Cancel" variant="secondary" />
              </View>
            </ScrollView>
          </AppCard>
      </DismissibleModal>
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
  createOption: {
    backgroundColor: 'transparent',
    borderColor: colors.muted,
    borderStyle: 'dotted',
    justifyContent: 'flex-start',
  },
  createOptionCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editorActions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  editorCard: {
    maxHeight: '100%',
    padding: spacing.lg,
    width: '100%',
  },
  editorContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  editorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  editorTitle: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 20,
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
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gradeScaleName: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  gradeScaleRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  gradeScaleState: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  inputLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  locationCopy: {
    flex: 1,
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
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  optionButtonText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  optionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionList: {
    gap: spacing.sm,
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
  },
  sectionHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  selectedLocationCard: {
    backgroundColor: 'rgba(168,221,191,0.2)',
    borderColor: colors.mint,
  },
  selectedOptionButton: {
    backgroundColor: 'rgba(168,221,191,0.28)',
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
