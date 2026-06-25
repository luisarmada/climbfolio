import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DismissibleModal } from '../components/DismissibleModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import {
  CustomGradingScale,
  VGradeRange,
  builtInGradingScales,
  formatVGradeRange,
  normalizeCustomGrades,
  normalizeCustomScales,
  normalizeVGradeRange,
  resolveSelectedGradingScale,
  vScaleGrades,
} from '../domain/gradeScales';
import { climbColours } from '../features/climbs';
import { useClimbingPreferencesStore } from '../features/preferences';

function createCustomScaleId() {
  return `custom_${Date.now()}`;
}

function moveItem(items: string[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (!item) {
    return items;
  }

  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function createDefaultVGradeRanges(grades: string[]) {
  return grades.reduce<Record<string, VGradeRange>>((ranges, grade, index) => {
    const vGrade = vScaleGrades[Math.min(index + 1, vScaleGrades.length - 1)] ?? 'V0';
    ranges[grade] = { min: vGrade, max: vGrade };
    return ranges;
  }, {});
}

export function ClimbingPreferencesScreen() {
  const router = useRouter();
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const updatePreferences = useClimbingPreferencesStore((state) => state.updatePreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const isLoading = useClimbingPreferencesStore((state) => state.isLoading);
  const error = useClimbingPreferencesStore((state) => state.error);
  const [customScales, setCustomScales] = useState<CustomGradingScale[]>([]);
  const [draftGrade, setDraftGrade] = useState('');
  const [draftGrades, setDraftGrades] = useState<string[]>([]);
  const [draftIsTape, setDraftIsTape] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftVGradeRanges, setDraftVGradeRanges] = useState<Record<string, VGradeRange>>({});
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [selectedGradingScaleId, setSelectedGradingScaleId] = useState('v_scale');

  useEffect(() => {
    let isMounted = true;

    async function hydratePreferences() {
      const nextPreferences = await loadPreferences();

      if (isMounted) {
        setCustomScales(nextPreferences.customScales);
        setSelectedGradingScaleId(nextPreferences.selectedGradingScaleId);
      }
    }

    void hydratePreferences();

    return () => {
      isMounted = false;
    };
  }, [loadPreferences]);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setCustomScales(preferences.customScales);
    setSelectedGradingScaleId(preferences.selectedGradingScaleId);
  }, [preferences]);

  const selectedScale = useMemo(
    () =>
      resolveSelectedGradingScale({
        customScales,
        selectedGradingScaleId,
      }),
    [customScales, selectedGradingScaleId],
  );
  const normalizedDraftGrades = normalizeCustomGrades(draftGrades);
  const canSaveDraft = draftName.trim().length > 0 && normalizedDraftGrades.length > 0;

  function openCreateEditor() {
    const defaultGrades = ['Yellow', 'Green', 'Blue', 'Red'];
    setDraftGrade('');
    setDraftGrades(defaultGrades);
    setDraftIsTape(false);
    setDraftName('');
    setDraftVGradeRanges(createDefaultVGradeRanges(defaultGrades));
    setEditingScaleId(null);
    setIsEditorVisible(true);
  }

  function openEditEditor(scale: CustomGradingScale) {
    setDraftGrade('');
    setDraftGrades(scale.grades);
    setDraftIsTape(Boolean(scale.isTape));
    setDraftName(scale.name);
    setDraftVGradeRanges(scale.vGradeRanges);
    setEditingScaleId(scale.id);
    setIsEditorVisible(true);
  }

  function handleAddDraftGrade() {
    const nextGrades = normalizeCustomGrades([...draftGrades, draftGrade]);

    if (nextGrades.length === draftGrades.length) {
      return;
    }

    setDraftGrades(nextGrades);
    const nextGrade = draftGrade.trim();
    setDraftVGradeRanges((ranges) => ({
      ...ranges,
      [nextGrade]: normalizeVGradeRange(ranges[nextGrade], vScaleGrades[Math.min(nextGrades.length, vScaleGrades.length - 1)] ?? 'V0'),
    }));
    setDraftGrade('');
  }

  function toggleDraftIsTape() {
    setDraftIsTape((current) => {
      const nextIsTape = !current;

      if (nextIsTape) {
        const colourLabels = climbColours.map((colour) => colour.label);
        const nextGrades = draftGrades.filter((grade) => colourLabels.includes(grade));
        setDraftGrades(nextGrades);
        setDraftVGradeRanges(createDefaultVGradeRanges(nextGrades));
        setDraftGrade('');
      }

      return nextIsTape;
    });
  }

  function toggleTapeGrade(grade: string) {
    const selected = draftGrades.includes(grade);
    const nextGrades = selected ? draftGrades.filter((item) => item !== grade) : [...draftGrades, grade];

    setDraftGrades(nextGrades);
    setDraftVGradeRanges((ranges) => {
      const nextRanges = { ...ranges };

      if (selected) {
        delete nextRanges[grade];
        return nextRanges;
      }

      nextRanges[grade] = normalizeVGradeRange(ranges[grade], vScaleGrades[Math.min(nextGrades.length, vScaleGrades.length - 1)] ?? 'V0');
      return nextRanges;
    });
  }

  function updateDraftVRange(grade: string, side: keyof VGradeRange, direction: -1 | 1) {
    setDraftVGradeRanges((ranges) => {
      const currentRange = normalizeVGradeRange(ranges[grade]);
      const currentIndex = vScaleGrades.indexOf(currentRange[side]);
      const nextGrade = vScaleGrades[Math.max(0, Math.min(vScaleGrades.length - 1, currentIndex + direction))] ?? currentRange[side];
      return {
        ...ranges,
        [grade]: normalizeVGradeRange({ ...currentRange, [side]: nextGrade }),
      };
    });
  }

  function removeDraftGrade(grade: string, index: number) {
    setDraftGrades(draftGrades.filter((_, itemIndex) => itemIndex !== index));
    setDraftVGradeRanges((ranges) => {
      const nextRanges = { ...ranges };
      delete nextRanges[grade];
      return nextRanges;
    });
  }

  function handleSaveDraft() {
    if (!canSaveDraft) {
      return;
    }

    const nextScale = {
      grades: normalizedDraftGrades,
      id: editingScaleId ?? createCustomScaleId(),
      isTape: draftIsTape,
      name: draftName.trim(),
      vGradeRanges: normalizedDraftGrades.reduce<Record<string, VGradeRange>>((ranges, grade) => {
        ranges[grade] = normalizeVGradeRange(draftVGradeRanges[grade]);
        return ranges;
      }, {}),
    };
    const nextScales = normalizeCustomScales(
      editingScaleId
        ? customScales.map((scale) => (scale.id === editingScaleId ? nextScale : scale))
        : [...customScales, nextScale],
    );

    setCustomScales(nextScales);
    setSelectedGradingScaleId(nextScale.id);
    setSavedMessage(null);
    setIsEditorVisible(false);
  }

  function removeCustomScale(scaleId: string) {
    const nextScales = customScales.filter((scale) => scale.id !== scaleId);
    setCustomScales(nextScales);

    if (selectedGradingScaleId === scaleId) {
      setSelectedGradingScaleId('v_scale');
    }

    setSavedMessage(null);
  }

  async function handleSave() {
    await updatePreferences({
      customScales,
      selectedGradingScaleId,
    });
    setSavedMessage('Saved locally');
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
          <Text style={styles.title}>Grade scales</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default grade scale</Text>
        <Text style={styles.sectionCopy}>New sessions use this scale unless their selected location has its own mapping.</Text>
        <AppCard style={styles.toggleCard}>
          {builtInGradingScales.map((option, index) => {
            const selected = selectedGradingScaleId === option.gradingScaleType;

            return (
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel={`Use ${option.gradingScaleName} grading`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.gradingScaleType}
                onPress={() => {
                  setSelectedGradingScaleId(option.gradingScaleType);
                  setSavedMessage(null);
                }}
                style={[styles.choiceRow, index === builtInGradingScales.length - 1 && styles.lastChoiceRow, selected && styles.selectedChoiceRow]}
              >
                <View style={styles.choiceCopy}>
                  <Text style={styles.choiceTitle}>{option.gradingScaleName}</Text>
                  <Text style={styles.choiceDetail}>
                    {option.gradingScaleType === 'font' ? 'Fontainebleau-style bouldering grades.' : 'Classic bouldering grades.'}
                  </Text>
                </View>
                <Text style={styles.choiceValue}>{selected ? 'Selected' : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Custom scales</Text>
            <Text style={styles.sectionCopy}>Create gym-specific grading systems, then select one for new sessions.</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Create new custom scale"
            accessibilityRole="button"
            onPress={openCreateEditor}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customScaleList}>
          {customScales.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No custom scales yet</Text>
              <Text style={styles.emptyCopy}>Add one for tape, chilli, colour circuits, or a gym-specific grade ladder.</Text>
            </AppCard>
          ) : null}

          {customScales.map((scale) => {
            const selected = selectedGradingScaleId === scale.id;

            return (
              <AppCard key={scale.id} style={[styles.customScaleCard, selected && styles.selectedCustomScaleCard]}>
                <View style={styles.customScaleTopRow}>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>{scale.name}</Text>
                    <Text style={styles.choiceDetail}>{scale.grades.length} grades, easiest to hardest.</Text>
                  </View>
                  <Text style={styles.choiceValue}>{selected ? 'Selected' : ''}</Text>
                </View>
                <View style={styles.gradeWrap}>
                  {scale.grades.map((grade) => (
                    <View key={grade} style={styles.gradePill}>
                      <Text style={styles.gradePillText}>{grade}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardActions}>
                  <AppButton
                    disabled={selected}
                    onPress={() => {
                      setSelectedGradingScaleId(scale.id);
                      setSavedMessage(null);
                    }}
                    style={styles.cardActionButton}
                    title={selected ? 'Selected' : 'Use Scale'}
                    variant="secondary"
                  />
                  <AppButton onPress={() => openEditEditor(scale)} style={styles.cardActionButton} title="Edit" variant="secondary" />
                  <AppButton onPress={() => removeCustomScale(scale.id)} style={styles.cardActionButton} title="Remove" variant="destructive" />
                </View>
              </AppCard>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scale preview</Text>
        <Text style={styles.sectionCopy}>{selectedScale.gradingScaleName}, easiest to hardest.</Text>
        <AppCard style={styles.previewCard}>
          <View style={styles.gradeWrap}>
            {selectedScale.gradingScaleGrades.map((grade) => (
              <View key={grade} style={styles.gradePill}>
                <Text style={styles.gradePillText}>{grade}</Text>
              </View>
            ))}
          </View>
        </AppCard>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}

      <View style={styles.saveAction}>
        <AppButton disabled={isLoading} onPress={handleSave} title={isLoading ? 'Saving...' : 'Save Preferences'} />
      </View>

      <DismissibleModal onDismiss={() => setIsEditorVisible(false)} visible={isEditorVisible}>
          <AppCard style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>{editingScaleId ? 'Edit custom scale' : 'Create custom scale'}</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close custom scale editor"
                accessibilityRole="button"
                onPress={() => setIsEditorVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                accessibilityLabel="Custom grading scale name"
                onChangeText={setDraftName}
                placeholder="Tape, Chilli, Circuit..."
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={draftName}
              />

              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Use tape grading system"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draftIsTape }}
                onPress={toggleDraftIsTape}
                style={[styles.tapeToggle, draftIsTape && styles.selectedChoiceRow]}
              >
                <View style={[styles.checkbox, draftIsTape && styles.checkedBox]}>
                  {draftIsTape ? <Feather name="check" size={14} color={colors.charcoal} /> : null}
                </View>
                <View style={styles.choiceCopy}>
                  <Text style={styles.choiceTitle}>Tape grading system</Text>
                  <Text style={styles.choiceDetail}>Use hold colours as grade names.</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{draftIsTape ? 'Tape colours' : 'Add grade'}</Text>
              {draftIsTape ? (
                <View style={styles.tapeColourGrid}>
                  {climbColours.map((climbColour) => {
                    const selected = draftGrades.includes(climbColour.label);

                    return (
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Toggle ${climbColour.label} tape grade`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={climbColour.label}
                        onPress={() => toggleTapeGrade(climbColour.label)}
                        style={[styles.tapeColourOption, selected && styles.selectedChoiceRow]}
                      >
                        <View style={[styles.tapeColourDot, { backgroundColor: climbColour.value }]} />
                        <Text style={styles.tapeColourText}>{climbColour.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.addRow}>
                  <TextInput
                    accessibilityLabel="New custom grade"
                    onChangeText={setDraftGrade}
                    onSubmitEditing={handleAddDraftGrade}
                    placeholder="e.g. Red, Hot, Level 4"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.addInput]}
                    value={draftGrade}
                  />
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel="Add custom grade"
                    accessibilityRole="button"
                    onPress={handleAddDraftGrade}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.gradeList}>
                {draftGrades.map((grade, index) => (
                  <View key={`${grade}-${index}`} style={styles.gradeRow}>
                    <View style={styles.gradeMainRow}>
                      <View style={styles.gradeOrder}>
                        <Text style={styles.gradeOrderText}>{index + 1}</Text>
                      </View>
                      <View style={styles.gradeNameBlock}>
                        <View style={styles.gradeNameRow}>
                          {draftIsTape ? (
                            <View
                              style={[
                                styles.tapeGradeDot,
                                { backgroundColor: climbColours.find((climbColour) => climbColour.label === grade)?.value ?? colors.stone },
                              ]}
                            />
                          ) : null}
                          <Text style={styles.gradeName}>{grade}</Text>
                        </View>
                        <Text style={styles.gradeRangeText}>Badge value {formatVGradeRange(normalizeVGradeRange(draftVGradeRanges[grade]))}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Move ${grade} easier`}
                        accessibilityRole="button"
                        disabled={index === 0}
                        onPress={() => setDraftGrades(moveItem(draftGrades, index, index - 1))}
                        style={[styles.smallAction, index === 0 && styles.disabledSmallAction]}
                      >
                        <Text style={styles.smallActionText}>Up</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Move ${grade} harder`}
                        accessibilityRole="button"
                        disabled={index === draftGrades.length - 1}
                        onPress={() => setDraftGrades(moveItem(draftGrades, index, index + 1))}
                        style={[styles.smallAction, index === draftGrades.length - 1 && styles.disabledSmallAction]}
                      >
                        <Text style={styles.smallActionText}>Down</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.rangeEditor}>
                      <Text style={styles.rangeLabel}>From</Text>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Decrease ${grade} lower V grade`}
                        accessibilityRole="button"
                        onPress={() => updateDraftVRange(grade, 'min', -1)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.rangeValue}>{normalizeVGradeRange(draftVGradeRanges[grade]).min}</Text>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Increase ${grade} lower V grade`}
                        accessibilityRole="button"
                        onPress={() => updateDraftVRange(grade, 'min', 1)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>+</Text>
                      </TouchableOpacity>
                      <Text style={styles.rangeLabel}>To</Text>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Decrease ${grade} upper V grade`}
                        accessibilityRole="button"
                        onPress={() => updateDraftVRange(grade, 'max', -1)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.rangeValue}>{normalizeVGradeRange(draftVGradeRanges[grade]).max}</Text>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Increase ${grade} upper V grade`}
                        accessibilityRole="button"
                        onPress={() => updateDraftVRange(grade, 'max', 1)}
                        style={styles.smallAction}
                      >
                        <Text style={styles.smallActionText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Remove ${grade}`}
                        accessibilityRole="button"
                        onPress={() => removeDraftGrade(grade, index)}
                        style={styles.removeAction}
                      >
                        <Text style={styles.removeActionText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {draftGrades.length === 0 ? <Text style={styles.emptyText}>Add at least one grade before saving.</Text> : null}

              <View style={styles.editorActions}>
                <AppButton disabled={!canSaveDraft} onPress={handleSaveDraft} title={editingScaleId ? 'Save Scale' : 'Create Scale'} />
                <AppButton onPress={() => setIsEditorVisible(false)} title="Cancel" variant="secondary" />
              </View>
            </ScrollView>
          </AppCard>
      </DismissibleModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  addButtonText: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
  },
  addInput: {
    flex: 1,
  },
  addRow: {
    alignItems: 'center',
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
  cardActionButton: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 2,
  },
  choiceRow: {
    alignItems: 'center',
    borderBottomColor: colors.stone,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  choiceTitle: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  choiceValue: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkedBox: {
    backgroundColor: colors.amber,
    borderColor: colors.charcoal,
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
  customScaleCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  customScaleList: {
    gap: spacing.md,
  },
  customScaleTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  disabledSmallAction: {
    opacity: 0.36,
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
  emptyText: {
    color: colors.coral,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
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
    marginVertical: spacing.md,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gradeList: {
    gap: spacing.sm,
  },
  gradeMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  gradeName: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  gradeNameBlock: {
    flex: 1,
  },
  gradeNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  gradeOrder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  gradeOrderText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  gradePill: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gradePillText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  gradeRangeText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  gradeRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 58,
    padding: spacing.sm,
  },
  gradeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  lastChoiceRow: {
    borderBottomWidth: 0,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  previewCard: {
    padding: spacing.lg,
  },
  removeAction: {
    backgroundColor: 'rgba(255,150,102,0.18)',
    borderColor: colors.coral,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeActionText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  rangeEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    width: '100%',
  },
  rangeLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  rangeValue: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 38,
    textAlign: 'center',
  },
  savedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: spacing.md,
  },
  saveAction: {
    marginTop: spacing.xl,
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
  selectedChoiceRow: {
    backgroundColor: 'rgba(168,221,191,0.28)',
  },
  selectedCustomScaleCard: {
    backgroundColor: 'rgba(168,221,191,0.2)',
    borderColor: colors.mint,
  },
  smallAction: {
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  smallActionText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  tapeColourDot: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  tapeColourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tapeColourOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  tapeColourText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  tapeGradeDot: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  tapeToggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  titleBlock: {
    flex: 1,
  },
  toggleCard: {
    overflow: 'hidden',
    paddingVertical: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
