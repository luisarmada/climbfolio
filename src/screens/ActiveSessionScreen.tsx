import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactNode } from 'react';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Animated, Easing, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { ActiveClimbCard, DoneClimbCard } from '../components/ActiveClimbCard';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { DismissibleModal } from '../components/DismissibleModal';
import { getMainFeature, HoldIcon } from '../components/HoldIcon';
import { SessionDiscardSection } from '../components/SessionDiscardSection';
import { SessionLiveStatsRow } from '../components/SessionLiveStatsRow';
import { colors, radius, spacing, typography } from '../design/tokens';
import { Climb } from '../domain/models';
import { formatEstimatedVGradeAverage, vScaleGrades } from '../domain/gradeScales';
import {
  buildFeatureSelection,
  climbColours,
  featureSections,
  getAdditionalFeatures,
  getKnownFeatures,
  isCommonFeature,
  matchesFeatureSearch,
  maxAdditionalFeatures,
  warmUpHoldType,
} from '../features/climbs';
import { useActiveSessionStore } from '../features/sessions';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';

const destructiveRed = '#B85A3B';
const longSessionThresholdSeconds = 6 * 60 * 60;
const allFeatureSectionTitles = featureSections.map((section) => section.title);

type EditTarget = TimelineItem | null;
type EditFeatureField = 'mainFeature' | 'additionalFeatures';

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

function formatFeatureDisplay(features: string[]) {
  if (features.length === 0) {
    return 'None';
  }

  if (features.length === 1) {
    return features[0] ?? 'None';
  }

  if (features.length === 2) {
    return `${features[0] ?? ''} & ${features[1] ?? ''}`;
  }

  return `${features.slice(0, -1).join(', ')}, & ${features[features.length - 1] ?? ''}`;
}

function formatClimbGradeLabel(grade: string, isTapeScale: boolean) {
  if (!isTapeScale || grade.toLocaleLowerCase().endsWith(' tape')) {
    return grade;
  }

  return `${grade} Tape`;
}

function QuickClimbGroupCard({
  count,
  disabled = false,
  grade,
  gradingScaleIsTape = false,
  onDelete,
  onEdit,
}: {
  count: number;
  disabled?: boolean;
  grade: string;
  gradingScaleIsTape?: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const gradeLabel = formatClimbGradeLabel(grade, gradingScaleIsTape);

  return (
    <AppCard style={styles.quickDoneCard}>
      <View style={styles.quickDoneMain}>
        <Feather name="zap" size={16} color={colors.charcoal} />
        <Text style={styles.quickDoneGrade}>{count > 1 ? `${count}x ${gradeLabel}` : gradeLabel}</Text>
        <Text style={styles.quickDoneLabel}>Quick climb</Text>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel={`Edit ${gradeLabel} quick climb`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onEdit}
          style={styles.quickEditButton}
        >
          <Feather name="edit-2" size={15} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel={count > 1 ? `Remove one ${gradeLabel} quick climb` : `Delete ${gradeLabel} quick climb`}
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

function EditFeatureSelectButton({
  disabled = false,
  label,
  onPress,
  value,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.editFeatureSelectButton, disabled && styles.disabledEditOption]}
    >
      <View style={styles.editFeatureSelectTextWrap}>
        <Text style={styles.editFeatureSelectLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.editFeatureSelectValue}>
          {value}
        </Text>
      </View>
      <Feather name="chevron-down" size={18} color={colors.charcoal} />
    </TouchableOpacity>
  );
}

function getGradeColourValue(grade: string) {
  return climbColours.find((climbColour) => climbColour.label === grade)?.value;
}

function TapeGradeLabel({
  grade,
  isTape,
  scale,
}: {
  grade: string;
  isTape?: boolean;
  scale?: { gradingScaleVGradeRanges: Record<string, { max: string; min: string }> };
}) {
  if (!isTape || !scale) {
    return <Text style={styles.stepperGrade}>{grade}</Text>;
  }

  return (
    <View style={styles.tapeStepperValue}>
      <View style={styles.tapeGradeMainRow}>
        <View style={[styles.tapeGradeDot, { backgroundColor: getGradeColourValue(grade) ?? colors.stone }]} />
        <Text style={styles.stepperGrade}>{grade}</Text>
      </View>
      <Text style={styles.tapeGradeEstimate}>Est. {formatEstimatedVGradeAverage(grade, scale)}</Text>
    </View>
  );
}

export function ActiveSessionScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const screenProgress = useRef(new Animated.Value(1)).current;
  const isClosingActiveSessionRef = useRef(false);
  const [selectedWarmUpGrade, setSelectedWarmUpGrade] = useState('V0');
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const addAttempt = useActiveSessionStore((state) => state.addAttempt);
  const climbs = useActiveSessionStore((state) => state.climbs);
  const deleteClimb = useActiveSessionStore((state) => state.deleteClimb);
  const discardSession = useActiveSessionStore((state) => state.discardSession);
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
  const hasLoggedTimelineClimbs = timelineItems.length > 0;
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [celebratingClimbId, setCelebratingClimbId] = useState<string | null>(null);
  const [finishPrompt, setFinishPrompt] = useState<string | null>(null);
  const [mainFeatureRequiredSignal, setMainFeatureRequiredSignal] = useState(0);
  const [longSessionPromptId, setLongSessionPromptId] = useState<string | null>(null);
  const [isLongSessionPromptVisible, setIsLongSessionPromptVisible] = useState(false);
  const [hasActiveSessionRestoreSettled, setHasActiveSessionRestoreSettled] = useState(false);
  const [isNewClimbPickerVisible, setIsNewClimbPickerVisible] = useState(false);
  const [newClimbDraft, setNewClimbDraft] = useState<NewClimbDraft>({ colours: [], grade: 'V0' });
  const [editOpenFeatureField, setEditOpenFeatureField] = useState<EditFeatureField | null>(null);
  const [editFeatureSearch, setEditFeatureSearch] = useState('');
  const [expandedEditFeatureSections, setExpandedEditFeatureSections] = useState<string[]>(allFeatureSectionTitles);
  const sessionGradeOptions = useMemo(
    () => (activeSession?.gradingScaleGrades.length ? activeSession.gradingScaleGrades : vScaleGrades),
    [activeSession?.gradingScaleGrades],
  );
  const sessionIsTapeScale = Boolean(activeSession?.gradingScaleIsTape);
  const selectedQuickGradeIndex = Math.max(0, sessionGradeOptions.indexOf(selectedWarmUpGrade));
  const newClimbGradeIndex = Math.max(0, sessionGradeOptions.indexOf(newClimbDraft.grade));
  const canStartNewClimb = Boolean(newClimbDraft.grade);
  const canSaveEditDraft = Boolean(editDraft?.grade);
  const editMainFeature = editDraft ? getMainFeature(editDraft.holdTypes) : undefined;
  const editAdditionalFeatures = editDraft ? getAdditionalFeatures(editDraft.holdTypes) : [];
  const editAdditionalFeatureLabel = editMainFeature ? formatFeatureDisplay(editAdditionalFeatures) : 'Choose main first';
  const activeSessionId = activeSession?.id ?? null;

  useEffect(() => {
    screenProgress.setValue(1);
    Animated.timing(screenProgress, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [screenProgress]);

  useEffect(() => {
    let isMounted = true;

    setHasActiveSessionRestoreSettled(false);

    void restoreActiveSession().finally(() => {
      if (isMounted) {
        setHasActiveSessionRestoreSettled(true);
      }
    });

    return () => {
      isMounted = false;
    };
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
  }, [activeSessionId]);

  useEffect(() => {
    if (
      !hasActiveSessionRestoreSettled ||
      isLoading ||
      !activeSessionId ||
      longSessionPromptId === activeSessionId ||
      elapsedSeconds < longSessionThresholdSeconds
    ) {
      return;
    }

    setLongSessionPromptId(activeSessionId);
    setIsLongSessionPromptVisible(true);
  }, [activeSessionId, elapsedSeconds, hasActiveSessionRestoreSettled, isLoading, longSessionPromptId]);

  useEffect(() => {
    if (!celebratingClimbId) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setCelebratingClimbId(null), 1600);
    return () => clearTimeout(timeoutId);
  }, [celebratingClimbId]);

  useEffect(() => {
    if (!activeClimb && hasLoggedTimelineClimbs) {
      setFinishPrompt(null);
    }
  }, [activeClimb, hasLoggedTimelineClimbs]);

  async function handleStartSession() {
    await startSession();
  }

  function openFinishSession() {
    if (activeClimb) {
      setFinishPrompt('Finish the current climb first.');
      return;
    }

    if (!hasLoggedTimelineClimbs) {
      setFinishPrompt('Add a climb first.');
      return;
    }

    router.push('/session/finish');
  }

  function closeActiveSession() {
    if (isClosingActiveSessionRef.current) {
      return;
    }

    isClosingActiveSessionRef.current = true;

    Animated.timing(screenProgress, {
      duration: 260,
      easing: Easing.in(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace('/climb');
    });
  }

  async function handleDiscardSession() {
    setIsLongSessionPromptVisible(false);
    await discardSession();
    router.replace('/climb');
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

    return {
      attemptCount: item.climb.attemptCount,
      colours: parseColours(item.climb.colour),
      completed: item.climb.completed,
      durationSeconds: item.climb.durationSeconds ?? 0,
      grade: item.climb.grade,
      holdTypes: getKnownFeatures(item.climb.holdTypes),
      quickCount: 1,
    };
  }

  function openQuickEdit(item: TimelineItem) {
    setEditOpenFeatureField(null);
    setEditFeatureSearch('');
    setExpandedEditFeatureSections(allFeatureSectionTitles);
    setEditTarget(item);
    setEditDraft(createDraftForItem(item));
  }

  function closeQuickEdit() {
    setEditOpenFeatureField(null);
    setEditTarget(null);
    setEditDraft(null);
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

  function setDraftMainFeature(feature: string) {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }

      const mainFeature = getMainFeature(draft.holdTypes);
      const additionalFeatures = getAdditionalFeatures(draft.holdTypes);
      const nextMainFeature = mainFeature === feature ? null : feature;

      return {
        ...draft,
        holdTypes: buildFeatureSelection(nextMainFeature, nextMainFeature ? additionalFeatures : []),
      };
    });
  }

  function toggleDraftAdditionalFeature(feature: string) {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }

      const mainFeature = getMainFeature(draft.holdTypes);
      const additionalFeatures = getAdditionalFeatures(draft.holdTypes);
      const selected = additionalFeatures.includes(feature);
      const nextAdditionalFeatures = selected
        ? additionalFeatures.filter((item) => item !== feature)
        : [...additionalFeatures, feature].slice(0, maxAdditionalFeatures);

      return {
        ...draft,
        holdTypes: buildFeatureSelection(mainFeature, nextAdditionalFeatures),
      };
    });
  }

  function openEditFeaturePicker(field: EditFeatureField) {
    setEditFeatureSearch('');
    setExpandedEditFeatureSections(allFeatureSectionTitles);
    setEditOpenFeatureField(field);
  }

  function toggleEditFeatureSection(sectionTitle: string) {
    setExpandedEditFeatureSections((current) =>
      current.includes(sectionTitle) ? current.filter((title) => title !== sectionTitle) : [...current, sectionTitle],
    );
  }

  function renderEditFeatureSections(field: EditFeatureField | null) {
    if (!editDraft || !field) {
      return null;
    }

    const selectingAdditional = field === 'additionalFeatures';
    const mainFeature = getMainFeature(editDraft.holdTypes);
    const additionalFeatures = getAdditionalFeatures(editDraft.holdTypes);
    const shouldShowHoldIcons = editDraft.colours.length > 0;
    const sectionsWithMatches = featureSections
      .map((section) => ({
        ...section,
        features: section.features.filter(
          (feature) => matchesFeatureSearch(feature, editFeatureSearch) && (!selectingAdditional || feature !== mainFeature),
        ),
      }))
      .filter((section) => section.features.length > 0);

    if (sectionsWithMatches.length === 0) {
      return <Text style={styles.emptyFeatureSearchText}>No features found.</Text>;
    }

    return sectionsWithMatches.map((section) => {
      const expanded = expandedEditFeatureSections.includes(section.title);

      return (
        <View key={section.title} style={styles.editFeatureSection}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${section.title}`}
            accessibilityRole="button"
            onPress={() => toggleEditFeatureSection(section.title)}
            style={styles.editFeatureSectionHeader}
          >
            <Text style={styles.editFeatureSectionTitle}>{section.title}</Text>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.charcoal} />
          </TouchableOpacity>
          {expanded ? (
            <View style={section.showIcons && shouldShowHoldIcons ? styles.editHoldOptionGrid : styles.editFeatureTextGrid}>
              {section.features.map((feature) => {
                const selected = selectingAdditional ? additionalFeatures.includes(feature) : mainFeature === feature;
                const disabled = selectingAdditional && !selected && additionalFeatures.length >= maxAdditionalFeatures;
                const common = isCommonFeature(feature);

                return (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel={`Toggle ${feature}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={disabled}
                    key={feature}
                    onPress={() => (selectingAdditional ? toggleDraftAdditionalFeature(feature) : setDraftMainFeature(feature))}
                    style={[
                      section.showIcons && shouldShowHoldIcons ? styles.editHoldOption : styles.editFeatureTextOption,
                      selected && styles.selectedEditOption,
                      disabled && styles.disabledEditOption,
                    ]}
                  >
                    {selected ? (
                      <View style={styles.editHoldOptionCheck}>
                        <Feather name="check" size={13} color={colors.charcoal} />
                      </View>
                    ) : null}
                    {section.showIcons && shouldShowHoldIcons ? (
                      <HoldIcon colours={editDraft.colours} holdType={feature} size={52} />
                    ) : null}
                    <View style={styles.editFeatureOptionLabelRow}>
                      <Text
                        numberOfLines={section.showIcons && shouldShowHoldIcons ? 1 : 2}
                        style={[
                          section.showIcons && shouldShowHoldIcons ? styles.editHoldOptionText : styles.editFeatureTextOptionText,
                          selected && styles.selectedEditOptionText,
                        ]}
                      >
                        {feature}
                      </Text>
                      {common ? <FontAwesome name="star" size={14} color={colors.amber} style={styles.commonFeatureStar} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      );
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

    setEditOpenFeatureField(null);
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

  const screenTranslateY = screenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateY: screenTranslateY }] }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel="Return to climb page"
          accessibilityRole="button"
          onPress={closeActiveSession}
          style={styles.returnButton}
        >
          <Feather name="chevron-down" size={22} color={colors.charcoal} />
          <View>
            <Text style={styles.title}>Active Session</Text>
          </View>
        </TouchableOpacity>
        <AppButton
          accessibilityLabel="Finish session"
          disabled={isLoading}
          icon="flag"
          onPress={openFinishSession}
          style={[styles.finishButton, styles.finishActionButton]}
          title="Finish"
          variant="secondary"
        />
      </View>

      <SessionLiveStatsRow attempts={totals.attemptsLogged} climbs={totals.climbsLogged} elapsedSeconds={elapsedSeconds} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {finishPrompt ? <Text style={styles.errorText}>{finishPrompt}</Text> : null}

      {activeSession ? (
        <>
          <View style={styles.doneList}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {timelineItems.length > 0 ? (
              timelineItems.map((item, index) => (
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
                      gradingScaleIsTape={sessionIsTapeScale}
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
                      gradingScaleIsTape={sessionIsTapeScale}
                      onDelete={() => void deleteClimb(item.climb.id)}
                      onEdit={() => openQuickEdit(item)}
                    />
                  )}
                </DraggableTimelineRow>
              ))
            ) : (
              <AppCard style={styles.emptyTimelineCard}>
                <Text style={styles.emptyClimbsText}>
                  {activeClimb
                    ? 'Finished climbs will appear here once you complete this climb.'
                    : 'Use the climb controls below to start logging your first climb.'}
                </Text>
              </AppCard>
            )}
          </View>

          <View style={styles.timelineDivider} />

          {activeClimb ? (
            <ActiveClimbCard
              climb={activeClimb}
              disabled={isLoading}
              gradeOptions={sessionGradeOptions}
              gradingScaleIsTape={sessionIsTapeScale}
              gradingScaleVGradeRanges={activeSession.gradingScaleVGradeRanges}
              mainFeatureRequiredSignal={mainFeatureRequiredSignal}
              onAddAttempt={() => void addAttempt()}
              onDelete={() => void deleteClimb(activeClimb.id)}
              onAnotherTime={() => void finishActiveClimb(false)}
              onSentIt={() => void handleSentIt()}
              onUndoAttempt={() => void undoAttempt()}
              onUpdate={(input) => void updateActiveClimb(input)}
            />
          ) : null}

          {!activeClimb ? (
            <>
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
                  <TapeGradeLabel grade={selectedWarmUpGrade} isTape={sessionIsTapeScale} scale={activeSession ?? undefined} />
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
                <TouchableOpacity
                  activeOpacity={0.82}
                  accessibilityLabel="Quick add climb"
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={handleQuickAddWarmUp}
                  style={[styles.quickAddButton, isLoading && styles.disabledControl]}
                >
                  <Feather name="plus" size={18} color={colors.white} />
                  <Feather name="zap" size={16} color={colors.white} />
                  <Text style={styles.quickAddButtonText}>Quick Add</Text>
                </TouchableOpacity>
              </View>
              <AppButton
                disabled={isLoading}
                icon="plus"
                onPress={handleAddNewClimb}
                title="Add New Climb"
              />
              <View style={styles.secondaryControlRow}>
                <AppButton
                  disabled={isLoading}
                  icon="settings"
                  onPress={() => undefined}
                  style={styles.secondaryControlButton}
                  title="Settings"
                  variant="secondary"
                />
                <SessionDiscardSection disabled={isLoading} onDiscard={handleDiscardSession} style={styles.secondaryControlButton} />
              </View>
            </>
          ) : null}

          {activeClimb ? <Text style={styles.activeHint}>Finish the current climb with Sent It or Another Time before adding another.</Text> : null}
          {activeClimb ? <SessionDiscardSection disabled={isLoading} onDiscard={handleDiscardSession} style={styles.discardButton} /> : null}
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
        <DismissibleModal onDismiss={closeQuickEdit} visible>
          <AppCard style={styles.editCard}>
              <View style={styles.editHeader}>
                <Text style={styles.confirmTitle}>Quick edit</Text>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Close quick edit"
                  accessibilityRole="button"
                  onPress={closeQuickEdit}
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
                    <TapeGradeLabel grade={editDraft.grade} isTape={sessionIsTapeScale} scale={activeSession ?? undefined} />
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

                <Text style={styles.editLabel}>Hold colour</Text>
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
                    <Text style={styles.editLabel}>Features</Text>
                    <View style={styles.editFeatureButtonGroup}>
                      <EditFeatureSelectButton
                        label="Change main feature"
                        onPress={() => openEditFeaturePicker('mainFeature')}
                        value={editMainFeature ?? 'None'}
                      />
                      <EditFeatureSelectButton
                        disabled={!editMainFeature}
                        label="Change additional features"
                        onPress={() => openEditFeaturePicker('additionalFeatures')}
                        value={editAdditionalFeatureLabel}
                      />
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
        </DismissibleModal>
      ) : null}

      {editTarget && editDraft && editOpenFeatureField ? (
        <DismissibleModal onDismiss={() => setEditOpenFeatureField(null)} visible>
          <AppCard style={styles.editCard}>
              <View style={styles.editHeader}>
                <View>
                  <Text style={styles.confirmTitle}>
                    {editOpenFeatureField === 'additionalFeatures' ? 'Additional features' : 'Main feature'}
                  </Text>
                  {editOpenFeatureField === 'additionalFeatures' ? (
                    <Text style={styles.editFeaturePickerHint}>Choose up to {maxAdditionalFeatures}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Close feature picker"
                  accessibilityRole="button"
                  onPress={() => setEditOpenFeatureField(null)}
                  style={styles.editCloseButton}
                >
                  <Feather name="x" size={18} color={colors.charcoal} />
                </TouchableOpacity>
              </View>

              <View style={styles.featureSearchBox}>
                <Feather name="search" size={17} color={colors.muted} />
                <TextInput
                  accessibilityLabel={
                    editOpenFeatureField === 'additionalFeatures' ? 'Search additional features' : 'Search main features'
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setEditFeatureSearch}
                  placeholder="Search"
                  placeholderTextColor={colors.muted}
                  style={styles.featureSearchInput}
                  value={editFeatureSearch}
                />
                {editFeatureSearch ? (
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel="Clear feature search"
                    accessibilityRole="button"
                    onPress={() => setEditFeatureSearch('')}
                    style={styles.featureSearchClearButton}
                  >
                    <Feather name="x" size={16} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView contentContainerStyle={styles.editFeatureSectionList}>
                {renderEditFeatureSections(editOpenFeatureField)}
              </ScrollView>
              <AppButton icon="check" onPress={() => setEditOpenFeatureField(null)} title="Done" />
            </AppCard>
        </DismissibleModal>
      ) : null}

      <DismissibleModal onDismiss={() => setIsNewClimbPickerVisible(false)} visible={isNewClimbPickerVisible}>
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
              {sessionIsTapeScale ? (
                <View style={styles.tapeGradeGrid}>
                  {sessionGradeOptions.map((grade) => {
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
                          Est. {formatEstimatedVGradeAverage(grade, activeSession ?? { gradingScaleVGradeRanges: {} })}
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
              )}

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
      </DismissibleModal>

      <DismissibleModal onDismiss={() => setIsLongSessionPromptVisible(false)} visible={isLongSessionPromptVisible}>
          <AppCard style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Continue old session?</Text>
            <Text style={styles.confirmCopy}>
              This session has been running for more than 6 hours. Continue logging, end it now, or discard it.
            </Text>
            <View style={styles.confirmActions}>
              <AppButton
                icon="play"
                onPress={() => setIsLongSessionPromptVisible(false)}
                title="Continue"
              />
              <AppButton
                disabled={isLoading}
                icon="flag"
                onPress={() => {
                  setIsLongSessionPromptVisible(false);
                  openFinishSession();
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
      </DismissibleModal>
    </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  returnButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.charcoal,
    fontSize: 24,
    lineHeight: 29,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  finishButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  finishActionButton: {
    backgroundColor: colors.amber,
    borderColor: 'rgba(30,30,30,0.1)',
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
  emptyTimelineCard: {
    backgroundColor: colors.surfaceSoft,
    borderStyle: 'dashed',
    padding: spacing.lg,
  },
  emptyClimbsText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  timelineDivider: {
    backgroundColor: colors.stone,
    height: 1,
    marginVertical: spacing.xs,
    width: '100%',
  },
  quickAddButton: {
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  quickAddButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
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
  sectionTitle: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryControlButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  secondaryControlRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  screen: {
    flex: 1,
  },
  discardButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.md,
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
  disabledControl: {
    opacity: 0.48,
  },
  stepperGrade: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'center',
  },
  tapeGradeDot: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  tapeGradeEstimate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
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
  tapeGradeMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
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
  tapeStepperValue: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    color: '#B85A3B',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmCard: {
    maxHeight: '100%',
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
  editFeatureSection: {
    gap: spacing.sm,
    width: '100%',
  },
  editFeatureSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  editFeatureSectionList: {
    gap: spacing.lg,
  },
  editFeatureButtonGroup: {
    gap: spacing.sm,
  },
  editFeaturePickerHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  editFeatureSelectButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  editFeatureSelectLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  editFeatureSelectTextWrap: {
    flex: 1,
  },
  editFeatureSelectValue: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  editFeatureSectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  editFeatureTextGrid: {
    gap: spacing.sm,
    width: '100%',
  },
  editFeatureTextOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  editFeatureTextOptionText: {
    color: colors.charcoal,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'left',
  },
  editFeatureOptionLabelRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  commonFeatureStar: {
    marginLeft: spacing.sm,
  },
  emptyFeatureSearchText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  featureSearchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  featureSearchClearButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  featureSearchInput: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 42,
    paddingVertical: 0,
  },
  editHoldOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-start',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
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
    gap: spacing.sm,
    width: '100%',
  },
  editHoldOptionText: {
    color: colors.charcoal,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'left',
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
