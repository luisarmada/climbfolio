import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { climbColours, climbGrades, holdTypes, warmUpHoldType } from '../features/climbs';
import { Climb } from '../domain/models';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { colors, radius, spacing, typography } from '../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { getMainHoldType, HoldIcon } from './HoldIcon';
import { TimerText } from './TimerText';

const destructiveRed = '#B85A3B';

type EditableClimbInput = {
  colour?: string | null;
  grade: string;
  holdTypes?: string[];
};

type ActiveClimbCardProps = {
  climb: Climb;
  disabled?: boolean;
  gradeOptions?: string[];
  onAddAttempt: () => void;
  onDelete: () => void;
  onGiveUp: () => void;
  onSentIt: () => void;
  onUndoAttempt: () => void;
  onUpdate: (input: EditableClimbInput) => void;
};

type DoneClimbCardProps = {
  celebrate?: boolean;
  climb: Climb;
  disabled?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

type DropdownField = 'holds';

function getVisibleHoldTypes(climb: Climb) {
  return climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType);
}

function parseColours(colour: string | null) {
  const colours = colour?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

  return colours.slice(0, 2);
}

function stringifyColours(colours: string[]) {
  return colours.join(', ');
}

function formatColourDisplay(colours: string[]) {
  return colours.join(' & ');
}

export function ActiveClimbCard({
  climb,
  disabled = false,
  gradeOptions = climbGrades,
  onAddAttempt,
  onDelete,
  onGiveUp,
  onSentIt,
  onUndoAttempt,
  onUpdate,
}: ActiveClimbCardProps) {
  const [openField, setOpenField] = useState<DropdownField | null>(null);
  const [isDetailsEditorVisible, setIsDetailsEditorVisible] = useState(false);
  const elapsedSeconds = useElapsedSeconds(climb.startTime);
  const canUndo = climb.attemptCount > 1;
  const visibleHoldTypes = getVisibleHoldTypes(climb);
  const mainHoldType = getMainHoldType(visibleHoldTypes);
  const selectedColours = parseColours(climb.colour);
  const colourLabel = formatColourDisplay(selectedColours);
  const holdLabel = mainHoldType ?? 'None';
  const [detailsGrade, setDetailsGrade] = useState(climb.grade);
  const [detailsColours, setDetailsColours] = useState(selectedColours);
  const detailsGradeIndex = Math.max(0, gradeOptions.indexOf(detailsGrade));
  const canSaveDetails = Boolean(detailsGrade);

  function updateMainHoldType(holdType: string) {
    onUpdate({ colour: climb.colour, grade: climb.grade, holdTypes: mainHoldType === holdType ? [] : [holdType] });
  }

  function openDetailsEditor() {
    setDetailsGrade(climb.grade);
    setDetailsColours(selectedColours);
    setIsDetailsEditorVisible(true);
  }

  function toggleDetailsColour(colour: string) {
    setDetailsColours((current) => {
      const nextColours = current.includes(colour)
        ? current.filter((item) => item !== colour)
        : [...current, colour].slice(0, 2);

      return nextColours;
    });
  }

  function saveDetailsEditor() {
    if (!canSaveDetails) {
      return;
    }

    onUpdate({
      colour: detailsColours.length > 0 ? stringifyColours(detailsColours) : null,
      grade: detailsGrade,
      holdTypes: mainHoldType ? [mainHoldType] : [],
    });
    setIsDetailsEditorVisible(false);
  }

  function renderDropdownOptions() {
    if (openField === 'holds') {
      return holdTypes.map((holdType) => (
        <HoldOptionTile
          colours={selectedColours}
          holdType={holdType}
          key={holdType}
          onPress={() => updateMainHoldType(holdType)}
          selected={mainHoldType === holdType}
        />
      ));
    }

    return null;
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Current Climb</Text>
          <View style={styles.titleRow}>
            {mainHoldType ? <HoldIcon colours={selectedColours} holdType={mainHoldType} size={46} /> : null}
            <Text style={styles.grade}>{climb.grade}</Text>
            {climb.colour ? <Text style={styles.meta}>- {colourLabel}</Text> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Edit climb grade and colour"
            accessibilityRole="button"
            disabled={disabled}
            onPress={openDetailsEditor}
            style={styles.editIconButton}
          >
            <Feather name="edit-2" size={17} color={colors.charcoal} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Delete current climb"
            accessibilityRole="button"
            disabled={disabled}
            onPress={onDelete}
            style={styles.iconButton}
          >
            <Feather name="trash-2" size={18} color={destructiveRed} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.timerLabel}>On climb</Text>
          <TimerText seconds={elapsedSeconds} variant="card" />
        </View>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptNumber}>{climb.attemptCount}</Text>
          <Text style={styles.attemptLabel}>Attempts</Text>
        </View>
      </View>

      <View style={styles.dropdownGrid}>
        <SelectButton
          label="Main hold type"
          onPress={() => setOpenField('holds')}
          value={holdLabel}
          wide
        />
      </View>

      <View style={styles.attemptActions}>
        <AppButton
          disabled={disabled || !canUndo}
          icon="rotate-ccw"
          onPress={onUndoAttempt}
          style={styles.halfButton}
          title="Undo"
          variant="secondary"
        />
        <AppButton disabled={disabled} icon="plus" onPress={onAddAttempt} style={styles.halfButton} title="+ Attempt" />
      </View>

      <View style={styles.doneActions}>
        <AppButton disabled={disabled} icon="x-circle" onPress={onGiveUp} style={styles.halfButton} title="Give Up" variant="secondary" />
        <AppButton disabled={disabled} icon="check-circle" onPress={onSentIt} style={styles.halfButton} title="Sent It" />
      </View>

      <Modal animationType="fade" transparent visible={Boolean(openField)}>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.dropdownCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Main hold type</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close options"
                accessibilityRole="button"
                onPress={() => setOpenField(null)}
                style={styles.smallIconButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.optionList, openField === 'holds' && styles.holdOptionGrid]}>
              {renderDropdownOptions()}
            </ScrollView>
            <AppButton icon="check" onPress={() => setOpenField(null)} title="Done" />
          </AppCard>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isDetailsEditorVisible}>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.dropdownCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Climb details</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close climb details"
                accessibilityRole="button"
                onPress={() => setIsDetailsEditorVisible(false)}
                style={styles.smallIconButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailsContent}>
              <Text style={styles.detailsLabel}>Grade</Text>
              <View style={styles.detailsStepper}>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Decrease climb grade"
                  accessibilityRole="button"
                  disabled={detailsGradeIndex === 0}
                  onPress={() => setDetailsGrade(gradeOptions[Math.max(0, detailsGradeIndex - 1)] ?? detailsGrade)}
                  style={[styles.detailsStepperButton, detailsGradeIndex === 0 && styles.disabledStepperButton]}
                >
                  <Feather name="minus" size={18} color={destructiveRed} />
                </TouchableOpacity>
                <Text style={styles.detailsStepperValue}>{detailsGrade}</Text>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Increase climb grade"
                  accessibilityRole="button"
                  disabled={detailsGradeIndex === gradeOptions.length - 1}
                  onPress={() => setDetailsGrade(gradeOptions[Math.min(gradeOptions.length - 1, detailsGradeIndex + 1)] ?? detailsGrade)}
                  style={[styles.detailsStepperButton, detailsGradeIndex === gradeOptions.length - 1 && styles.disabledStepperButton]}
                >
                  <Feather name="plus" size={18} color={colors.charcoal} />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailsLabel}>Colour</Text>
              <View style={styles.detailsOptionWrap}>
                {climbColours.map((climbColour) => {
                  const selected = detailsColours.includes(climbColour.label);
                  const optionDisabled = !selected && detailsColours.length >= 2;

                  return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel={`Toggle ${climbColour.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={optionDisabled}
                    key={climbColour.label}
                    onPress={() => toggleDetailsColour(climbColour.label)}
                    style={[styles.detailsOption, selected && styles.selectedOptionRow, optionDisabled && styles.disabledOptionRow]}
                  >
                    <View style={[styles.colourDot, { backgroundColor: climbColour.value }]} />
                    <Text style={[styles.detailsOptionText, selected && styles.selectedOptionText]}>{climbColour.label}</Text>
                  </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <AppButton disabled={disabled || !canSaveDetails} icon="check" onPress={saveDetailsEditor} title="Save Details" />
          </AppCard>
        </View>
      </Modal>
    </AppCard>
  );
}

function SelectButton({
  label,
  onPress,
  value,
  wide = false,
}: {
  label: string;
  onPress: () => void;
  value: string;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.selectButton, wide && styles.wideSelectButton]}
    >
      <View style={styles.selectTextWrap}>
        <Text style={styles.selectLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.selectValue}>
          {value}
        </Text>
      </View>
      <Feather name="chevron-down" size={18} color={colors.charcoal} />
    </TouchableOpacity>
  );
}

function HoldOptionTile({
  colours,
  holdType,
  onPress,
  selected,
}: {
  colours: string[];
  holdType: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityLabel={holdType}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.holdOptionTile, selected && styles.selectedOptionRow]}
    >
      {selected ? (
        <View style={styles.holdOptionCheck}>
          <Feather name="check" size={14} color={colors.charcoal} />
        </View>
      ) : null}
      <HoldIcon colours={colours} holdType={holdType} size={58} />
      <Text style={[styles.holdOptionText, selected && styles.selectedOptionText]}>{holdType}</Text>
    </TouchableOpacity>
  );
}

export function DoneClimbCard({ celebrate = false, climb, disabled = false, onDelete, onEdit }: DoneClimbCardProps) {
  const visibleHoldTypes = getVisibleHoldTypes(climb);
  const mainHoldType = getMainHoldType(visibleHoldTypes);
  const selectedColours = parseColours(climb.colour);
  const colourLabel = formatColourDisplay(selectedColours);
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    if (!celebrate) {
      return;
    }

    cardScale.setValue(0.96);
    cardTranslateY.setValue(12);
    celebrationOpacity.setValue(1);
    celebrationScale.setValue(0.86);

    Animated.parallel([
      Animated.sequence([
        Animated.spring(cardScale, {
          friction: 5,
          tension: 170,
          toValue: 1.035,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          friction: 7,
          tension: 130,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(cardTranslateY, {
        friction: 7,
        tension: 140,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(celebrationScale, {
          friction: 5,
          tension: 160,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationOpacity, {
          delay: 650,
          duration: 360,
          easing: Easing.in(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardScale, cardTranslateY, celebrate, celebrationOpacity, celebrationScale]);

  return (
    <Animated.View style={{ transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }}>
      <AppCard style={styles.doneCard}>
        {celebrate && climb.completed ? (
          <Animated.View pointerEvents="none" style={[styles.doneCelebrationOverlay, { opacity: celebrationOpacity }]} />
        ) : null}
        {celebrate && climb.completed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.doneCelebrationBadge,
              {
                opacity: celebrationOpacity,
                transform: [{ scale: celebrationScale }],
              },
            ]}
          >
            <Feather name="zap" size={13} color={colors.charcoal} />
            <Text style={styles.doneCelebrationText}>Sent!</Text>
          </Animated.View>
        ) : null}
        <View style={styles.doneCardContent}>
          <View style={styles.doneHeader}>
            <View style={styles.doneMain}>
              {mainHoldType ? <HoldIcon colours={selectedColours} holdType={mainHoldType} size={34} /> : null}
              <Text style={styles.doneGrade}>{climb.grade}</Text>
              {climb.colour ? <Text style={styles.doneMeta}>{colourLabel}</Text> : null}
              <Text style={[styles.doneState, climb.completed ? styles.sentState : styles.giveUpState]}>
                {climb.completed ? 'Sent it' : 'Gave up'}
              </Text>
            </View>
            <View style={styles.doneIconActions}>
              {onEdit ? (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel={`Edit ${climb.grade} climb`}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={onEdit}
                  style={styles.doneEditButton}
                >
                  <Feather name="edit-2" size={15} color={colors.charcoal} />
                </TouchableOpacity>
              ) : null}
              {onDelete ? (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel={`Delete ${climb.grade} climb`}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={onDelete}
                  style={styles.doneIconButton}
                >
                  <Feather name="trash-2" size={16} color={destructiveRed} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text style={styles.doneDetails}>
            {climb.attemptCount} {climb.attemptCount === 1 ? 'attempt' : 'attempts'}
            {mainHoldType ? ` - ${mainHoldType}` : ''}
          </Text>
        </View>
      </AppCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  attemptActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attemptBadge: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    minWidth: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attemptLabel: {
    color: colors.charcoal,
    fontSize: 11,
    fontWeight: '800',
  },
  attemptNumber: {
    color: colors.charcoal,
    fontSize: 24,
    fontWeight: '800',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  colourDot: {
    borderColor: 'rgba(30,30,30,0.16)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  dropdownCard: {
    maxHeight: '72%',
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dropdownHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dropdownTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
  },
  detailsContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  detailsLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailsOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  detailsOptionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  detailsOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailsStepper: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    overflow: 'hidden',
  },
  detailsStepperButton: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  detailsStepperValue: {
    color: colors.charcoal,
    fontSize: 17,
    fontWeight: '900',
    minWidth: 54,
    textAlign: 'center',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  doneActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  doneCard: {
    padding: spacing.md,
    position: 'relative',
  },
  doneCardContent: {
    gap: spacing.xs,
    zIndex: 1,
  },
  doneDetails: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  doneGrade: {
    color: colors.charcoal,
    fontSize: 22,
    fontWeight: '800',
  },
  doneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  doneIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(184,90,59,0.1)',
    borderColor: 'rgba(184,90,59,0.34)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  doneEditButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  doneIconActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  doneMain: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  doneMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  doneState: {
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  editIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  giveUpState: {
    backgroundColor: 'rgba(255,150,102,0.18)',
    color: '#9A4E31',
  },
  grade: {
    ...typography.h2,
    color: colors.charcoal,
    fontSize: 28,
    lineHeight: 32,
  },
  halfButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(184,90,59,0.1)',
    borderColor: 'rgba(184,90,59,0.34)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  optionList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  holdOptionCheck: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 24,
  },
  holdOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  holdOptionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  holdOptionTile: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    justifyContent: 'center',
    minHeight: 112,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  disabledOptionRow: {
    opacity: 0.42,
  },
  disabledStepperButton: {
    opacity: 0.36,
  },
  meta: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  selectButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 54,
    minWidth: 126,
    paddingHorizontal: spacing.md,
  },
  selectLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectTextWrap: {
    flex: 1,
  },
  selectValue: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  selectedOptionRow: {
    backgroundColor: colors.mint,
    borderColor: colors.success,
  },
  selectedOptionText: {
    color: colors.charcoal,
  },
  doneCelebrationBadge: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.sm,
    zIndex: 2,
  },
  doneCelebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(168,221,191,0.26)',
    borderBottomColor: colors.success,
    borderBottomWidth: 4,
    borderColor: 'rgba(88,170,129,0.72)',
    borderRadius: radius.xl,
    borderWidth: 2,
  },
  doneCelebrationText: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '900',
  },
  sentState: {
    backgroundColor: 'rgba(168,221,191,0.6)',
    color: '#2F7658',
  },
  smallIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  timerLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  wideSelectButton: {
    flexBasis: '100%',
  },
});
