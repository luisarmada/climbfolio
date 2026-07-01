import { useEffect, useState } from 'react';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Href, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { DismissibleModal } from '../components/DismissibleModal';
import { getMainFeature, HoldIcon } from '../components/HoldIcon';
import { SavedSessionEditorModal } from '../components/SavedSessionEditorModal';
import { formatEstimatedVGradeAverage } from '../domain/gradeScales';
import { Climb } from '../domain/models';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import {
  buildFeatureSelection,
  climbColours,
  climbService,
  featureSections,
  getAdditionalFeatures,
  isCommonFeature,
  matchesFeatureSearch,
  maxAdditionalFeatures,
  normalizeFeature,
} from '../features/climbs';
import { getClimbScaleSnapshot } from '../features/climbs/climbScale';
import { getSessionDisplayName } from '../features/sessions';
import {
  formatDuration,
  formatOneDecimal,
  formatSessionDate,
  formatSessionTime,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';
import { useToastStore } from '../features/toasts';
import { getErrorMessage } from '../utils/errorMessage';
import { inputLimits, limitInput } from '../utils/inputValidation';

type ClimbEditDraft = {
  attemptCount: number;
  colours: string[];
  completed: boolean;
  grade: string;
  holdTypes: string[];
};

type FeaturePickerField = 'mainFeature' | 'additionalFeatures';

const destructiveRed = '#B85A3B';
const allFeatureSectionTitles = featureSections.map((section) => section.title);

function parseColours(colour: string | null) {
  return colour?.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 2) ?? [];
}

function stringifyColours(colours: string[]) {
  return colours.join(', ');
}

function formatColourDisplay(colour: string | null) {
  return parseColours(colour).join(' & ') || 'No hold colour';
}

function formatFeatureDisplay(features: string[]) {
  return features.length > 0 ? features.map(normalizeFeature).join(', ') : 'No feature selected';
}

function formatClimbGradeLabel(climb: Climb) {
  if (!climb.gradingScaleIsTape || climb.grade.toLocaleLowerCase().endsWith(' tape')) {
    return climb.grade;
  }

  return `${climb.grade} Tape`;
}

function getGradeColourValue(grade: string) {
  return climbColours.find((climbColour) => climbColour.label === grade)?.value;
}

export function SessionDetailScreen() {
  const { goBackWithTransition } = useProfileReturnTransition();
  const { date, feature, grade, locationId, returnTo, scaleKey, sessionId } = useLocalSearchParams<{
    date?: string;
    feature?: string;
    grade?: string;
    locationId?: string;
    returnTo?: string;
    scaleKey?: string;
    sessionId: string;
  }>();
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClimbSaving, setIsClimbSaving] = useState(false);
  const [editingClimb, setEditingClimb] = useState<Climb | null>(null);
  const [climbDraft, setClimbDraft] = useState<ClimbEditDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Climb | null>(null);
  const [climbEditError, setClimbEditError] = useState<string | null>(null);
  const [openFeaturePicker, setOpenFeaturePicker] = useState<FeaturePickerField | null>(null);
  const [featureSearch, setFeatureSearch] = useState('');
  const [expandedFeatureSections, setExpandedFeatureSections] = useState<string[]>(allFeatureSectionTitles);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const showError = useToastStore((state) => state.showError);
  const showSuccess = useToastStore((state) => state.showSuccess);
  const openedFromCollectionCell = returnTo === 'collectionCell';
  const openedFromCalendar = returnTo === 'calendar';
  const openedFromCalendarDay = returnTo === 'calendarDay';
  const openedFromHome = returnTo === 'home';
  const calendarDayFallback: Href = date
    ? { pathname: '/calendar/day/[date]', params: { date } }
    : '/calendar';
  const collectionCellFallback: Href = feature && grade
    ? {
        pathname: '/collection/cell',
        params: {
          feature,
          grade,
          locationId: locationId ?? '',
          scaleKey: scaleKey ?? '',
        },
      }
    : '/collection';
  const backFallback: Href = openedFromCollectionCell
    ? collectionCellFallback
    : openedFromCalendarDay
      ? calendarDayFallback
      : openedFromCalendar
        ? '/calendar'
        : openedFromHome
          ? '/'
          : '/profile';
  const backAccessibilityLabel = openedFromCollectionCell
    ? 'Back to cell sessions'
    : openedFromCalendarDay
      ? 'Back to day sessions'
      : openedFromCalendar
        ? 'Back to calendar'
        : openedFromHome
          ? 'Back to home'
          : 'Back to profile';
  const handleBack = () => goBackWithTransition(backFallback);
  const editingScale = summary && editingClimb ? getClimbScaleSnapshot(editingClimb, summary.session) : null;
  const editGradeOptions = editingScale?.gradingScaleGrades.length ? editingScale.gradingScaleGrades : [];
  const editGradeIndex = climbDraft ? Math.max(0, editGradeOptions.indexOf(climbDraft.grade)) : 0;
  const editMainFeature = climbDraft ? getMainFeature(climbDraft.holdTypes) : undefined;
  const editAdditionalFeatures = climbDraft ? getAdditionalFeatures(climbDraft.holdTypes) : [];

  function renderHeader(title: string) {
    return (
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel={backAccessibilityLabel}
          accessibilityRole="button"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      const nextSummary = await sessionSummaryService.getSessionSummary(sessionId);

      if (isMounted) {
        setSummary(nextSummary);
        setIsLoading(false);
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  async function reloadSummary(message?: string) {
    if (!summary) {
      return null;
    }

    const nextSummary = await sessionSummaryService.getSessionSummary(summary.session.id);

    if (nextSummary) {
      setSummary(nextSummary);
      setSavedMessage(message ?? null);
      if (message) {
        showSuccess(message.replace(/\.$/, ''));
      }
    }

    return nextSummary;
  }

  function openClimbEditor(climb: Climb) {
    setEditingClimb(climb);
    setClimbDraft({
      attemptCount: climb.attemptCount,
      colours: parseColours(climb.colour),
      completed: climb.completed,
      grade: climb.grade,
      holdTypes: climb.holdTypes,
    });
    setClimbEditError(null);
    setSavedMessage(null);
  }

  function closeClimbEditor() {
    if (isClimbSaving) {
      return;
    }

    setEditingClimb(null);
    setClimbDraft(null);
    setClimbEditError(null);
    setOpenFeaturePicker(null);
    setFeatureSearch('');
  }

  function updateClimbDraft(input: Partial<ClimbEditDraft>) {
    setClimbDraft((draft) => (draft ? { ...draft, ...input } : draft));
  }

  function adjustDraftGrade(offset: number) {
    if (!climbDraft || editGradeOptions.length === 0) {
      return;
    }

    const nextIndex = Math.min(editGradeOptions.length - 1, Math.max(0, editGradeIndex + offset));
    updateClimbDraft({ grade: editGradeOptions[nextIndex] ?? climbDraft.grade });
  }

  function toggleDraftColour(colour: string) {
    if (!climbDraft) {
      return;
    }

    const nextColours = climbDraft.colours.includes(colour)
      ? climbDraft.colours.filter((item) => item !== colour)
      : [...climbDraft.colours, colour].slice(0, 2);

    updateClimbDraft({ colours: nextColours });
  }

  function updateDraftMainFeature(feature: string) {
    if (!climbDraft) {
      return;
    }

    const nextMainFeature = editMainFeature === feature ? null : feature;

    updateClimbDraft({
      holdTypes: buildFeatureSelection(nextMainFeature, nextMainFeature ? editAdditionalFeatures : []),
    });
  }

  function toggleDraftAdditionalFeature(feature: string) {
    if (!climbDraft || !editMainFeature) {
      return;
    }

    const selected = editAdditionalFeatures.includes(feature);
    const nextAdditionalFeatures = selected
      ? editAdditionalFeatures.filter((item) => item !== feature)
      : [...editAdditionalFeatures, feature].slice(0, maxAdditionalFeatures);

    updateClimbDraft({
      holdTypes: buildFeatureSelection(editMainFeature, nextAdditionalFeatures),
    });
  }

  function openClimbFeaturePicker(field: FeaturePickerField) {
    setFeatureSearch('');
    setExpandedFeatureSections(allFeatureSectionTitles);
    setOpenFeaturePicker(field);
  }

  function toggleFeatureSection(sectionTitle: string) {
    setExpandedFeatureSections((current) =>
      current.includes(sectionTitle) ? current.filter((title) => title !== sectionTitle) : [...current, sectionTitle],
    );
  }

  function renderFeaturePickerOptions() {
    if (!openFeaturePicker || !climbDraft) {
      return null;
    }

    const selectingAdditional = openFeaturePicker === 'additionalFeatures';
    const sectionsWithMatches = featureSections
      .map((section) => ({
        ...section,
        features: section.features.filter(
          (featureValue) => matchesFeatureSearch(featureValue, featureSearch) && (!selectingAdditional || featureValue !== editMainFeature),
        ),
      }))
      .filter((section) => section.features.length > 0);

    if (sectionsWithMatches.length === 0) {
      return <Text style={styles.emptyFeatureSearchText}>No features found.</Text>;
    }

    return sectionsWithMatches.map((section) => {
      const expanded = expandedFeatureSections.includes(section.title);

      return (
        <View key={section.title} style={styles.featureSection}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${section.title}`}
            accessibilityRole="button"
            onPress={() => toggleFeatureSection(section.title)}
            style={styles.featureSectionHeader}
          >
            <Text style={styles.featureSectionTitle}>{section.title}</Text>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.charcoal} />
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.featureOptionList}>
              {section.features.map((featureValue) => {
                const selected = selectingAdditional ? editAdditionalFeatures.includes(featureValue) : editMainFeature === featureValue;
                const disabled = selectingAdditional && !selected && editAdditionalFeatures.length >= maxAdditionalFeatures;
                const showIcon = section.showIcons && climbDraft.colours.length > 0;

                return (
                  <FeatureOptionTile
                    colours={climbDraft.colours}
                    disabled={disabled || isClimbSaving}
                    feature={featureValue}
                    key={featureValue}
                    onPress={() => (selectingAdditional ? toggleDraftAdditionalFeature(featureValue) : updateDraftMainFeature(featureValue))}
                    selected={selected}
                    showIcon={showIcon}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      );
    });
  }

  async function saveClimbEditor() {
    if (!summary || !editingClimb || !climbDraft || !editingScale) {
      return;
    }

    setIsClimbSaving(true);
    setClimbEditError(null);

    try {
      await climbService.updateLoggedClimb(editingClimb.id, {
        attemptCount: climbDraft.attemptCount,
        colour: climbDraft.colours.length > 0 ? stringifyColours(climbDraft.colours) : null,
        completed: climbDraft.completed,
        durationSeconds: editingClimb.durationSeconds,
        grade: climbDraft.grade,
        gradingScaleGrades: editingScale.gradingScaleGrades,
        gradingScaleIsTape: editingScale.gradingScaleIsTape,
        gradingScaleName: editingScale.gradingScaleName,
        gradingScaleType: editingScale.gradingScaleType,
        gradingScaleVGradeRanges: editingScale.gradingScaleVGradeRanges,
        holdTypes: climbDraft.holdTypes,
      });
      await reloadSummary('Climb saved.');
      setEditingClimb(null);
      setClimbDraft(null);
      setClimbEditError(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Could not save climb.');
      setClimbEditError(message);
      showError('Climb was not saved', message);
    } finally {
      setIsClimbSaving(false);
    }
  }

  async function moveClimb(index: number, direction: -1 | 1) {
    if (!summary || isClimbSaving) {
      return;
    }

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= summary.climbs.length) {
      return;
    }

    const nextClimbs = [...summary.climbs];
    const [movedClimb] = nextClimbs.splice(index, 1);

    if (!movedClimb) {
      return;
    }

    nextClimbs.splice(nextIndex, 0, movedClimb);
    setIsClimbSaving(true);

    try {
      await climbService.reorderSessionClimbs(summary.session.id, nextClimbs.map((climb) => climb.id));
      await reloadSummary('Climbs reordered.');
    } catch (reorderError) {
      showError('Climbs were not reordered', getErrorMessage(reorderError, 'Could not reorder climbs.'));
    } finally {
      setIsClimbSaving(false);
    }
  }

  async function deleteSavedClimb() {
    if (!deleteTarget) {
      return;
    }

    setIsClimbSaving(true);

    try {
      await climbService.deleteClimb(deleteTarget.id);
      setDeleteTarget(null);
      await reloadSummary('Climb deleted.');
    } catch (deleteError) {
      showError('Climb was not deleted', getErrorMessage(deleteError, 'Could not delete climb.'));
    } finally {
      setIsClimbSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        {renderHeader('Session Detail')}
        <Text style={styles.subtitle}>Loading climbs...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeader('Session Detail')}
        <Text style={styles.subtitle}>No saved session was found.</Text>
      </ScrollView>
    );
  }

  const sessionTitle = getSessionDisplayName(summary.session);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {renderHeader('Saved Session')}
      <Text style={styles.subtitle}>{formatSessionDate(summary.session.startTime)}, {formatSessionTime(summary.session.startTime)}</Text>

      <AppCard style={styles.summaryCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderCopy}>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.cardTitle}>{sessionTitle}</Text>
            {savedMessage ? <Text style={styles.savedText}>{savedMessage}</Text> : null}
          </View>
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel="Open session actions"
            accessibilityRole="button"
            onPress={() => {
              setSavedMessage(null);
              setIsEditorVisible(true);
            }}
            style={styles.iconButton}
          >
            <Feather name="more-horizontal" size={18} color={colors.charcoal} />
          </TouchableOpacity>
        </View>

        <View style={styles.detailStack}>
          <Text ellipsizeMode="tail" numberOfLines={4} style={styles.sessionDescription}>{summary.session.description ?? 'No description added.'}</Text>
          <View style={styles.metadataRow}>
            <Feather name="map-pin" size={16} color={colors.muted} />
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.metadataText}>{summary.session.locationName ?? 'Location not set'}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View>
            <Text style={styles.summaryValue}>{formatDuration(summary.session.durationSeconds)}</Text>
            <Text style={styles.summaryLabel}>Duration</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{summary.totalClimbs}</Text>
            <Text style={styles.summaryLabel}>Climbs</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{summary.completionRate}%</Text>
            <Text style={styles.summaryLabel}>Sent</Text>
          </View>
          <View>
            <Text style={styles.summaryValue}>{formatOneDecimal(summary.averageAttemptsPerClimb)}</Text>
            <Text style={styles.summaryLabel}>Avg tries</Text>
          </View>
        </View>

      </AppCard>

      {summary.climbs.length === 0 ? (
        <AppCard style={styles.emptyClimbs}>
          <View style={styles.emptyIcon}>
            <Feather name="list" size={24} color={colors.charcoal} />
          </View>
          <Text style={styles.emptyTitle}>No climbs saved</Text>
          <Text style={styles.copy}>This session ended without saved climbs.</Text>
        </AppCard>
      ) : (
        <View style={styles.climbList}>
          {summary.climbs.map((climb, index) => (
            <AppCard key={climb.id} style={styles.climbCard}>
              <View style={styles.climbTopRow}>
                <View style={styles.climbCopy}>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.climbTitle}>
                    {index + 1}. {formatClimbGradeLabel(climb)}
                  </Text>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.climbMeta}>
                    {formatColourDisplay(climb.colour)} - {climb.completed ? 'Sent it' : 'Another time'}
                  </Text>
                </View>
                <View style={styles.climbTopActions}>
                  <View style={[styles.statusPill, climb.completed ? styles.sentPill : styles.anotherTimePill]}>
                    <Text style={styles.statusText}>{climb.completed ? 'Sent' : 'Tried'}</Text>
                  </View>
                  <View style={styles.climbActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      accessibilityLabel={`Move ${climb.grade} climb up`}
                      accessibilityRole="button"
                      disabled={index === 0 || isClimbSaving}
                      onPress={() => void moveClimb(index, -1)}
                      style={[styles.climbActionButton, (index === 0 || isClimbSaving) && styles.disabledAction]}
                    >
                      <Feather name="arrow-up" size={15} color={colors.charcoal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      accessibilityLabel={`Move ${climb.grade} climb down`}
                      accessibilityRole="button"
                      disabled={index === summary.climbs.length - 1 || isClimbSaving}
                      onPress={() => void moveClimb(index, 1)}
                      style={[styles.climbActionButton, (index === summary.climbs.length - 1 || isClimbSaving) && styles.disabledAction]}
                    >
                      <Feather name="arrow-down" size={15} color={colors.charcoal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      accessibilityLabel={`Edit ${climb.grade} climb`}
                      accessibilityRole="button"
                      disabled={isClimbSaving}
                      onPress={() => openClimbEditor(climb)}
                      style={[styles.climbActionButton, isClimbSaving && styles.disabledAction]}
                    >
                      <Feather name="edit-2" size={15} color={colors.charcoal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      accessibilityLabel={`Delete ${climb.grade} climb`}
                      accessibilityRole="button"
                      disabled={isClimbSaving}
                      onPress={() => setDeleteTarget(climb)}
                      style={[styles.climbDeleteButton, isClimbSaving && styles.disabledAction]}
                    >
                      <Feather name="trash-2" size={15} color={destructiveRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.climbDetail}>
                {climb.attemptCount} {climb.attemptCount === 1 ? 'attempt' : 'attempts'} - {formatDuration(climb.durationSeconds)}
              </Text>
              <Text ellipsizeMode="tail" numberOfLines={2} style={styles.climbDetail}>
                {formatFeatureDisplay(climb.holdTypes)}
              </Text>
            </AppCard>
          ))}
        </View>
      )}

      <SavedSessionEditorModal
        onDeleted={() => goBackWithTransition(backFallback)}
        onDismiss={() => setIsEditorVisible(false)}
        onSaved={(nextSummary) => {
          setSummary(nextSummary);
          setSavedMessage('Session details saved.');
        }}
        summary={summary}
        visible={isEditorVisible}
      />

      <DismissibleModal onDismiss={closeClimbEditor} visible={Boolean(editingClimb && climbDraft)}>
        <AppCard style={styles.climbEditorCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit climb</Text>
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityLabel="Close climb editor"
              accessibilityRole="button"
              disabled={isClimbSaving}
              onPress={closeClimbEditor}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          {climbDraft && editingClimb && editingScale ? (
            <ScrollView contentContainerStyle={styles.climbEditorContent} showsVerticalScrollIndicator={false}>
              {climbEditError ? <Text style={styles.errorText}>{climbEditError}</Text> : null}

              <View style={styles.editorSection}>
                <Text style={styles.editorLabel}>Grade</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityLabel="Decrease climb grade"
                    accessibilityRole="button"
                    disabled={editGradeIndex === 0 || isClimbSaving}
                    onPress={() => adjustDraftGrade(-1)}
                    style={[styles.stepperButton, (editGradeIndex === 0 || isClimbSaving) && styles.disabledAction]}
                  >
                    <Feather name="minus" size={18} color={destructiveRed} />
                  </TouchableOpacity>
                  <View style={styles.stepperValueWrap}>
                    {editingScale.gradingScaleIsTape ? (
                      <View style={styles.tapeGradeRow}>
                        <View style={[styles.tapeGradeDot, { backgroundColor: getGradeColourValue(climbDraft.grade) ?? colors.stone }]} />
                        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.stepperValue}>{climbDraft.grade} Tape</Text>
                      </View>
                    ) : (
                      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.stepperValue}>{climbDraft.grade}</Text>
                    )}
                    {editingScale.gradingScaleIsTape ? (
                      <Text style={styles.tapeGradeMeta}>Est. {formatEstimatedVGradeAverage(climbDraft.grade, editingScale)}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityLabel="Increase climb grade"
                    accessibilityRole="button"
                    disabled={editGradeIndex === editGradeOptions.length - 1 || isClimbSaving}
                    onPress={() => adjustDraftGrade(1)}
                    style={[styles.stepperButton, (editGradeIndex === editGradeOptions.length - 1 || isClimbSaving) && styles.disabledAction]}
                  >
                    <Feather name="plus" size={18} color={colors.charcoal} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editorSection}>
                <Text style={styles.editorLabel}>Attempts</Text>
                <View style={styles.compactStepper}>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityLabel="Decrease attempts"
                    accessibilityRole="button"
                    disabled={climbDraft.attemptCount <= 1 || isClimbSaving}
                    onPress={() => updateClimbDraft({ attemptCount: Math.max(1, climbDraft.attemptCount - 1) })}
                    style={[styles.compactStepperButton, (climbDraft.attemptCount <= 1 || isClimbSaving) && styles.disabledAction]}
                  >
                    <Feather name="minus" size={16} color={destructiveRed} />
                  </TouchableOpacity>
                  <Text style={styles.compactStepperValue}>{climbDraft.attemptCount}</Text>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    accessibilityLabel="Increase attempts"
                    accessibilityRole="button"
                    disabled={isClimbSaving}
                    onPress={() => updateClimbDraft({ attemptCount: climbDraft.attemptCount + 1 })}
                    style={[styles.compactStepperButton, isClimbSaving && styles.disabledAction]}
                  >
                    <Feather name="plus" size={16} color={colors.charcoal} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editorSection}>
                <Text style={styles.editorLabel}>Outcome</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel="Mark climb as another time"
                    accessibilityRole="button"
                    disabled={isClimbSaving}
                    onPress={() => updateClimbDraft({ completed: false })}
                    style={[styles.toggleButton, !climbDraft.completed && styles.selectedToggleButton]}
                  >
                    <Text style={styles.toggleText}>Another Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.76}
                    accessibilityLabel="Mark climb as sent"
                    accessibilityRole="button"
                    disabled={isClimbSaving}
                    onPress={() => updateClimbDraft({ completed: true })}
                    style={[styles.toggleButton, climbDraft.completed && styles.selectedToggleButton]}
                  >
                    <Text style={styles.toggleText}>Sent It</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editorSection}>
                <View style={styles.inlineLabelRow}>
                  <Text style={styles.editorLabel}>Hold colour</Text>
                  <Text style={styles.optionalLabel}>Optional</Text>
                </View>
                <View style={styles.colourOptionWrap}>
                  {climbColours.map((climbColour) => {
                    const selected = climbDraft.colours.includes(climbColour.label);
                    const disabled = !selected && climbDraft.colours.length >= 2;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.72}
                        accessibilityLabel={`Toggle ${climbColour.label}`}
                        accessibilityRole="button"
                        disabled={disabled || isClimbSaving}
                        key={climbColour.label}
                        onPress={() => toggleDraftColour(climbColour.label)}
                        style={[styles.colourOption, selected && styles.selectedOption, (disabled || isClimbSaving) && styles.disabledAction]}
                      >
                        <View style={[styles.colourDot, { backgroundColor: climbColour.value }]} />
                        <Text style={styles.optionText}>{climbColour.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editorSection}>
                <FeatureSelectButton
                  disabled={isClimbSaving}
                  label="Main feature"
                  onPress={() => openClimbFeaturePicker('mainFeature')}
                  value={editMainFeature ?? 'None'}
                />
                <FeatureSelectButton
                  disabled={!editMainFeature || isClimbSaving}
                  helperText={!editMainFeature ? 'Choose a main feature first.' : undefined}
                  label="Additional features"
                  onPress={() => openClimbFeaturePicker('additionalFeatures')}
                  value={editMainFeature ? formatFeatureDisplay(editAdditionalFeatures) : 'Choose main first'}
                />
              </View>

              <AppButton
                disabled={isClimbSaving || !climbDraft.grade}
                icon="check"
                onPress={() => void saveClimbEditor()}
                title={isClimbSaving ? 'Saving...' : 'Save Climb'}
              />
            </ScrollView>
          ) : null}
        </AppCard>
      </DismissibleModal>

      <DismissibleModal onDismiss={() => setOpenFeaturePicker(null)} visible={Boolean(openFeaturePicker)}>
        <AppCard style={styles.featurePickerCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{openFeaturePicker === 'additionalFeatures' ? 'Additional features' : 'Main feature'}</Text>
              {openFeaturePicker === 'additionalFeatures' ? (
                <Text style={styles.modalSubtitle}>Choose up to {maxAdditionalFeatures}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityLabel="Close feature picker"
              accessibilityRole="button"
              onPress={() => setOpenFeaturePicker(null)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Feather name="search" size={17} color={colors.muted} />
            <TextInput
              accessibilityLabel={openFeaturePicker === 'additionalFeatures' ? 'Search additional features' : 'Search main features'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={inputLimits.featureSearch}
              onChangeText={(search) => setFeatureSearch(limitInput(search, inputLimits.featureSearch))}
              placeholder="Search"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={featureSearch}
            />
            {featureSearch ? (
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityLabel="Clear feature search"
                accessibilityRole="button"
                onPress={() => setFeatureSearch('')}
                style={styles.searchClearButton}
              >
                <Feather name="x" size={16} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView contentContainerStyle={styles.featurePickerContent} showsVerticalScrollIndicator={false}>
            {renderFeaturePickerOptions()}
          </ScrollView>
          <AppButton icon="check" onPress={() => setOpenFeaturePicker(null)} title="Done" />
        </AppCard>
      </DismissibleModal>

      <DismissibleModal onDismiss={() => setDeleteTarget(null)} visible={Boolean(deleteTarget)}>
        <AppCard style={styles.deleteConfirmCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete climb?</Text>
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityLabel="Close delete climb confirmation"
              accessibilityRole="button"
              disabled={isClimbSaving}
              onPress={() => setDeleteTarget(null)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <Text style={styles.deleteCopy}>This removes the climb from this saved session. This cannot be undone.</Text>
          <AppButton
            disabled={isClimbSaving}
            icon="trash-2"
            onPress={() => void deleteSavedClimb()}
            title={isClimbSaving ? 'Deleting...' : 'Delete climb'}
            variant="destructive"
          />
        </AppCard>
      </DismissibleModal>
    </ScrollView>
  );
}

function FeatureSelectButton({
  disabled = false,
  helperText,
  label,
  onPress,
  value,
}: {
  disabled?: boolean;
  helperText?: string;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.78}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.featureSelectButton, disabled && styles.disabledAction]}
      >
        <View style={styles.featureSelectTextWrap}>
          <Text style={styles.featureSelectLabel}>{label}</Text>
          <Text numberOfLines={1} style={styles.featureSelectValue}>{value}</Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.charcoal} />
      </TouchableOpacity>
      {helperText ? <Text style={styles.featureSelectHint}>{helperText}</Text> : null}
    </View>
  );
}

function FeatureOptionTile({
  colours,
  disabled = false,
  feature,
  onPress,
  selected,
  showIcon,
}: {
  colours: string[];
  disabled?: boolean;
  feature: string;
  onPress: () => void;
  selected: boolean;
  showIcon: boolean;
}) {
  const common = isCommonFeature(feature);

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityLabel={feature}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.featureOption, selected && styles.selectedOption, disabled && styles.disabledAction]}
    >
      {showIcon ? <HoldIcon colours={colours} holdType={feature} size={40} /> : null}
      <View style={styles.featureOptionLabelRow}>
        <Text numberOfLines={showIcon ? 1 : 2} style={styles.featureOptionText}>{feature}</Text>
        {common ? <FontAwesome name="star" size={14} color={colors.amber} style={styles.commonFeatureStar} /> : null}
      </View>
      {selected ? <Feather name="check" size={16} color={colors.charcoal} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  cardTitle: {
    ...typography.h2,
    color: colors.charcoal,
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  climbCard: {
    padding: spacing.lg,
  },
  climbActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  climbActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    maxWidth: 152,
  },
  climbCopy: {
    flex: 1,
    minWidth: 0,
  },
  climbDeleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(184,90,59,0.1)',
    borderColor: 'rgba(184,90,59,0.32)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  climbDetail: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  climbList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  climbMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  climbTitle: {
    color: colors.charcoal,
    fontSize: 21,
    fontWeight: '800',
  },
  climbTopActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  climbTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  colourDot: {
    borderColor: 'rgba(30,30,30,0.16)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  colourOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  colourOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactStepper: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  compactStepperButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  compactStepperValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    fontWeight: '800',
    minWidth: 54,
    textAlign: 'center',
  },
  deleteConfirmCard: {
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  deleteCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  disabledAction: {
    opacity: 0.42,
  },
  editorHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  editorLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  editorSection: {
    gap: spacing.sm,
  },
  errorText: {
    color: destructiveRed,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyFeatureSearchText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  emptyClimbs: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.xxl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 54,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  featureOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  featureOptionLabelRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  featureOptionList: {
    gap: spacing.sm,
  },
  featureOptionText: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  featureSection: {
    gap: spacing.sm,
  },
  featureSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  featureSectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  featurePickerCard: {
    maxHeight: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  featurePickerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  featureSelectButton: {
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
  featureSelectHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  featureSelectLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  featureSelectTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  featureSelectValue: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  commonFeatureStar: {
    marginLeft: spacing.sm,
  },
  detailStack: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  metadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metadataText: {
    color: colors.muted,
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.charcoal,
    flex: 1,
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  climbEditorCard: {
    maxHeight: '100%',
    maxWidth: 460,
    padding: spacing.lg,
    width: '100%',
  },
  climbEditorContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  inlineLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  optionalLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  searchClearButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  searchInput: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 42,
    paddingVertical: 0,
  },
  savedText: {
    color: colors.success,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  anotherTimePill: {
    backgroundColor: 'rgba(255,150,102,0.2)',
  },
  sentPill: {
    backgroundColor: 'rgba(88,170,129,0.18)',
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '800',
  },
  selectedOption: {
    backgroundColor: colors.mint,
    borderColor: colors.charcoal,
  },
  selectedToggleButton: {
    backgroundColor: colors.mint,
    borderColor: colors.charcoal,
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 66,
    padding: spacing.sm,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepperValue: {
    color: colors.charcoal,
    flexShrink: 1,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    textAlign: 'center',
  },
  stepperValueWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sessionDescription: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  summaryValue: {
    color: colors.charcoal,
    fontSize: 24,
    fontWeight: '800',
  },
  tapeGradeDot: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  tapeGradeMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  tapeGradeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  title: {
    ...typography.compactTitle,
    color: colors.charcoal,
  },
  toggleButton: {
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
