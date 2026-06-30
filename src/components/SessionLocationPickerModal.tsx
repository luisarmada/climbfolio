import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import { ClimbingLocation } from '../domain/models';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';
import { getLocationTypeLabel as getSharedLocationTypeLabel, LocationEditorModal } from './LocationEditorModal';

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

export const getLocationTypeLabel = getSharedLocationTypeLabel;

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
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [isLocationEditorVisible, setIsLocationEditorVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsLocationEditorVisible(false);
      return;
    }

    void loadLocations();
    void loadPreferences();
  }, [loadLocations, loadPreferences, visible]);

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
    setIsLocationEditorVisible(false);
    onDismiss();
  }

  function openCreateLocation() {
    setIsLocationEditorVisible(true);
  }

  async function handleSelectLocation(location: ClimbingLocation | null) {
    await onSelectLocation(location);
    closePicker();
  }

  return (
    <>
      <DismissibleModal onDismiss={closePicker} visible={visible && !isLocationEditorVisible}>
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
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationName}>No location</Text>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationDetail}>Keep this session unattached.</Text>
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
                    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationName}>{location.name}</Text>
                    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationDetail}>{getGradeScaleName(location.gradingScaleId)}</Text>
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
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.createOptionText}>Create new location</Text>
            </TouchableOpacity>
          </ScrollView>
        </AppCard>
      </DismissibleModal>

      <LocationEditorModal
        defaultGradeScaleId={preferences?.selectedGradingScaleId ?? 'v_scale'}
        isSelectedOnCreate={createLocationSelectsDefault}
        onCreateCustomGradeScale={onCreateCustomGradeScale}
        onDismiss={() => setIsLocationEditorVisible(false)}
        onSaved={async (location) => {
          await onSelectLocation(location);
          closePicker();
        }}
        visible={visible && isLocationEditorVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
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
    minWidth: 58,
    textAlign: 'right',
  },
});
