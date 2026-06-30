import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { DismissibleModal } from '../components/DismissibleModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import {
  CollectionCell,
  CollectionGoalTarget,
  allLocationsFilterId,
  buildCollectionRows,
  buildCollectionScaleOptions,
  buildDisplayRows,
  buildTriedGoalTargets,
  countCollectedCells,
  countFeaturesCovered,
  countTriedGapCells,
  filterCollectionSummaries,
  getCellState,
  getPreferredCollectionScaleKey,
  isBestSentCell,
} from '../features/collections';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import { SessionSummary, sessionSummaryService } from '../features/summaries';

const fallbackScaleOption = {
  key: 'v_scale',
  label: 'V Scale',
  scale: builtInGradingScales[0]!,
};

const matrixCellSize = 44;

function formatCellAccessibility(feature: string, grade: string, cell: CollectionCell) {
  if (cell.sentSessionIds.length > 0) {
    return `${feature}, ${grade}, ${cell.sentSessionIds.length} sent sessions`;
  }

  if (cell.triedSessionIds.length > 0) {
    return `${feature}, ${grade}, set tried goal`;
  }

  return `${feature}, ${grade}, set open goal`;
}

function goalKey(goal: CollectionGoalTarget) {
  return `${goal.status}-${goal.feature}-${goal.grade}`;
}

function GoalOption({
  goal,
  onPress,
  selected,
}: {
  goal: CollectionGoalTarget;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityLabel={`Set ${goal.feature} ${goal.grade} as goal`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.goalOption, selected && styles.selectedGoalOption]}
    >
      <View style={styles.goalOptionCopy}>
        <Text numberOfLines={1} style={styles.goalOptionFeature}>
          {goal.feature}
        </Text>
        <Text style={styles.goalOptionMeta}>{goal.triedSessions} tried</Text>
      </View>
      <View style={styles.goalGradePill}>
        <Text style={styles.goalGradeText}>{goal.grade}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function CollectionScreen() {
  const router = useRouter();
  const { returnToProfile } = useProfileReturnTransition();
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const [filterPicker, setFilterPicker] = useState<'location' | 'scale' | null>(null);
  const [goalPickerVisible, setGoalPickerVisible] = useState(false);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<CollectionGoalTarget | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState(allLocationsFilterId);
  const [selectedScaleKey, setSelectedScaleKey] = useState<string | null>(null);
  const scaleOptions = useMemo(() => buildCollectionScaleOptions(preferences, summaries), [preferences, summaries]);
  const resolvedScaleKey = selectedScaleKey ?? getPreferredCollectionScaleKey(preferences);
  const selectedScaleOption = scaleOptions.find((option) => option.key === resolvedScaleKey) ?? scaleOptions[0] ?? fallbackScaleOption;
  const locationOptions = useMemo(
    () => [{ id: allLocationsFilterId, name: 'All locations' }, ...locations.map((location) => ({ id: location.id, name: location.name }))],
    [locations],
  );
  const selectedLocationName = locationOptions.find((option) => option.id === selectedLocationId)?.name ?? 'All locations';
  const filteredSummaries = useMemo(
    () => filterCollectionSummaries(summaries, selectedScaleOption.key, selectedLocationId),
    [selectedLocationId, selectedScaleOption.key, summaries],
  );
  const rows = useMemo(
    () => buildCollectionRows(filteredSummaries, selectedScaleOption.scale, selectedScaleOption.key),
    [filteredSummaries, selectedScaleOption.key, selectedScaleOption.scale],
  );
  const displayRows = useMemo(() => buildDisplayRows(rows), [rows]);
  const triedGoals = useMemo(() => buildTriedGoalTargets(rows, selectedScaleOption.scale), [rows, selectedScaleOption.scale]);
  const collectedCells = countCollectedCells(rows);
  const coveredFeatures = countFeaturesCovered(rows);
  const triedCells = countTriedGapCells(rows);

  useEffect(() => {
    let isMounted = true;

    async function loadCollection() {
      const [nextSummaries] = await Promise.all([
        sessionSummaryService.listCompletedSessionSummaries(),
        loadPreferences(),
        loadLocations(),
      ]);

      if (isMounted) {
        setSummaries(nextSummaries);
        setIsLoading(false);
      }
    }

    void loadCollection();

    return () => {
      isMounted = false;
    };
  }, [loadLocations, loadPreferences]);

  useEffect(() => {
    setSelectedGoal(null);
  }, [selectedLocationId, selectedScaleOption.key]);

  function chooseGoal(goal: CollectionGoalTarget) {
    setSelectedGoal(goal);
    setGoalPickerVisible(false);
  }

  function handleCellPress(feature: string, grade: string, gradeIndex: number, cell: CollectionCell) {
    if (cell.sentSessionIds.length > 0) {
      router.push({
        pathname: '/collection/cell',
        params: {
          feature,
          grade,
          locationId: selectedLocationId,
          scaleKey: selectedScaleOption.key,
        },
      });
      return;
    }

    setSelectedGoal({
      feature,
      grade,
      gradeIndex,
      priority: gradeIndex,
      status: cell.triedSessionIds.length > 0 ? 'tried' : 'open',
      triedSessions: cell.triedSessionIds.length,
    });
  }

  function renderDropdownRow(label: string, value: string, onPress: () => void) {
    return (
      <TouchableOpacity
        activeOpacity={0.76}
        accessibilityLabel={`Change ${label}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.dropdownRow}
      >
        <View style={styles.dropdownCopy}>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.dropdownValue}>
            {value}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.charcoal} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel="Back to profile"
            accessibilityRole="button"
            onPress={returnToProfile}
            style={styles.backButton}
          >
            <Feather name="chevron-left" size={24} color={colors.charcoal} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Collection</Text>
          </View>
        </View>

        <AppCard style={styles.filterCard}>
          <View style={styles.filterTitleRow}>
            <Text style={styles.filterTitle}>Map view</Text>
            <Text style={styles.filterNote}>Separate map per scale</Text>
          </View>
          <View style={styles.dropdownGrid}>
            {renderDropdownRow('Grade scale', selectedScaleOption.label, () => setFilterPicker('scale'))}
            {renderDropdownRow('Location', selectedLocationName, () => setFilterPicker('location'))}
          </View>
        </AppCard>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard}>
            <Text style={styles.statValue}>{collectedCells}</Text>
            <Text style={styles.statLabel}>Cells collected</Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={styles.statValue}>{coveredFeatures}</Text>
            <Text style={styles.statLabel}>Features covered</Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={styles.statValue}>{triedCells}</Text>
            <Text style={styles.statLabel}>Tried cells</Text>
          </AppCard>
        </View>

        <AppCard style={styles.goalsCard}>
          <View style={styles.goalHeaderRow}>
            <View style={styles.goalHeading}>
              <Text style={styles.goalsTitle}>Goal</Text>
              {selectedGoal ? (
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.goalsValue}>
                  {selectedGoal.feature} {selectedGoal.grade}
                </Text>
              ) : (
                <Text style={styles.goalsValue}>No goal selected</Text>
              )}
            </View>
            {selectedGoal ? (
              <View style={[styles.goalStatusPill, selectedGoal.status === 'tried' && styles.triedGoalPill]}>
                <Text style={styles.goalStatusText}>{selectedGoal.status === 'tried' ? 'Tried' : 'Open'}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Select new goal"
            accessibilityRole="button"
            onPress={() => setGoalPickerVisible(true)}
            style={styles.selectGoalButton}
          >
            <Feather name="plus" size={18} color={colors.charcoal} />
            <Text style={styles.selectGoalText}>Select new goal</Text>
          </TouchableOpacity>
        </AppCard>

        <AppCard style={styles.matrixCard}>
          <View style={styles.matrixHeader}>
            <View style={styles.matrixHeaderCopy}>
              <Text style={styles.matrixTitle}>Feature map</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.matrixSubtitle}>
                {selectedScaleOption.label} | {selectedLocationName}
              </Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.goalCell]} />
                <Text style={styles.legendLabel}>Goal</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.prCell]} />
                <Text style={styles.legendLabel}>PR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.sentCell]} />
                <Text style={styles.legendLabel}>Sent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.triedCell]}>
                  <View style={styles.triedDot} />
                </View>
                <Text style={styles.legendLabel}>Tried</Text>
              </View>
            </View>
          </View>

          <View style={styles.matrixTable}>
            <View style={styles.featureColumn}>
              <View style={styles.featureHeaderCell}>
                <Text style={styles.axisLabel}>Feature</Text>
              </View>
              {displayRows.map((displayRow) =>
                displayRow.type === 'section' ? (
                  <View key={displayRow.title} style={styles.sectionCell}>
                    <Text numberOfLines={1} style={styles.sectionCellText}>
                      {displayRow.title}
                    </Text>
                  </View>
                ) : (
                  <View key={displayRow.row.feature} style={styles.featureCell}>
                    <Text numberOfLines={1} style={styles.featureName}>
                      {displayRow.row.feature}
                    </Text>
                    <Text style={styles.featureMeta}>{displayRow.row.bestSentGrade ? `PR ${displayRow.row.bestSentGrade}` : '-'}</Text>
                  </View>
                ),
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.gradeMatrix, { minWidth: matrixCellSize * selectedScaleOption.scale.gradingScaleGrades.length }]}>
                <View style={styles.gradeHeaderRow}>
                  {selectedScaleOption.scale.gradingScaleGrades.map((grade) => (
                    <View key={grade} style={styles.gradeHeaderCell}>
                      <Text numberOfLines={1} style={styles.gradeHeaderText}>
                        {grade}
                      </Text>
                    </View>
                  ))}
                </View>

                {displayRows.map((displayRow) =>
                  displayRow.type === 'section' ? (
                    <View key={`${displayRow.title}-right`} style={styles.sectionSpacerRow} />
                  ) : (
                    <View key={`${displayRow.row.feature}-right`} style={styles.matrixRow}>
                      {displayRow.row.cells.map((cell, index) => {
                        const grade = selectedScaleOption.scale.gradingScaleGrades[index] ?? '';
                        const state = getCellState(cell);
                        const isPr = Boolean(isBestSentCell(displayRow.row, index));
                        const isGoal = selectedGoal?.feature === displayRow.row.feature && selectedGoal.grade === grade;

                        return (
                          <TouchableOpacity
                            activeOpacity={0.76}
                            accessibilityLabel={formatCellAccessibility(displayRow.row.feature, grade, cell)}
                            accessibilityRole="button"
                            key={`${displayRow.row.feature}-${grade}`}
                            onPress={() => handleCellPress(displayRow.row.feature, grade, index, cell)}
                            style={[
                              styles.matrixCell,
                              state === 'strong' && styles.strongCell,
                              state === 'sent' && styles.sentCell,
                              state === 'tried' && styles.triedCell,
                              isPr && styles.prCell,
                              isGoal && styles.goalCell,
                            ]}
                          >
                            {cell.sentSessionIds.length > 0 ? <Text style={styles.cellText}>{cell.sentSessionIds.length}</Text> : null}
                            {cell.sentSessionIds.length === 0 && cell.triedSessionIds.length > 0 ? <View style={styles.triedDot} /> : null}
                            {isPr ? <View style={styles.prDot} /> : null}
                            {isGoal ? <Feather name="target" size={12} color={colors.charcoal} style={styles.goalIcon} /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ),
                )}
              </View>
            </ScrollView>
          </View>
        </AppCard>
      </ScrollView>

      <DismissibleModal onDismiss={() => setFilterPicker(null)} visible={filterPicker != null}>
        <AppCard style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{filterPicker === 'scale' ? 'Grade scale' : 'Location'}</Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close map view picker"
              accessibilityRole="button"
              onPress={() => setFilterPicker(null)}
              style={styles.pickerCloseButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
            {filterPicker === 'scale'
              ? scaleOptions.map((option) => {
                  const selected = option.key === selectedScaleOption.key;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`View ${option.label} collection map`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.key}
                      onPress={() => {
                        setSelectedScaleKey(option.key);
                        setFilterPicker(null);
                      }}
                      style={[styles.pickerOption, selected && styles.selectedPickerOption]}
                    >
                      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.pickerOptionText}>{option.label}</Text>
                      <Text style={styles.pickerSelectedText}>{selected ? 'Selected' : ''}</Text>
                    </TouchableOpacity>
                  );
                })
              : locationOptions.map((option) => {
                  const selected = option.id === selectedLocationId;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel={`Filter collection by ${option.name}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.id}
                      onPress={() => {
                        setSelectedLocationId(option.id);
                        setFilterPicker(null);
                      }}
                      style={[styles.pickerOption, selected && styles.selectedPickerOption]}
                    >
                      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.pickerOptionText}>{option.name}</Text>
                      <Text style={styles.pickerSelectedText}>{selected ? 'Selected' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
          </ScrollView>
        </AppCard>
      </DismissibleModal>

      <DismissibleModal onDismiss={() => setGoalPickerVisible(false)} visible={goalPickerVisible}>
        <AppCard style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select goal</Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close goal picker"
              accessibilityRole="button"
              onPress={() => setGoalPickerVisible(false)}
              style={styles.pickerCloseButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
            {triedGoals.length === 0 ? (
              <Text style={styles.emptyGoalText}>Tried cells will appear here after you log unsent climbs. You can also tap any open cell on the map.</Text>
            ) : null}
            {triedGoals.map((goal) => (
              <GoalOption
                goal={goal}
                key={goalKey(goal)}
                onPress={() => chooseGoal(goal)}
                selected={selectedGoal ? goalKey(selectedGoal) === goalKey(goal) : false}
              />
            ))}
          </ScrollView>
        </AppCard>
      </DismissibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  axisLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  cellText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '900',
  },
  content: {
    gap: spacing.md,
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  dropdownCopy: {
    flex: 1,
    minWidth: 0,
  },
  dropdownGrid: {
    gap: spacing.sm,
  },
  dropdownLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dropdownRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  dropdownValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyGoalText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  featureCell: {
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    height: 42,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  featureColumn: {
    backgroundColor: colors.surface,
    borderRightColor: colors.stone,
    borderRightWidth: 1,
    width: 132,
  },
  featureHeaderCell: {
    height: 38,
    justifyContent: 'center',
  },
  featureMeta: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  featureName: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
  },
  filterCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  filterNote: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    fontWeight: '800',
  },
  filterTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCell: {
    borderColor: colors.lavender,
    borderWidth: 2,
  },
  goalGradePill: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  goalGradeText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  goalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  goalHeading: {
    flex: 1,
    minWidth: 0,
  },
  goalIcon: {
    position: 'absolute',
  },
  goalOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalOptionFeature: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
  },
  goalOptionMeta: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  goalsCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  goalsTitle: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  goalsValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  goalStatusPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  goalStatusText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '900',
  },
  gradeHeaderCell: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: matrixCellSize,
  },
  gradeHeaderRow: {
    flexDirection: 'row',
  },
  gradeHeaderText: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    fontWeight: '900',
    maxWidth: matrixCellSize - 6,
  },
  gradeMatrix: {},
  legend: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '800',
  },
  legendSwatch: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  matrixCard: {
    padding: spacing.lg,
  },
  matrixCell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    marginHorizontal: 3,
    position: 'relative',
    width: matrixCellSize - 6,
  },
  matrixHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  matrixHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  matrixRow: {
    alignItems: 'center',
    borderTopColor: colors.stone,
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 42,
  },
  matrixSubtitle: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  matrixTable: {
    flexDirection: 'row',
  },
  matrixTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
  },
  pickerCard: {
    maxHeight: '100%',
    padding: spacing.lg,
    width: '100%',
  },
  pickerCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pickerContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pickerOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  pickerOptionText: {
    color: colors.charcoal,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '800',
  },
  pickerSelectedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 58,
    textAlign: 'right',
  },
  pickerTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
  },
  prCell: {
    backgroundColor: 'rgba(255,209,102,0.72)',
    borderColor: colors.charcoal,
    borderWidth: 2,
  },
  prDot: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.pill,
    height: 5,
    position: 'absolute',
    right: 4,
    top: 4,
    width: 5,
  },
  sectionCell: {
    backgroundColor: colors.surfaceSoft,
    height: 32,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  sectionCellText: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionSpacerRow: {
    backgroundColor: colors.surfaceSoft,
    height: 32,
  },
  selectGoalButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.muted,
    borderRadius: radius.lg,
    borderStyle: 'dotted',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  selectGoalText: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedGoalOption: {
    borderColor: colors.charcoal,
    borderWidth: 2,
  },
  selectedPickerOption: {
    backgroundColor: 'rgba(168,221,191,0.28)',
    borderColor: colors.mint,
  },
  sentCell: {
    backgroundColor: 'rgba(168,221,191,0.8)',
    borderColor: colors.success,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    fontWeight: '900',
  },
  strongCell: {
    backgroundColor: colors.success,
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
  triedCell: {
    backgroundColor: 'rgba(255,150,102,0.14)',
    borderColor: colors.coral,
  },
  triedDot: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    height: 5,
    width: 5,
  },
  triedGoalPill: {
    backgroundColor: 'rgba(255,150,102,0.18)',
    borderColor: colors.coral,
  },
});
