import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DismissibleModal } from '../components/DismissibleModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { ClimbingLocationType } from '../domain/models';
import { builtInGradingScales } from '../domain/gradeScales';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { useActiveSessionStore } from '../features/sessions';

const climbingGymImage = require('../assets/images/climbing-gym.png');
const locationTypes: { label: string; value: ClimbingLocationType }[] = [
  { label: 'Gym', value: 'gym' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Other', value: 'other' },
];

export function ClimbScreen() {
  const router = useRouter();
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const error = useActiveSessionStore((state) => state.error);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const startSession = useActiveSessionStore((state) => state.startSession);
  const createLocation = useLocationStore((state) => state.createLocation);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locationError = useLocationStore((state) => state.error);
  const locations = useLocationStore((state) => state.locations);
  const selectLocation = useLocationStore((state) => state.selectLocation);
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [draftLocationGradeScaleId, setDraftLocationGradeScaleId] = useState('v_scale');
  const [draftLocationName, setDraftLocationName] = useState('');
  const [draftLocationType, setDraftLocationType] = useState<ClimbingLocationType>('gym');
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);
  const hasActiveSession = Boolean(activeSession);

  useEffect(() => {
    void restoreActiveSession();
    void loadLocations();
    void loadPreferences();
  }, [loadLocations, loadPreferences, restoreActiveSession]);

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

  async function handleSessionAction() {
    if (hasActiveSession) {
      router.push('/session/active');
      return;
    }

    setIsConfirmVisible(true);
  }

  async function confirmStartSession(locationId: string | null | undefined = selectedLocation?.id) {
    await startSession({ locationId });
    setIsConfirmVisible(false);
    router.push('/session/active');
  }

  function openLocationPicker() {
    setIsCreatingLocation(false);
    setIsLocationPickerVisible(true);
  }

  function closeLocationPicker() {
    setIsCreatingLocation(false);
    setIsLocationPickerVisible(false);
  }

  function openCreateLocation() {
    setDraftLocationGradeScaleId(preferences?.selectedGradingScaleId ?? 'v_scale');
    setDraftLocationName('');
    setDraftLocationType('gym');
    setIsCreatingLocation(true);
  }

  function openCreateCustomGradeScale() {
    closeLocationPicker();
    router.push('/settings/climbing');
  }

  async function handleCreateLocation() {
    if (!draftLocationName.trim()) {
      return;
    }

    await createLocation({
      gradingScaleId: draftLocationGradeScaleId,
      isSelected: true,
      name: draftLocationName,
      type: draftLocationType,
    });
    setDraftLocationName('');
    setIsCreatingLocation(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Climb</Text>

      <View
        accessibilityLabel="Soft illustration of an indoor climbing gym wall"
        style={styles.hero}
      >
        <Image resizeMode="cover" source={climbingGymImage} style={styles.heroImage} />
      </View>

      <AppCard style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>Location</Text>
            <Text style={styles.locationName}>{selectedLocation?.name ?? 'No location selected'}</Text>
            <Text style={styles.locationDetail}>
              {selectedLocation
                ? `${selectedLocation.type === 'gym' ? 'Gym' : selectedLocation.type === 'outdoor' ? 'Outdoor' : 'Other'} - ${getGradeScaleName(selectedLocation.gradingScaleId)}`
                : 'Choose or add a place for this session.'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Change session location"
            accessibilityRole="button"
            onPress={openLocationPicker}
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>{selectedLocation ? 'Change' : 'Set'}</Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      <TouchableOpacity
        activeOpacity={0.86}
        accessibilityRole="button"
        disabled={isLoading}
        onPress={handleSessionAction}
        style={[styles.cta, isLoading && styles.ctaDisabled]}
      >
        <View style={styles.ctaLeft}>
          <Feather name={hasActiveSession ? 'play-circle' : 'triangle'} size={34} color={colors.white} />
          <Text style={styles.ctaText}>
            {isLoading ? (hasActiveSession ? 'Opening Session...' : 'Starting Session...') : hasActiveSession ? 'Back to Session' : 'Start New Session'}
          </Text>
        </View>
        <View style={styles.ctaArrow}>
          <Feather name="arrow-right" size={32} color={colors.charcoal} />
        </View>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

      <DismissibleModal onDismiss={() => setIsConfirmVisible(false)} visible={isConfirmVisible}>
          <AppCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start session here?</Text>
            <Text style={styles.modalCopy}>
              {selectedLocation
                ? `${selectedLocation.name} will be saved to this session.`
                : 'No location is selected. You can choose one now or start without a location.'}
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                disabled={isLoading}
                icon="triangle"
                onPress={() => void confirmStartSession(selectedLocation?.id ?? null)}
                title={selectedLocation ? 'Start Session' : 'Start Without Location'}
              />
              <AppButton
                icon="map-pin"
                onPress={() => {
                  setIsConfirmVisible(false);
                  openLocationPicker();
                }}
                title={selectedLocation ? 'Change Location' : 'Choose Location'}
                variant="secondary"
              />
              <AppButton icon="x" onPress={() => setIsConfirmVisible(false)} title="Cancel" variant="secondary" />
            </View>
          </AppCard>
      </DismissibleModal>

      <DismissibleModal onDismiss={closeLocationPicker} visible={isLocationPickerVisible}>
          <AppCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session location</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Edit saved locations"
                  accessibilityRole="button"
                  onPress={() => {
                    closeLocationPicker();
                    router.push('/settings/locations');
                  }}
                  style={styles.closeButton}
                >
                  <Feather name="edit-2" size={17} color={colors.charcoal} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Close location picker"
                  accessibilityRole="button"
                  onPress={closeLocationPicker}
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
                      onPress={openCreateCustomGradeScale}
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
                  {locations.map((location) => {
                    const selected = selectedLocation?.id === location.id;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Use ${location.name}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={location.id}
                        onPress={() => {
                          void selectLocation(location.id);
                          closeLocationPicker();
                        }}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 24,
    elevation: 3,
    flexDirection: 'row',
    height: 88,
    justifyContent: 'space-between',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
  },
  ctaArrow: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  ctaDisabled: {
    opacity: 0.66,
  },
  ctaLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  ctaText: {
    color: colors.white,
    flex: 1,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  errorText: {
    color: '#B85A3B',
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  gradeScaleText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  hero: {
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 170,
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
    overflow: 'hidden',
    width: '100%',
  },
  heroImage: {
    height: '106%',
    left: '-3%',
    position: 'absolute',
    top: '-3%',
    width: '106%',
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
  locationButton: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '800',
  },
  locationCard: {
    marginBottom: spacing.lg,
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
    lineHeight: 18,
    marginTop: 2,
  },
  locationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  locationLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  modalActions: {
    gap: spacing.md,
  },
  modalCard: {
    maxHeight: '100%',
    padding: spacing.lg,
    width: '100%',
  },
  modalCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: spacing.lg,
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
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
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
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  typeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
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
