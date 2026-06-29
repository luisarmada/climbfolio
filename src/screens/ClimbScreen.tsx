import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DismissibleModal } from '../components/DismissibleModal';
import { SessionLocationPickerModal } from '../components/SessionLocationPickerModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { useActiveSessionStore } from '../features/sessions';

const climbingGymImage = require('../assets/images/climbing-gym.png');

export function ClimbScreen() {
  const router = useRouter();
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const error = useActiveSessionStore((state) => state.error);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const startSession = useActiveSessionStore((state) => state.startSession);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locationError = useLocationStore((state) => state.error);
  const selectLocation = useLocationStore((state) => state.selectLocation);
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);
  const hasActiveSession = Boolean(activeSession);

  useEffect(() => {
    void restoreActiveSession();
    void loadLocations();
    void loadPreferences();
  }, [loadLocations, loadPreferences, restoreActiveSession]);

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
    setIsLocationPickerVisible(true);
  }

  function closeLocationPicker() {
    setIsLocationPickerVisible(false);
  }

  function openCreateCustomGradeScale() {
    closeLocationPicker();
    router.push('/settings/climbing');
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start session here?</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close session confirmation"
                accessibilityRole="button"
                onPress={() => setIsConfirmVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
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
            </View>
          </AppCard>
      </DismissibleModal>

      <SessionLocationPickerModal
        createLocationSelectsDefault
        onCreateCustomGradeScale={openCreateCustomGradeScale}
        onDismiss={closeLocationPicker}
        onOpenLocationSettings={() => {
          closeLocationPicker();
          router.push('/settings/locations');
        }}
        onSelectLocation={async (location) => {
          await selectLocation(location?.id ?? null);
        }}
        selectedLocationId={selectedLocation?.id ?? null}
        visible={isLocationPickerVisible}
      />
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
  modalTitle: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
});
