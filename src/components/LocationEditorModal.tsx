import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import { ClimbingLocation, ClimbingLocationType } from '../domain/models';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { inputLimits, limitInput } from '../utils/inputValidation';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';

type LocationEditorModalProps = {
  defaultGradeScaleId?: string;
  editingLocation?: ClimbingLocation | null;
  isSelectedOnCreate?: boolean;
  onCreateCustomGradeScale?: () => void;
  onDismiss: () => void;
  onSaved?: (location: ClimbingLocation) => Promise<void> | void;
  visible: boolean;
};

const locationTypes: { label: string; value: ClimbingLocationType }[] = [
  { label: 'Gym', value: 'gym' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Other', value: 'other' },
];

export function getLocationTypeLabel(type: ClimbingLocationType) {
  return locationTypes.find((option) => option.value === type)?.label ?? 'Other';
}

export function LocationEditorModal({
  defaultGradeScaleId = 'v_scale',
  editingLocation = null,
  isSelectedOnCreate = false,
  onCreateCustomGradeScale,
  onDismiss,
  onSaved,
  visible,
}: LocationEditorModalProps) {
  const createLocation = useLocationStore((state) => state.createLocation);
  const isLoading = useLocationStore((state) => state.isLoading);
  const updateLocation = useLocationStore((state) => state.updateLocation);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const [draftGradeScaleId, setDraftGradeScaleId] = useState(defaultGradeScaleId);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState<ClimbingLocationType>('gym');

  useEffect(() => {
    if (!visible) {
      return;
    }

    void loadPreferences();
  }, [loadPreferences, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftGradeScaleId(editingLocation?.gradingScaleId ?? defaultGradeScaleId);
    setDraftName(editingLocation?.name ?? '');
    setDraftType(editingLocation?.type ?? 'gym');
  }, [defaultGradeScaleId, editingLocation?.gradingScaleId, editingLocation?.id, editingLocation?.name, editingLocation?.type, visible]);

  const gradeScaleOptions = useMemo(
    () => [
      ...builtInGradingScales.map((scale) => ({ id: scale.gradingScaleType, name: scale.gradingScaleName })),
      ...(preferences?.customScales ?? []).map((scale) => ({ id: scale.id, name: scale.name })),
    ],
    [preferences?.customScales],
  );
  const canSave = draftName.trim().length > 0 && Boolean(draftGradeScaleId);

  async function handleSaveLocation() {
    if (!canSave) {
      return;
    }

    const location = editingLocation
      ? await updateLocation(editingLocation.id, {
          gradingScaleId: draftGradeScaleId,
          name: draftName,
          type: draftType,
        })
      : await createLocation({
          gradingScaleId: draftGradeScaleId,
          isSelected: isSelectedOnCreate,
          name: draftName,
          type: draftType,
        });

    if (location) {
      await onSaved?.(location);
      onDismiss();
    }
  }

  return (
    <DismissibleModal onDismiss={onDismiss} visible={visible}>
      <AppCard style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <Text style={styles.editorTitle}>{editingLocation ? 'Edit location' : 'Add location'}</Text>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Close location editor"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.closeButton}
          >
            <Feather name="x" size={18} color={colors.charcoal} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Location name</Text>
          <TextInput
            accessibilityLabel="Location name"
            maxLength={inputLimits.locationName}
            onChangeText={(name) => setDraftName(limitInput(name, inputLimits.locationName))}
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
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.gradeScaleName}>{scale.name}</Text>
                  <Text style={styles.gradeScaleState}>{selected ? 'Selected' : ''}</Text>
                </TouchableOpacity>
              );
            })}
            {onCreateCustomGradeScale ? (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Create custom grade scale"
                accessibilityRole="button"
                onPress={onCreateCustomGradeScale}
                style={[styles.gradeScaleRow, styles.createOption]}
              >
                <View style={styles.createOptionCopy}>
                  <Feather name="plus" size={18} color={colors.charcoal} />
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.gradeScaleName}>Create custom grade scale</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.editorActions}>
            <AppButton disabled={!canSave || isLoading} onPress={() => void handleSaveLocation()} title={editingLocation ? 'Save Location' : 'Add Location'} />
          </View>
        </ScrollView>
      </AppCard>
    </DismissibleModal>
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
    justifyContent: 'flex-start',
  },
  createOptionCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
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
  gradeScaleName: {
    color: colors.charcoal,
    flex: 1,
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
    gap: spacing.md,
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
  optionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
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
  selectedOptionButton: {
    backgroundColor: 'rgba(168,221,191,0.28)',
    borderColor: colors.mint,
  },
});
