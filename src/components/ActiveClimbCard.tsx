import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { climbColours, climbGrades, holdTypes, warmUpHoldType } from '../features/climbs';
import { Climb } from '../domain/models';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { colors, radius, spacing, typography } from '../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
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
  onAddAttempt: () => void;
  onDelete: () => void;
  onGiveUp: () => void;
  onSentIt: () => void;
  onUndoAttempt: () => void;
  onUpdate: (input: EditableClimbInput) => void;
};

type DoneClimbCardProps = {
  climb: Climb;
  disabled?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

type DropdownField = 'colour' | 'grade' | 'holds';

function getVisibleHoldTypes(climb: Climb) {
  return climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType);
}

function parseColours(colour: string | null) {
  const colours = colour?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

  return colours.length > 0 ? colours.slice(0, 2) : ['Blue'];
}

function stringifyColours(colours: string[]) {
  return colours.join(', ');
}

export function ActiveClimbCard({
  climb,
  disabled = false,
  onAddAttempt,
  onDelete,
  onGiveUp,
  onSentIt,
  onUndoAttempt,
  onUpdate,
}: ActiveClimbCardProps) {
  const [openField, setOpenField] = useState<DropdownField | null>(null);
  const elapsedSeconds = useElapsedSeconds(climb.startTime);
  const canUndo = climb.attemptCount > 1;
  const visibleHoldTypes = getVisibleHoldTypes(climb);
  const selectedColours = parseColours(climb.colour);
  const colourLabel = selectedColours.join(', ');
  const holdLabel = visibleHoldTypes.length > 0 ? visibleHoldTypes.join(', ') : 'None';

  function updateGrade(grade: string) {
    onUpdate({ colour: climb.colour, grade, holdTypes: visibleHoldTypes });
  }

  function toggleColour(colour: string) {
    const nextColours = selectedColours.includes(colour)
      ? selectedColours.filter((item) => item !== colour)
      : [...selectedColours, colour].slice(0, 2);

    if (nextColours.length === 0) {
      return;
    }

    onUpdate({ colour: stringifyColours(nextColours), grade: climb.grade, holdTypes: visibleHoldTypes });
  }

  function toggleHoldType(holdType: string) {
    const nextHoldTypes = visibleHoldTypes.includes(holdType)
      ? visibleHoldTypes.filter((item) => item !== holdType)
      : [...visibleHoldTypes, holdType];

    onUpdate({ colour: climb.colour, grade: climb.grade, holdTypes: nextHoldTypes });
  }

  function renderDropdownOptions() {
    if (openField === 'grade') {
      return climbGrades.map((grade) => (
        <DropdownOption
          key={grade}
          label={grade}
          onPress={() => {
            updateGrade(grade);
            setOpenField(null);
          }}
          selected={climb.grade === grade}
        />
      ));
    }

    if (openField === 'colour') {
      return climbColours.map((climbColour) => (
        <DropdownOption
          accentColor={climbColour.value}
          disabled={!selectedColours.includes(climbColour.label) && selectedColours.length >= 2}
          key={climbColour.label}
          label={climbColour.label}
          onPress={() => toggleColour(climbColour.label)}
          selected={selectedColours.includes(climbColour.label)}
        />
      ));
    }

    if (openField === 'holds') {
      return holdTypes.map((holdType) => (
        <DropdownOption
          key={holdType}
          label={holdType}
          onPress={() => toggleHoldType(holdType)}
          selected={visibleHoldTypes.includes(holdType)}
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
            <Text style={styles.grade}>{climb.grade}</Text>
            {climb.colour ? <Text style={styles.meta}>- {climb.colour}</Text> : null}
          </View>
        </View>
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
        <SelectButton label="Grade" onPress={() => setOpenField('grade')} value={climb.grade} />
        <SelectButton label="Colour" onPress={() => setOpenField('colour')} value={colourLabel} />
        <SelectButton label="Holds" onPress={() => setOpenField('holds')} value={holdLabel} wide />
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
              <Text style={styles.dropdownTitle}>
                {openField === 'grade' ? 'Grade' : openField === 'colour' ? 'Colour' : 'Holds'}
              </Text>
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
            <ScrollView contentContainerStyle={styles.optionList}>{renderDropdownOptions()}</ScrollView>
            {openField === 'holds' || openField === 'colour' ? (
              <AppButton icon="check" onPress={() => setOpenField(null)} title="Done" />
            ) : null}
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

function DropdownOption({
  accentColor,
  label,
  onPress,
  selected,
  disabled = false,
}: {
  accentColor?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.optionRow, selected && styles.selectedOptionRow, disabled && styles.disabledOptionRow]}
    >
      {accentColor ? <View style={[styles.colourDot, { backgroundColor: accentColor }]} /> : null}
      <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text>
      {selected ? <Feather name="check" size={18} color={colors.charcoal} /> : null}
    </TouchableOpacity>
  );
}

export function DoneClimbCard({ climb, disabled = false, onDelete, onEdit }: DoneClimbCardProps) {
  const visibleHoldTypes = getVisibleHoldTypes(climb);

  return (
    <AppCard style={styles.doneCard}>
      <View style={styles.doneHeader}>
        <View style={styles.doneMain}>
          <Text style={styles.doneGrade}>{climb.grade}</Text>
          {climb.colour ? <Text style={styles.doneMeta}>{climb.colour}</Text> : null}
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
        {visibleHoldTypes.length > 0 ? ` - ${visibleHoldTypes.join(', ')}` : ''}
      </Text>
    </AppCard>
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
    gap: spacing.xs,
    padding: spacing.md,
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
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledOptionRow: {
    opacity: 0.42,
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
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wideSelectButton: {
    flexBasis: '100%',
  },
});
