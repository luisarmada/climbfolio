import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../design/tokens';
import { GradingScaleSnapshot, builtInGradingScales, formatEstimatedVGradeAverage, vScaleGrades } from '../domain/gradeScales';
import { Session } from '../domain/models';
import { climbColours } from '../features/climbs';
import { useClimbingPreferencesStore } from '../features/preferences';
import { useActiveSessionStore } from '../features/sessions';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';

type NewClimbDraft = {
  colours: string[];
  grade: string;
};

type NewClimbPickerModalProps = {
  onDismiss: () => void;
  visible: boolean;
};

type GradeScaleOption = {
  key: string;
  label: string;
  scale: GradingScaleSnapshot;
};

const sessionDefaultScaleKey = 'session_default';

function stringifyColours(colours: string[]) {
  return colours.join(', ');
}

function getGradeColourValue(grade: string) {
  return climbColours.find((climbColour) => climbColour.label === grade)?.value;
}

function scaleIdentity(scale: Pick<GradingScaleSnapshot, 'gradingScaleName' | 'gradingScaleType'>) {
  return `${scale.gradingScaleType}:${scale.gradingScaleName.trim().toLocaleLowerCase()}`;
}

function getSessionScale(activeSession: Session): GradingScaleSnapshot {
  return {
    gradingScaleGrades: activeSession.gradingScaleGrades,
    gradingScaleIsTape: activeSession.gradingScaleIsTape,
    gradingScaleName: activeSession.gradingScaleName,
    gradingScaleType: activeSession.gradingScaleType,
    gradingScaleVGradeRanges: activeSession.gradingScaleVGradeRanges,
  };
}

export function NewClimbPickerModal({ onDismiss, visible }: NewClimbPickerModalProps) {
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const startClimb = useActiveSessionStore((state) => state.startClimb);
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const gradeScaleOptions = useMemo<GradeScaleOption[]>(() => {
    const sessionScale = activeSession ? getSessionScale(activeSession) : builtInGradingScales[0]!;
    const sessionIdentity = scaleIdentity(sessionScale);
    const otherOptions: GradeScaleOption[] = [
      ...builtInGradingScales.map((scale) => ({
        key: `built_in:${scale.gradingScaleType}`,
        label: scale.gradingScaleName,
        scale,
      })),
      ...(preferences?.customScales ?? []).map((scale) => ({
        key: `custom:${scale.id}`,
        label: scale.name,
        scale: {
          gradingScaleGrades: scale.grades,
          gradingScaleIsTape: Boolean(scale.isTape),
          gradingScaleName: scale.name,
          gradingScaleType: 'custom' as const,
          gradingScaleVGradeRanges: scale.vGradeRanges,
        },
      })),
    ].filter((option) => scaleIdentity(option.scale) !== sessionIdentity);

    return [
      {
        key: sessionDefaultScaleKey,
        label: sessionScale.gradingScaleName,
        scale: sessionScale,
      },
      ...otherOptions,
    ];
  }, [activeSession, preferences?.customScales]);
  const [selectedScaleKey, setSelectedScaleKey] = useState(sessionDefaultScaleKey);
  const selectedScale = gradeScaleOptions.find((option) => option.key === selectedScaleKey)?.scale ?? gradeScaleOptions[0]?.scale ?? builtInGradingScales[0]!;
  const selectedGradeOptions = selectedScale.gradingScaleGrades.length ? selectedScale.gradingScaleGrades : vScaleGrades;
  const selectedScaleIsTape = Boolean(selectedScale.gradingScaleIsTape);
  const [newClimbDraft, setNewClimbDraft] = useState<NewClimbDraft>({ colours: [], grade: selectedGradeOptions[0] ?? 'V0' });
  const [gradeTypePickerExpanded, setGradeTypePickerExpanded] = useState(false);
  const newClimbGradeIndex = Math.max(0, selectedGradeOptions.indexOf(newClimbDraft.grade));
  const canStartNewClimb = Boolean(activeSession && !activeClimb && newClimbDraft.grade);

  useEffect(() => {
    if (visible) {
      void loadPreferences();
    }
  }, [loadPreferences, visible]);

  useEffect(() => {
    const firstGrade = selectedGradeOptions[0] ?? 'V0';

    if (!selectedGradeOptions.includes(newClimbDraft.grade)) {
      setNewClimbDraft((draft) => ({ ...draft, grade: firstGrade }));
    }
  }, [newClimbDraft.grade, selectedGradeOptions]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedScaleKey(sessionDefaultScaleKey);
    setGradeTypePickerExpanded(false);
    setNewClimbDraft({ colours: [], grade: gradeScaleOptions[0]?.scale.gradingScaleGrades[0] ?? 'V0' });
  }, [gradeScaleOptions, visible]);

  function toggleNewClimbColour(colour: string) {
    setNewClimbDraft((draft) => {
      const nextColours = draft.colours.includes(colour)
        ? draft.colours.filter((item) => item !== colour)
        : [...draft.colours, colour].slice(0, 2);

      return { ...draft, colours: nextColours };
    });
  }

  async function confirmAddNewClimb() {
    if (!canStartNewClimb) {
      return;
    }

    await startClimb({
      colour: newClimbDraft.colours.length > 0 ? stringifyColours(newClimbDraft.colours) : null,
      grade: newClimbDraft.grade,
      gradingScaleGrades: selectedGradeOptions,
      gradingScaleIsTape: selectedScaleIsTape,
      gradingScaleName: selectedScale.gradingScaleName,
      gradingScaleType: selectedScale.gradingScaleType,
      gradingScaleVGradeRanges: selectedScale.gradingScaleVGradeRanges,
      holdTypes: [],
    });
    onDismiss();
  }

  return (
    <DismissibleModal onDismiss={onDismiss} visible={visible}>
      <AppCard style={styles.editCard}>
        <View style={styles.editHeader}>
          <Text style={styles.confirmTitle}>Add new climb</Text>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Close new climb options"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.editCloseButton}
          >
            <Feather name="x" size={18} color={colors.charcoal} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.editContent}>
          <View style={styles.gradeHeaderRow}>
            <Text style={styles.editLabel}>Grade</Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Change grade type for this climb"
              accessibilityRole="button"
              accessibilityState={{ expanded: gradeTypePickerExpanded }}
              onPress={() => setGradeTypePickerExpanded((expanded) => !expanded)}
              style={styles.changeGradeTypeButton}
            >
              <Text style={styles.changeGradeTypeText}>Change grade type</Text>
              <Feather name={gradeTypePickerExpanded ? 'chevron-up' : 'chevron-right'} size={15} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {selectedScaleIsTape ? (
            <View style={styles.tapeGradeGrid}>
              {selectedGradeOptions.map((grade) => {
                const selected = newClimbDraft.grade === grade;

                return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel={`Select ${grade} tape grade`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={grade}
                    onPress={() => setNewClimbDraft({ ...newClimbDraft, grade })}
                    style={[styles.tapeGradeOption, selected && styles.selectedEditOption]}
                  >
                    <View style={[styles.tapeGradeDotLarge, { backgroundColor: getGradeColourValue(grade) ?? colors.stone }]} />
                    <Text style={styles.tapeGradeOptionText}>{grade}</Text>
                    <Text style={styles.tapeGradeOptionEstimate}>
                      Est. {formatEstimatedVGradeAverage(grade, selectedScale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.newClimbGradeSelector}>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Decrease new climb grade"
                accessibilityRole="button"
                disabled={newClimbGradeIndex === 0}
                onPress={() =>
                  setNewClimbDraft({
                    ...newClimbDraft,
                    grade: selectedGradeOptions[Math.max(0, newClimbGradeIndex - 1)] ?? newClimbDraft.grade,
                  })
                }
                style={[styles.newClimbGradeButton, newClimbGradeIndex === 0 && styles.disabledStepperButton]}
              >
                <Feather name="minus" size={18} color="#B85A3B" />
              </TouchableOpacity>
              <View style={styles.newClimbGradeValueWrap}>
                <Text style={styles.newClimbGradeValue}>{newClimbDraft.grade}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Increase new climb grade"
                accessibilityRole="button"
                disabled={newClimbGradeIndex === selectedGradeOptions.length - 1}
                onPress={() =>
                  setNewClimbDraft({
                    ...newClimbDraft,
                    grade: selectedGradeOptions[Math.min(selectedGradeOptions.length - 1, newClimbGradeIndex + 1)] ?? newClimbDraft.grade,
                  })
                }
                style={[styles.newClimbGradeButton, newClimbGradeIndex === selectedGradeOptions.length - 1 && styles.disabledStepperButton]}
              >
                <Feather name="plus" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
          )}
          {gradeTypePickerExpanded ? (
            <View style={styles.gradeTypeList}>
              {gradeScaleOptions.map((option) => {
                const selected = selectedScaleKey === option.key;

                return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel={`Use ${option.label} for this climb`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => {
                      setSelectedScaleKey(option.key);
                      setNewClimbDraft((draft) => ({ ...draft, grade: option.scale.gradingScaleGrades[0] ?? draft.grade }));
                    }}
                  style={[styles.gradeTypeOption, selected && styles.selectedEditOption]}
                >
                  <View>
                    <Text style={styles.gradeTypeName}>{option.label}</Text>
                  </View>
                  {selected ? <Feather name="check" size={18} color={colors.charcoal} /> : null}
                </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.editLabel}>Hold colour</Text>
          <Text style={styles.activePreferenceHint}>Optional.</Text>
          <View style={styles.editOptionWrap}>
            {climbColours.map((climbColour) => {
              const selected = newClimbDraft.colours.includes(climbColour.label);
              const disabled = !selected && newClimbDraft.colours.length >= 2;

              return (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel={`Toggle ${climbColour.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={disabled}
                  key={climbColour.label}
                  onPress={() => toggleNewClimbColour(climbColour.label)}
                  style={[styles.editOption, selected && styles.selectedEditOption, disabled && styles.disabledEditOption]}
                >
                  <View style={[styles.colourDot, { backgroundColor: climbColour.value }]} />
                  <Text style={styles.editOptionText}>{climbColour.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.confirmActions}>
            <AppButton
              disabled={isLoading || !canStartNewClimb}
              icon="plus"
              onPress={() => void confirmAddNewClimb()}
              title={isLoading ? 'Adding Climb...' : 'Start Climb'}
            />
          </View>
        </ScrollView>
      </AppCard>
    </DismissibleModal>
  );
}

const styles = StyleSheet.create({
  activePreferenceHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: -spacing.xs,
  },
  colourDot: {
    borderColor: 'rgba(30,30,30,0.16)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  changeGradeTypeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  changeGradeTypeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  confirmActions: {
    gap: spacing.md,
  },
  confirmTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  disabledEditOption: {
    opacity: 0.42,
  },
  disabledStepperButton: {
    opacity: 0.36,
  },
  editCard: {
    maxHeight: '100%',
    maxWidth: 460,
    padding: spacing.lg,
    width: '100%',
  },
  editCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  editContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  editHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  editLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  editOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editOptionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  editOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gradeTypeList: {
    gap: spacing.sm,
  },
  gradeHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradeTypeMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  gradeTypeName: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  gradeTypeOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newClimbGradeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  newClimbGradeSelector: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 72,
    padding: spacing.md,
  },
  newClimbGradeValue: {
    color: colors.charcoal,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  newClimbGradeValueWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  selectedEditOption: {
    backgroundColor: colors.mint,
    borderColor: colors.charcoal,
  },
  tapeGradeDotLarge: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 22,
    width: 22,
  },
  tapeGradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tapeGradeOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 78,
    minWidth: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tapeGradeOptionEstimate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  tapeGradeOptionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
