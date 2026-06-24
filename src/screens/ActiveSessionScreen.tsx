import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActiveClimbCard, DoneClimbCard } from '../components/ActiveClimbCard';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { getMainHoldType, HoldIcon } from '../components/HoldIcon';
import { TimerText } from '../components/TimerText';
import { colors, radius, spacing, typography } from '../design/tokens';
import { Climb } from '../domain/models';
import { vScaleGrades } from '../domain/gradeScales';
import { climbColours, holdTypes, warmUpHoldType } from '../features/climbs';
import { getDefaultSessionName, useActiveSessionStore } from '../features/sessions';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';

const destructiveRed = '#B85A3B';
const longSessionThresholdSeconds = 6 * 60 * 60;

type EditTarget = TimelineItem | null;
type EndSessionMode = 'default' | 'sent' | 'incomplete' | 'discard';

type EditDraft = {
  attemptCount: number;
  colours: string[];
  completed: boolean;
  durationSeconds: number;
  grade: string;
  holdTypes: string[];
  quickCount: number;
};

type NewClimbDraft = {
  colours: string[];
  grade: string;
};

type SessionFinalizationDraft = {
  description: string;
  name: string;
};

type TimelineItem =
  | {
      climb: Climb;
      type: 'climb';
    }
  | {
      climbIds: string[];
      count: number;
      grade: string;
      id: string;
      type: 'quick';
    };

function isWarmUpClimb(climb: Climb) {
  return climb.holdTypes.includes(warmUpHoldType);
}

function getTimelineItems(climbs: Climb[]): TimelineItem[] {
  return climbs
    .filter((climb) => climb.endTime)
    .reduce<TimelineItem[]>((items, climb) => {
      const previousItem = items[items.length - 1];

      if (isWarmUpClimb(climb)) {
        if (previousItem?.type === 'quick' && previousItem.grade === climb.grade) {
          previousItem.climbIds.push(climb.id);
          previousItem.count += 1;
          return items;
        }

        return [...items, { climbIds: [climb.id], count: 1, grade: climb.grade, id: climb.id, type: 'quick' }];
      }

      return [...items, { climb, type: 'climb' }];
    }, []);
}

function flattenTimelineItemIds(items: TimelineItem[]) {
  return items.flatMap((item) => (item.type === 'quick' ? item.climbIds : [item.climb.id]));
}

function parseColours(colour: string | null) {
  const colours = colour?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

  return colours.slice(0, 2);
}

function stringifyColours(colours: string[]) {
  return colours.join(', ');
}

function QuickClimbGroupCard({
  count,
  disabled = false,
  grade,
  onDelete,
  onEdit,
}: {
  count: number;
  disabled?: boolean;
  grade: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <AppCard style={styles.quickDoneCard}>
      <View style={styles.quickDoneMain}>
        <Feather name="zap" size={16} color={colors.charcoal} />
        <Text style={styles.quickDoneGrade}>{count > 1 ? `${count}x ${grade}` : grade}</Text>
        <Text style={styles.quickDoneLabel}>Quick climb</Text>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel={`Edit ${grade} quick climb`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onEdit}
          style={styles.quickEditButton}
        >
          <Feather name="edit-2" size={15} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel={count > 1 ? `Remove one ${grade} quick climb` : `Delete ${grade} quick climb`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onDelete}
          style={styles.quickDeleteButton}
        >
          <Feather name={count > 1 ? 'minus' : 'trash-2'} size={15} color={destructiveRed} />
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}

function DraggableTimelineRow({
  children,
  disabled = false,
  index,
  onMove,
}: {
  children: ReactNode;
  disabled?: boolean;
  index: number;
  onMove: (fromIndex: number, toIndex: number) => void;
}) {
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => isDraggingRef.current && Math.abs(gestureState.dy) > 8,
        onPanResponderMove: (_, gestureState) => {
          if (disabled || hasMovedRef.current) {
            return;
          }

          if (gestureState.dy > 52) {
            hasMovedRef.current = true;
            onMove(index, index + 1);
          }

          if (gestureState.dy < -52) {
            hasMovedRef.current = true;
            onMove(index, index - 1);
          }
        },
        onPanResponderRelease: () => {
          hasMovedRef.current = false;
          isDraggingRef.current = false;
        },
        onPanResponderTerminate: () => {
          hasMovedRef.current = false;
          isDraggingRef.current = false;
        },
        onStartShouldSetPanResponder: () => false,
      }),
    [disabled, index, onMove],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      delayLongPress={220}
      onLongPress={() => {
        hasMovedRef.current = false;
        isDraggingRef.current = true;
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </TouchableOpacity>
  );
}

export function ActiveSessionScreen() {
  const router = useRouter();
  const [isEndConfirmVisible, setIsEndConfirmVisible] = useState(false);
  const [selectedWarmUpGrade, setSelectedWarmUpGrade] = useState('V0');
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const addAttempt = useActiveSessionStore((state) => state.addAttempt);
  const climbs = useActiveSessionStore((state) => state.climbs);
  const deleteClimb = useActiveSessionStore((state) => state.deleteClimb);
  const discardActiveClimb = useActiveSessionStore((state) => state.discardActiveClimb);
  const discardSession = useActiveSessionStore((state) => state.discardSession);
  const endSession = useActiveSessionStore((state) => state.endSession);
  const error = useActiveSessionStore((state) => state.error);
  const finishActiveClimb = useActiveSessionStore((state) => state.finishActiveClimb);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const quickAddWarmUpClimb = useActiveSessionStore((state) => state.quickAddWarmUpClimb);
  const reorderTimeline = useActiveSessionStore((state) => state.reorderTimeline);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const startClimb = useActiveSessionStore((state) => state.startClimb);
  const startSession = useActiveSessionStore((state) => state.startSession);
  const totals = useActiveSessionStore((state) => state.totals);
  const undoAttempt = useActiveSessionStore((state) => state.undoAttempt);
  const updateActiveClimb = useActiveSessionStore((state) => state.updateActiveClimb);
  const updateLoggedClimb = useActiveSessionStore((state) => state.updateLoggedClimb);
  const elapsedSeconds = useElapsedSeconds(activeSession?.startTime);
  const timelineItems = getTimelineItems(climbs);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [celebratingClimbId, setCelebratingClimbId] = useState<string | null>(null);
  const [longSessionPromptId, setLongSessionPromptId] = useState<string | null>(null);
  const [isLongSessionPromptVisible, setIsLongSessionPromptVisible] = useState(false);
  const [isNewClimbPickerVisible, setIsNewClimbPickerVisible] = useState(false);
  const [newClimbDraft, setNewClimbDraft] = useState<NewClimbDraft>({ colours: [], grade: 'V0' });
  const [sessionFinalizationDraft, setSessionFinalizationDraft] = useState<SessionFinalizationDraft>({
    description: '',
    name: '',
  });
  const [defaultSessionNamePreview, setDefaultSessionNamePreview] = useState(getDefaultSessionName());
  const sessionGradeOptions = useMemo(
    () => (activeSession?.gradingScaleGrades.length ? activeSession.gradingScaleGrades : vScaleGrades),
    [activeSession?.gradingScaleGrades],
  );
  const selectedQuickGradeIndex = Math.max(0, sessionGradeOptions.indexOf(selectedWarmUpGrade));
  const newClimbGradeIndex = Math.max(0, sessionGradeOptions.indexOf(newClimbDraft.grade));
  const canStartNewClimb = Boolean(newClimbDraft.grade);
  const canSaveEditDraft = Boolean(editDraft?.grade);

  useEffect(() => {
    void restoreActiveSession();
  }, [restoreActiveSession]);

  useEffect(() => {
    const firstGrade = sessionGradeOptions[0] ?? 'V0';

    if (!sessionGradeOptions.includes(selectedWarmUpGrade)) {
      setSelectedWarmUpGrade(firstGrade);
    }

    if (!sessionGradeOptions.includes(newClimbDraft.grade)) {
      setNewClimbDraft((draft) => ({ ...draft, grade: firstGrade }));
    }
  }, [newClimbDraft.grade, selectedWarmUpGrade, sessionGradeOptions]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const firstGrade = sessionGradeOptions[0] ?? 'V0';
    setSelectedWarmUpGrade(firstGrade);
    setNewClimbDraft((draft) => ({ ...draft, grade: firstGrade }));
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession || longSessionPromptId === activeSession.id || elapsedSeconds < longSessionThresholdSeconds) {
      return;
    }

    setLongSessionPromptId(activeSession.id);
    setIsLongSessionPromptVisible(true);
  }, [activeSession, elapsedSeconds, longSessionPromptId]);

  useEffect(() => {
    if (!celebratingClimbId) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setCelebratingClimbId(null), 1600);
    return () => clearTimeout(timeoutId);
  }, [celebratingClimbId]);

  async function handleStartSession() {
    await startSession();
  }

  function openEndSessionConfirm() {
    setSessionFinalizationDraft({
      description: activeSession?.description ?? '',
      name: activeSession?.name ?? '',
    });
    setDefaultSessionNamePreview(getDefaultSessionName());
    setIsEndConfirmVisible(true);
  }

  async function handleEndSession(mode: EndSessionMode = 'default') {
    setIsEndConfirmVisible(false);
    setIsLongSessionPromptVisible(false);

    if (mode === 'sent') {
      await finishActiveClimb(true);
    }

    if (mode === 'incomplete') {
      await finishActiveClimb(false);
    }

    if (mode === 'discard') {
      await discardActiveClimb();
    }

    const endedSession = await endSession(sessionFinalizationDraft);

    if (endedSession) {
      router.replace({ pathname: '/session/summary', params: { sessionId: endedSession.id } });
    }
  }

  async function handleDiscardSession() {
    setIsLongSessionPromptVisible(false);
    setIsEndConfirmVisible(false);
    await discardSession();
    router.replace('/');
  }

  function handleAddNewClimb() {
    setNewClimbDraft({ colours: [], grade: sessionGradeOptions[0] ?? 'V0' });
    setIsNewClimbPickerVisible(true);
  }

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
      holdTypes: [],
    });
    setIsNewClimbPickerVisible(false);
  }

  async function handleQuickAddWarmUp() {
    await quickAddWarmUpClimb(selectedWarmUpGrade);
  }

  async function handleSentIt() {
    const finishedClimb = await finishActiveClimb(true);

    if (finishedClimb) {
      setCelebratingClimbId(finishedClimb.id);
    }
  }

  function decrementQuickGrade() {
    setSelectedWarmUpGrade(sessionGradeOptions[Math.max(0, selectedQuickGradeIndex - 1)] ?? selectedWarmUpGrade);
  }

  function incrementQuickGrade() {
    setSelectedWarmUpGrade(
      sessionGradeOptions[Math.min(sessionGradeOptions.length - 1, selectedQuickGradeIndex + 1)] ?? selectedWarmUpGrade,
    );
  }

  function createDraftForItem(item: TimelineItem): EditDraft {
    if (item.type === 'quick') {
      return {
        attemptCount: 1,
        colours: ['Blue'],
        completed: true,
        durationSeconds: 0,
        grade: item.grade,
        holdTypes: [warmUpHoldType],
        quickCount: item.count,
      };
    }

    const mainHoldType = getMainHoldType(item.climb.holdTypes.filter((holdType) => holdType !== warmUpHoldType));

    return {
      attemptCount: item.climb.attemptCount,
      colours: parseColours(item.climb.colour),
      completed: item.climb.completed,
      durationSeconds: item.climb.durationSeconds ?? 0,
      grade: item.climb.grade,
      holdTypes: mainHoldType ? [mainHoldType] : [],
      quickCount: 1,
    };
  }

  function openQuickEdit(item: TimelineItem) {
    setEditTarget(item);
    setEditDraft(createDraftForItem(item));
  }

  function toggleDraftColour(colour: string) {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }

      const nextColours = draft.colours.includes(colour)
        ? draft.colours.filter((item) => item !== colour)
        : [...draft.colours, colour].slice(0, 2);

      return { ...draft, colours: nextColours };
    });
  }

  function setDraftMainHoldType(holdType: string) {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }

      return { ...draft, holdTypes: draft.holdTypes.includes(holdType) ? [] : [holdType] };
    });
  }

  async function saveEditDraft() {
    if (!editDraft || !editTarget || !canSaveEditDraft) {
      return;
    }

    if (editTarget.type === 'quick') {
      const currentIds = editTarget.climbIds;
      const desiredCount = Math.max(1, editDraft.quickCount);
      const existingIdsToKeep = currentIds.slice(0, desiredCount);
      const existingIdsToDelete = currentIds.slice(desiredCount);

      await Promise.all(
        existingIdsToKeep.map((climbId) =>
          updateLoggedClimb(climbId, {
            attemptCount: 1,
            colour: editDraft.colours.length > 0 ? stringifyColours(editDraft.colours) : null,
            completed: true,
            durationSeconds: editDraft.durationSeconds,
            grade: editDraft.grade,
            holdTypes: [warmUpHoldType],
          }),
        ),
      );

      await Promise.all(existingIdsToDelete.map((climbId) => deleteClimb(climbId)));

      if (desiredCount > currentIds.length) {
        const addedClimbs = await Promise.all(
          Array.from({ length: desiredCount - currentIds.length }).map(() => quickAddWarmUpClimb(editDraft.grade)),
        );
        const addedClimbIds = addedClimbs.map((climb) => climb?.id).filter((id): id is string => Boolean(id));
        const reorderedItems = timelineItems.map((item) => {
          if (item !== editTarget) {
            return item;
          }

          return {
            ...item,
            climbIds: [...existingIdsToKeep, ...addedClimbIds],
            count: desiredCount,
            grade: editDraft.grade,
          };
        });

        await reorderTimeline(flattenTimelineItemIds(reorderedItems));
      }
    } else {
      await updateLoggedClimb(editTarget.climb.id, {
        attemptCount: Math.max(1, editDraft.attemptCount),
        colour: editDraft.colours.length > 0 ? stringifyColours(editDraft.colours) : null,
        completed: editDraft.completed,
        durationSeconds: editDraft.durationSeconds,
        grade: editDraft.grade,
        holdTypes: editDraft.holdTypes,
      });
    }

    setEditTarget(null);
    setEditDraft(null);
  }

  function moveTimelineItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= timelineItems.length) {
      return;
    }

    const reorderedItems = [...timelineItems];
    const [item] = reorderedItems.splice(fromIndex, 1);

    if (!item) {
      return;
    }

    reorderedItems.splice(toIndex, 0, item);
    void reorderTimeline(flattenTimelineItemIds(reorderedItems));
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Active Session</Text>
          <Text style={styles.subtitle}>
            {activeSession ? `Started ${new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Focused logging mode'}
          </Text>
        </View>
        <AppButton
          accessibilityLabel="Close active session placeholder"
          icon="x"
          onPress={() => router.push('/')}
          style={styles.closeButton}
          variant="secondary"
        />
      </View>

      <AppCard style={styles.timerCard}>
        <Text style={styles.cardLabel}>Session Time</Text>
        <TimerText seconds={elapsedSeconds} />
        <Text style={styles.placeholderCopy}>
          {activeSession
            ? 'This timer is calculated from the saved session start time.'
            : 'No active session is currently saved.'}
        </Text>
      </AppCard>

      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Feather name="triangle" size={22} color={colors.charcoal} />
          <Text style={styles.statValue}>{totals.climbsLogged}</Text>
          <Text style={styles.statLabel}>Climbs</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Feather name="bar-chart-2" size={22} color={colors.charcoal} />
          <Text style={styles.statValue}>{totals.attemptsLogged}</Text>
          <Text style={styles.statLabel}>Attempts</Text>
        </AppCard>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {activeSession ? (
        <>
          {timelineItems.length > 0 ? (
            <View style={styles.doneList}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              {timelineItems.map((item, index) => (
                <DraggableTimelineRow
                  disabled={isLoading}
                  index={index}
                  key={item.type === 'quick' ? item.id : item.climb.id}
                  onMove={moveTimelineItem}
                >
                  {item.type === 'quick' ? (
                    <QuickClimbGroupCard
                      count={item.count}
                      disabled={isLoading}
                      grade={item.grade}
                      onDelete={() => {
                        const climbId = item.climbIds[item.climbIds.length - 1];

                        if (climbId) {
                          void deleteClimb(climbId);
                        }
                      }}
                      onEdit={() => openQuickEdit(item)}
                    />
                  ) : (
                    <DoneClimbCard
                      celebrate={item.climb.id === celebratingClimbId && item.climb.completed}
                      climb={item.climb}
                      disabled={isLoading}
                      onDelete={() => void deleteClimb(item.climb.id)}
                      onEdit={() => openQuickEdit(item)}
                    />
                  )}
                </DraggableTimelineRow>
              ))}
            </View>
          ) : null}

          {activeClimb ? (
            <ActiveClimbCard
              climb={activeClimb}
              disabled={isLoading}
              gradeOptions={sessionGradeOptions}
              onAddAttempt={() => void addAttempt()}
              onDelete={() => void deleteClimb(activeClimb.id)}
              onGiveUp={() => void finishActiveClimb(false)}
              onSentIt={() => void handleSentIt()}
              onUndoAttempt={() => void undoAttempt()}
              onUpdate={(input) => void updateActiveClimb(input)}
            />
          ) : null}

          {!activeClimb ? (
            <>
              <AppCard style={styles.quickAddCard}>
                <Text style={styles.sectionTitle}>Quick Climb</Text>
                <Text style={styles.sectionHint}>{activeSession?.gradingScaleName ?? 'V Scale'}</Text>
                <View style={styles.quickAddRow}>
                  <View style={styles.quickStepper}>
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel="Decrease quick climb grade"
                      accessibilityRole="button"
                      disabled={selectedQuickGradeIndex === 0}
                      onPress={decrementQuickGrade}
                      style={[
                        styles.stepperButton,
                        styles.decrementStepperButton,
                        selectedQuickGradeIndex === 0 && styles.disabledStepperButton,
                      ]}
                    >
                      <Feather name="minus" size={18} color={destructiveRed} />
                    </TouchableOpacity>
                    <Text style={styles.stepperGrade}>{selectedWarmUpGrade}</Text>
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel="Increase quick climb grade"
                      accessibilityRole="button"
                      disabled={selectedQuickGradeIndex === sessionGradeOptions.length - 1}
                      onPress={incrementQuickGrade}
                      style={[
                        styles.stepperButton,
                        selectedQuickGradeIndex === sessionGradeOptions.length - 1 && styles.disabledStepperButton,
                      ]}
                    >
                      <Feather name="plus" size={18} color={colors.charcoal} />
                    </TouchableOpacity>
                  </View>
                  <AppButton
                    disabled={isLoading}
                    icon="zap"
                    onPress={handleQuickAddWarmUp}
                    style={styles.quickAddButton}
                    title="Quick +"
                  />
                </View>
              </AppCard>
              <AppButton
                disabled={isLoading}
                icon="plus"
                onPress={handleAddNewClimb}
                title="Add New Climb"
              />
            </>
          ) : null}

          {timelineItems.length === 0 && !activeClimb ? (
            <Text style={styles.emptyClimbsText}>Add a climb or quick-log a climb when you start moving.</Text>
          ) : null}

          {activeClimb ? <Text style={styles.activeHint}>Finish the current climb with Sent It or Give Up before adding another.</Text> : null}

          <AppButton
            disabled={isLoading}
            icon="flag"
            onPress={openEndSessionConfirm}
            title={isLoading ? 'Ending Session...' : 'End Session'}
            variant="secondary"
          />
        </>
      ) : (
        <AppButton
          disabled={isLoading}
          icon="triangle"
          onPress={handleStartSession}
          title={isLoading ? 'Starting Session...' : 'Start Session'}
        />
      )}

      {editTarget && editDraft ? (
        <Modal animationType="fade" transparent visible>
          <View style={styles.modalOverlay}>
            <AppCard style={styles.editCard}>
              <View style={styles.editHeader}>
                <Text style={styles.confirmTitle}>Quick edit</Text>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Close quick edit"
                  accessibilityRole="button"
                  onPress={() => {
                    setEditTarget(null);
                    setEditDraft(null);
                  }}
                  style={styles.editCloseButton}
                >
                  <Feather name="x" size={18} color={colors.charcoal} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.editContent}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Grade</Text>
                  <View style={styles.quickStepper}>
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel="Decrease edit grade"
                      accessibilityRole="button"
                      onPress={() => {
                        const gradeIndex = Math.max(0, sessionGradeOptions.indexOf(editDraft.grade));
                        setEditDraft({ ...editDraft, grade: sessionGradeOptions[Math.max(0, gradeIndex - 1)] ?? editDraft.grade });
                      }}
                      style={[styles.stepperButton, styles.decrementStepperButton]}
                    >
                      <Feather name="minus" size={18} color={destructiveRed} />
                    </TouchableOpacity>
                    <Text style={styles.stepperGrade}>{editDraft.grade}</Text>
                    <TouchableOpacity
                      activeOpacity={0.76}
                      accessibilityLabel="Increase edit grade"
                      accessibilityRole="button"
                      onPress={() => {
                        const gradeIndex = Math.max(0, sessionGradeOptions.indexOf(editDraft.grade));
                        setEditDraft({
                          ...editDraft,
                          grade: sessionGradeOptions[Math.min(sessionGradeOptions.length - 1, gradeIndex + 1)] ?? editDraft.grade,
                        });
                      }}
                      style={styles.stepperButton}
                    >
                      <Feather name="plus" size={18} color={colors.charcoal} />
                    </TouchableOpacity>
                  </View>
                </View>

                {editTarget?.type === 'quick' ? (
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Quantity</Text>
                    <View style={styles.quickStepper}>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel="Decrease quick climb quantity"
                        accessibilityRole="button"
                        onPress={() => setEditDraft({ ...editDraft, quickCount: Math.max(1, editDraft.quickCount - 1) })}
                        style={[styles.stepperButton, styles.decrementStepperButton]}
                      >
                        <Feather name="minus" size={18} color={destructiveRed} />
                      </TouchableOpacity>
                      <Text style={styles.stepperGrade}>{editDraft.quickCount}</Text>
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel="Increase quick climb quantity"
                        accessibilityRole="button"
                        onPress={() => setEditDraft({ ...editDraft, quickCount: editDraft.quickCount + 1 })}
                        style={styles.stepperButton}
                      >
                        <Feather name="plus" size={18} color={colors.charcoal} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.editRow}>
                      <Text style={styles.editLabel}>Attempts</Text>
                      <View style={styles.quickStepper}>
                        <TouchableOpacity
                          activeOpacity={0.76}
                          accessibilityLabel="Decrease attempts"
                          accessibilityRole="button"
                          onPress={() => setEditDraft({ ...editDraft, attemptCount: Math.max(1, editDraft.attemptCount - 1) })}
                          style={[styles.stepperButton, styles.decrementStepperButton]}
                        >
                          <Feather name="minus" size={18} color={destructiveRed} />
                        </TouchableOpacity>
                        <Text style={styles.stepperGrade}>{editDraft.attemptCount}</Text>
                        <TouchableOpacity
                          activeOpacity={0.76}
                          accessibilityLabel="Increase attempts"
                          accessibilityRole="button"
                          onPress={() => setEditDraft({ ...editDraft, attemptCount: editDraft.attemptCount + 1 })}
                          style={styles.stepperButton}
                        >
                          <Feather name="plus" size={18} color={colors.charcoal} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.editRow}>
                      <Text style={styles.editLabel}>Time</Text>
                      <View style={styles.quickStepper}>
                        <TouchableOpacity
                          activeOpacity={0.76}
                          accessibilityLabel="Decrease climb time"
                          accessibilityRole="button"
                          onPress={() =>
                            setEditDraft({ ...editDraft, durationSeconds: Math.max(0, editDraft.durationSeconds - 60) })
                          }
                          style={[styles.stepperButton, styles.decrementStepperButton]}
                        >
                          <Feather name="minus" size={18} color={destructiveRed} />
                        </TouchableOpacity>
                        <Text style={styles.stepperGrade}>{Math.round(editDraft.durationSeconds / 60)}m</Text>
                        <TouchableOpacity
                          activeOpacity={0.76}
                          accessibilityLabel="Increase climb time"
                          accessibilityRole="button"
                          onPress={() => setEditDraft({ ...editDraft, durationSeconds: editDraft.durationSeconds + 60 })}
                          style={styles.stepperButton}
                        >
                          <Feather name="plus" size={18} color={colors.charcoal} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}

                <Text style={styles.editLabel}>Colours</Text>
                <View style={styles.editOptionWrap}>
                  {climbColours.map((climbColour) => {
                    const selected = editDraft.colours.includes(climbColour.label);
                    const disabled = !selected && editDraft.colours.length >= 2;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.76}
                        accessibilityLabel={`Toggle ${climbColour.label}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={disabled}
                        key={climbColour.label}
                        onPress={() => toggleDraftColour(climbColour.label)}
                        style={[styles.editOption, selected && styles.selectedEditOption, disabled && styles.disabledEditOption]}
                      >
                        <View style={[styles.colourDot, { backgroundColor: climbColour.value }]} />
                        <Text style={styles.editOptionText}>{climbColour.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {editTarget?.type !== 'quick' ? (
                  <>
                    <Text style={styles.editLabel}>Main hold type</Text>
                    <View style={styles.editHoldOptionGrid}>
                      {holdTypes.map((holdType) => {
                        const selected = editDraft.holdTypes.includes(holdType);

                        return (
                          <TouchableOpacity
                            activeOpacity={0.76}
                            accessibilityLabel={`Toggle ${holdType}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            key={holdType}
                            onPress={() => setDraftMainHoldType(holdType)}
                            style={[styles.editHoldOption, selected && styles.selectedEditOption]}
                          >
                            {selected ? (
                              <View style={styles.editHoldOptionCheck}>
                                <Feather name="check" size={13} color={colors.charcoal} />
                              </View>
                            ) : null}
                            <HoldIcon colours={editDraft.colours} holdType={holdType} size={52} />
                            <Text style={[styles.editHoldOptionText, selected && styles.selectedEditOptionText]}>{holdType}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.editActions}>
                      <AppButton
                        icon="x-circle"
                        onPress={() => setEditDraft({ ...editDraft, completed: false })}
                        title="Gave Up"
                        variant={editDraft.completed ? 'secondary' : 'destructive'}
                      />
                      <AppButton
                        icon="check-circle"
                        onPress={() => setEditDraft({ ...editDraft, completed: true })}
                        title="Sent It"
                        variant={editDraft.completed ? 'primary' : 'secondary'}
                      />
                    </View>
                  </>
                ) : null}

                <AppButton
                  disabled={isLoading || !canSaveEditDraft}
                  icon="check"
                  onPress={() => void saveEditDraft()}
                  title="Save Changes"
                />
              </ScrollView>
            </AppCard>
          </View>
        </Modal>
      ) : null}

      <Modal animationType="fade" transparent visible={isNewClimbPickerVisible}>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.confirmTitle}>Add new climb</Text>
              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Close new climb options"
                accessibilityRole="button"
                onPress={() => setIsNewClimbPickerVisible(false)}
                style={styles.editCloseButton}
              >
                <Feather name="x" size={18} color={colors.charcoal} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editContent}>
              <Text style={styles.editLabel}>Grade</Text>
              <View style={styles.newClimbGradeSelector}>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Decrease new climb grade"
                  accessibilityRole="button"
                  disabled={newClimbGradeIndex === 0}
                  onPress={() =>
                    setNewClimbDraft({
                      ...newClimbDraft,
                      grade: sessionGradeOptions[Math.max(0, newClimbGradeIndex - 1)] ?? newClimbDraft.grade,
                    })
                  }
                  style={[styles.newClimbGradeButton, newClimbGradeIndex === 0 && styles.disabledStepperButton]}
                >
                  <Feather name="minus" size={18} color={destructiveRed} />
                </TouchableOpacity>
                <View style={styles.newClimbGradeValueWrap}>
                  <Text style={styles.newClimbGradeValue}>{newClimbDraft.grade}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Increase new climb grade"
                  accessibilityRole="button"
                  disabled={newClimbGradeIndex === sessionGradeOptions.length - 1}
                  onPress={() =>
                    setNewClimbDraft({
                      ...newClimbDraft,
                      grade: sessionGradeOptions[Math.min(sessionGradeOptions.length - 1, newClimbGradeIndex + 1)] ?? newClimbDraft.grade,
                    })
                  }
                  style={[styles.newClimbGradeButton, newClimbGradeIndex === sessionGradeOptions.length - 1 && styles.disabledStepperButton]}
                >
                  <Feather name="plus" size={18} color={colors.charcoal} />
                </TouchableOpacity>
              </View>

              <Text style={styles.editLabel}>Colour</Text>
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
                <AppButton
                  disabled={isLoading}
                  icon="x"
                  onPress={() => setIsNewClimbPickerVisible(false)}
                  title="Cancel"
                  variant="secondary"
                />
              </View>
            </ScrollView>
          </AppCard>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isEndConfirmVisible}>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{activeClimb ? 'End with active climb?' : 'End session?'}</Text>
            <Text style={styles.confirmCopy}>
              {activeClimb
                ? 'Choose how to save the climb you are currently logging before the session ends.'
                : 'This will stop the timer and save this session.'}
            </Text>
            <View style={styles.finalizationSection}>
              <Text style={styles.finalizationTitle}>Finalise session</Text>
              <Text style={styles.finalizationHint}>Leave the name blank to use {defaultSessionNamePreview}.</Text>
              <TextInput
                accessibilityLabel="Session name"
                onChangeText={(name) => setSessionFinalizationDraft((draft) => ({ ...draft, name }))}
                placeholder="Session name"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                value={sessionFinalizationDraft.name}
              />
              <TextInput
                accessibilityLabel="Session description"
                multiline
                onChangeText={(description) => setSessionFinalizationDraft((draft) => ({ ...draft, description }))}
                placeholder="Description"
                placeholderTextColor={colors.muted}
                style={[styles.textInput, styles.descriptionInput]}
                textAlignVertical="top"
                value={sessionFinalizationDraft.description}
              />
            </View>
            <View style={styles.confirmActions}>
              {activeClimb ? (
                <>
                  <AppButton
                    disabled={isLoading}
                    icon="check-circle"
                    onPress={() => void handleEndSession('sent')}
                    title={isLoading ? 'Ending Session...' : 'Sent It + End'}
                  />
                  <AppButton
                    disabled={isLoading}
                    icon="x-circle"
                    onPress={() => void handleEndSession('incomplete')}
                    title="Give Up + End"
                    variant="secondary"
                  />
                  <AppButton
                    disabled={isLoading}
                    icon="trash-2"
                    onPress={() => void handleEndSession('discard')}
                    title="Discard Climb + End"
                    variant="destructive"
                  />
                </>
              ) : (
                <AppButton
                  disabled={isLoading}
                  icon="flag"
                  onPress={() => void handleEndSession()}
                  title={isLoading ? 'Ending Session...' : 'End Session'}
                  variant="destructive"
                />
              )}
              <AppButton
                disabled={isLoading}
                icon="x"
                onPress={() => setIsEndConfirmVisible(false)}
                title="Cancel"
                variant="secondary"
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isLongSessionPromptVisible}>
        <View style={styles.modalOverlay}>
          <AppCard style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Continue old session?</Text>
            <Text style={styles.confirmCopy}>
              This session has been running for more than 6 hours. Continue logging, end it now, or discard it.
            </Text>
            <View style={styles.confirmActions}>
              <AppButton
                disabled={isLoading}
                icon="play"
                onPress={() => setIsLongSessionPromptVisible(false)}
                title="Continue"
              />
              <AppButton
                disabled={isLoading}
                icon="flag"
                onPress={() => {
                  setIsLongSessionPromptVisible(false);
                  openEndSessionConfirm();
                }}
                title="End Session"
                variant="secondary"
              />
              <AppButton
                disabled={isLoading}
                icon="trash-2"
                onPress={() => void handleDiscardSession()}
                title="Discard Session"
                variant="destructive"
              />
            </View>
          </AppCard>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h2,
    color: colors.charcoal,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    borderRadius: radius.pill,
    minHeight: 44,
    paddingHorizontal: 0,
    width: 44,
  },
  timerCard: {
    padding: spacing.xxl,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  activeHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: -spacing.sm,
  },
  activePreferenceHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: -spacing.xs,
  },
  doneList: {
    gap: spacing.md,
  },
  emptyClimbsText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  placeholderCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  quickAddButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  quickAddCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  quickAddRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  quickDeleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(184,90,59,0.1)',
    borderColor: 'rgba(184,90,59,0.34)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  quickDoneCard: {
    padding: spacing.md,
  },
  quickDoneGrade: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
  },
  quickDoneLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  quickEditButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 32,
  },
  quickDoneMain: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
  },
  quickStepper: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    overflow: 'hidden',
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
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
  },
  stepperButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 42,
  },
  decrementStepperButton: {
    backgroundColor: 'rgba(184,90,59,0.08)',
  },
  disabledStepperButton: {
    opacity: 0.36,
  },
  stepperGrade: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'center',
  },
  errorText: {
    color: '#B85A3B',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  statValue: {
    color: colors.charcoal,
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  confirmCard: {
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  confirmTitle: {
    ...typography.h2,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  confirmCopy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  descriptionInput: {
    minHeight: 92,
    paddingTop: spacing.md,
  },
  finalizationHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  finalizationSection: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  finalizationTitle: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '800',
  },
  confirmActions: {
    gap: spacing.md,
  },
  colourDot: {
    borderColor: 'rgba(30,30,30,0.16)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  disabledEditOption: {
    opacity: 0.42,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editCard: {
    maxHeight: '84%',
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
  editHoldOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    justifyContent: 'center',
    minHeight: 104,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  editHoldOptionCheck: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 22,
  },
  editHoldOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  editHoldOptionText: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  editLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  editOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  editOptionText: {
    color: colors.charcoal,
    fontSize: 13,
    fontWeight: '800',
  },
  editOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  editRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedEditOption: {
    backgroundColor: colors.mint,
    borderColor: colors.success,
  },
  selectedEditOptionText: {
    color: colors.charcoal,
  },
});
