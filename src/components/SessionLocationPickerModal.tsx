import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import { ClimbingLocation, ClimbingLocationType } from '../domain/models';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';

type SessionLocationPickerModalProps = {
  createLocationSelectsDefault?: boolean;
  includeNoLocation?: boolean;
  onCreateCustomGradeScale?: () => void;
  onDismiss: () => void;
  onOpenLocationSettings?: () => void;
  onSelectLocation: (location: ClimbingLocation | null) => Promise<void> | void;
  selectedLocationId?: string | null;
  visible: boolean;
};

const locationTypes: { label: string; value: ClimbingLocationType }[] = [
  { label: 'Gym', value: 'gym' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Other', value: 'other' },
];

export function getLocationTypeLabel(type: ClimbingLocationType) {
  if (type === 'outdoor') {
    return 'Outdoor';
  }

  if (type === 'other') {
    return 'Other';
  }

  return 'Gym';
}

export function SessionLocationPickerModal({
  createLocationSelectsDefault = false,
  includeNoLocation = false,
  onCreateCustomGradeScale,
  onDismiss,
  onOpenLocationSettings,
  onSelectLocation,
  selectedLocationId,
  visible,
}: SessionLocationPickerModalProps) {
  const createLocation = useLocationStore((state) => state.createLocation);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [draftLocationGradeScaleId, setDraftLocationGradeScaleId] = useState('v_scale');
  const [draftLocationName, setDraftLocationName] = useState('');
  const [draftLocationType, setDraftLocationType] = useState<ClimbingLocationType>('gym');
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void loadLocations();
    void loadPreferences();
  }, [loadLocations, loadPreferences, visible]);

  useEffect(() => {
    if (preferences?.selectedGradingScaleId) {
      setDraftLocationGradeScaleId(preferences.selectedGradingScaleId);
    }
  }, [preferences?.selectedGradingScaleId]);

  const gradeScaleOptions = useMemo(
    () => [
      ...builtInGradingScales.map((scale) => ({ id: scale.gradingScaleType, name: scale.gradingScaleName })),
      ...(preferences?.customScales ?? []).map((scale) => ({ id: scale.id, name: scale.name })),
    ],
    [preferences?.customScales],
  );

  function getGradeScaleName(scaleId: string) {
    return gradeScaleOptions.find((scale) => scale.id === scaleId)?.name ?? 'V Scale';
  }

  function closePicker() {
    setIsCreatingLocation(false);
    onDismiss();
  }

  function openCreateLocation() {
    setDraftLocationGradeScaleId(preferences?.selectedGradingScaleId ?? 'v_scale');
    setDraftLocationName('');
    setDraftLocationType('gym');
    setIsCreatingLocation(true);
  }

  async function handleCreateLocation() {
    if (!draftLocationName.trim()) {
      return;
    }

    const location = await createLocation({
      gradingScaleId: draftLocationGradeScaleId,
      isSelected: createLocationSelectsDefault,
      name: draftLocationName,
      type: draftLocationType,
    });

    await onSelectLocation(location);
    setDraftLocationName('');
    setIsCreatingLocation(false);
  }

  async function handleSelectLocation(location: ClimbingLocation | null) {
    await onSelectLocation(location);
    closePicker();
  }

  return (
    <DismissibleModal onDismiss={closePicker} visible={visible}>
      <AppCard style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Session location</Text>
          <View style={styles.modalHeaderActions}>
            {onOpenLocationSettings ? (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Edit saved locations"
                accessibilityRole="button"
                onPress={onOpenLocationSettings}
                style={styles.closeButton}
              >
                <Feather name="edit-2" size={17} color={colors.charcoal} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close location picker"
              accessibilityRole="button"
              onPress={closePicker}
              style={styles.closeButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.locationPickerContent} showsVerticalScrollIndicator={false}>
          {isCreatingLocation ? (
            <>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Back to session locations"
                accessibilityRole="button"
                onPress={() => setIsCreatingLocation(false)}
                style={styles.backOption}
              >
                <Feather name="chevron-left" size={18} color={colors.charcoal} />
                <Text style={styles.backOptionText}>Session locations</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>Create new location</Text>
              <TextInput
                accessibilityLabel="Location name"
                onChangeText={setDraftLocationName}
                placeholder="Location name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={draftLocationName}
              />
              <View style={styles.typeGrid}>
                {locationTypes.map((type) => {
                  const selected = draftLocationType === type.value;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`Set location type to ${type.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={type.value}
                      onPress={() => setDraftLocationType(type.value)}
                      style={[styles.typeButton, selected && styles.selectedLocationOption]}
                    >
                      <Text style={styles.typeButtonText}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.formLabel}>Grade scale</Text>
              <View style={styles.gradeScaleList}>
                {gradeScaleOptions.map((scale) => {
                  const selected = draftLocationGradeScaleId === scale.id;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`Use ${scale.name}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={scale.id}
                      onPress={() => setDraftLocationGradeScaleId(scale.id)}
                      style={[styles.gradeScaleOption, selected && styles.selectedLocationOption]}
                    >
                      <Text style={styles.gradeScaleText}>{scale.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Create custom grade scale"
                  accessibilityRole="button"
                  onPress={onCreateCustomGradeScale}
                  style={[styles.gradeScaleOption, styles.createOption]}
                >
                  <Feather name="plus" size={18} color={colors.charcoal} />
                  <Text style={styles.gradeScaleText}>Create custom grade scale</Text>
                </TouchableOpacity>
              </View>
              <AppButton disabled={!draftLocationName.trim()} onPress={() => void handleCreateLocation()} title="Add Location" />
            </>
          ) : (
            <>
              {includeNoLocation ? (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Use no location"
                  accessibilityRole="button"
                  accessibilityState={{ selected: !selectedLocationId }}
                  onPress={() => void handleSelectLocation(null)}
                  style={[styles.locationOption, !selectedLocationId && styles.selectedLocationOption]}
                >
                  <View style={styles.locationCopy}>
                    <Text style={styles.locationName}>No location</Text>
                    <Text style={styles.locationDetail}>Keep this session unattached.</Text>
                  </View>
                  <Text style={styles.selectedText}>{!selectedLocationId ? 'Selected' : ''}</Text>
                </TouchableOpacity>
              ) : null}

              {locations.map((location) => {
                const selected = selectedLocationId === location.id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel={`Use ${location.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={location.id}
                    onPress={() => void handleSelectLocation(location)}
                    style={[styles.locationOption, selected && styles.selectedLocationOption]}
                  >
                    <View style={styles.locationCopy}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Text style={styles.locationDetail}>{getGradeScaleName(location.gradingScaleId)}</Text>
                    </View>
                    <Text style={styles.selectedText}>{selected ? 'Selected' : ''}</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Create new location"
                accessibilityRole="button"
                onPress={openCreateLocation}
                style={[styles.locationOption, styles.createOption]}
              >
                <Feather name="plus" size={18} color={colors.charcoal} />
                <Text style={styles.createOptionText}>Create new location</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </AppCard>
    </DismissibleModal>
  );
}

const styles = StyleSheet.create({
  backOption: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
  },
  backOptionText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
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
  createOption: {
    backgroundColor: 'transparent',
    borderColor: colors.muted,
    borderStyle: 'dotted',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  createOptionText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  formLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gradeScaleList: {
    gap: spacing.sm,
  },
  gradeScaleOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  gradeScaleText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
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
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  locationCopy: {
    flex: 1,
  },
  locationDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 2,
  },
  locationName: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '800',
  },
  locationOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    padding: spacing.md,
  },
  locationPickerContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  modalCard: {
    maxHeight: '100%',
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  selectedLocationOption: {
    backgroundColor: 'rgba(168,221,191,0.28)',
    borderColor: colors.mint,
  },
  selectedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  typeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  typeButtonText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
