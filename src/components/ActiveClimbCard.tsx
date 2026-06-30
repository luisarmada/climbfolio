import { Feather, FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  buildFeatureSelection,
  climbColours,
  climbGrades,
  featureSections,
  getAdditionalFeatures,
  isCommonFeature,
  matchesFeatureSearch,
  maxAdditionalFeatures,
  warmUpHoldType,
} from '../features/climbs';
import { Climb } from '../domain/models';
import { VGradeRange, formatEstimatedVGradeAverage } from '../domain/gradeScales';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { colors, radius, spacing, typography } from '../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';
import { getMainFeature, HoldIcon } from './HoldIcon';
import { TimerText } from './TimerText';
import { inputLimits, limitInput } from '../utils/inputValidation';

const destructiveRed = '#B85A3B';
const allFeatureSectionTitles = featureSections.map((section) => section.title);

type EditableClimbInput = {
  colour?: string | null;
  grade: string;
  holdTypes?: string[];
};

type ActiveClimbCardProps = {
  climb: Climb;
  disabled?: boolean;
  gradeOptions?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  mainFeatureRequiredSignal?: number;
  onAddAttempt: () => void;
  onDelete: () => void;
  onAnotherTime: () => void;
  onSentIt: () => void;
  onUndoAttempt: () => void;
  onUpdate: (input: EditableClimbInput) => void;
};

type DoneClimbCardProps = {
  celebrate?: boolean;
  climb: Climb;
  disabled?: boolean;
  gradingScaleIsTape?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

type DropdownField = 'mainFeature' | 'additionalFeatures';

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

export function ActiveClimbCard({
  climb,
  disabled = false,
  gradeOptions = climbGrades,
  gradingScaleIsTape = false,
  gradingScaleVGradeRanges = {},
  mainFeatureRequiredSignal = 0,
  onAddAttempt,
  onDelete,
  onAnotherTime,
  onSentIt,
  onUndoAttempt,
  onUpdate,
}: ActiveClimbCardProps) {
  const [openField, setOpenField] = useState<DropdownField | null>(null);
  const [isDetailsEditorVisible, setIsDetailsEditorVisible] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');
  const [expandedFeatureSections, setExpandedFeatureSections] = useState<string[]>(allFeatureSectionTitles);
  const [showMainFeatureRequired, setShowMainFeatureRequired] = useState(false);
  const elapsedSeconds = useElapsedSeconds(climb.startTime);
  const canUndo = climb.attemptCount > 1;
  const visibleHoldTypes = getVisibleHoldTypes(climb);
  const mainFeature = getMainFeature(visibleHoldTypes);
  const additionalFeatures = getAdditionalFeatures(visibleHoldTypes);
  const selectedColours = parseColours(climb.colour);
  const shouldShowHoldIcons = selectedColours.length > 0;
  const colourLabel = formatColourDisplay(selectedColours);
  const featureLabel = mainFeature ?? 'None';
  const additionalFeatureLabel = mainFeature ? formatFeatureDisplay(additionalFeatures) : 'Choose main first';
  const [detailsGrade, setDetailsGrade] = useState(climb.grade);
  const [detailsColours, setDetailsColours] = useState(selectedColours);
  const detailsGradeIndex = Math.max(0, gradeOptions.indexOf(detailsGrade));
  const canSaveDetails = Boolean(detailsGrade);
  const gradeLabel = formatClimbGradeLabel(climb.grade, gradingScaleIsTape);

  useEffect(() => {
    if (mainFeature) {
      setShowMainFeatureRequired(false);
    }
  }, [mainFeature]);

  useEffect(() => {
    if (!mainFeature && mainFeatureRequiredSignal > 0) {
      setShowMainFeatureRequired(true);
    }
  }, [mainFeature, mainFeatureRequiredSignal]);

  function updateMainFeature(feature: string) {
    const nextMainFeature = mainFeature === feature ? null : feature;

    onUpdate({
      colour: climb.colour,
      grade: climb.grade,
      holdTypes: buildFeatureSelection(nextMainFeature, nextMainFeature ? additionalFeatures : []),
    });
  }

  function completeClimb(action: () => void) {
    if (!mainFeature) {
      setShowMainFeatureRequired(true);
      return;
    }

    action();
  }

  function toggleAdditionalFeature(feature: string) {
    const selected = additionalFeatures.includes(feature);
    const nextAdditionalFeatures = selected
      ? additionalFeatures.filter((item) => item !== feature)
      : [...additionalFeatures, feature].slice(0, maxAdditionalFeatures);

    onUpdate({
      colour: climb.colour,
      grade: climb.grade,
      holdTypes: buildFeatureSelection(mainFeature, nextAdditionalFeatures),
    });
  }

  function openFeatureSelector(field: DropdownField) {
    setFeatureSearch('');
    setExpandedFeatureSections(allFeatureSectionTitles);
    setOpenField(field);
  }

  function toggleFeatureSection(sectionTitle: string) {
    setExpandedFeatureSections((current) =>
      current.includes(sectionTitle) ? current.filter((title) => title !== sectionTitle) : [...current, sectionTitle],
    );
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
      holdTypes: buildFeatureSelection(mainFeature, additionalFeatures),
    });
    setIsDetailsEditorVisible(false);
  }

  function renderDropdownOptions() {
    if (openField === 'mainFeature' || openField === 'additionalFeatures') {
      const selectingAdditional = openField === 'additionalFeatures';
      const sectionsWithMatches = featureSections
        .map((section) => ({
          ...section,
          features: section.features.filter(
            (feature) => matchesFeatureSearch(feature, featureSearch) && (!selectingAdditional || feature !== mainFeature),
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
              <View style={section.showIcons ? styles.holdOptionGrid : styles.featureTextGrid}>
                {section.features.map((feature) => (
                  <FeatureOptionTile
                    colours={selectedColours}
                    disabled={
                      selectingAdditional && !additionalFeatures.includes(feature) && additionalFeatures.length >= maxAdditionalFeatures
                    }
                    feature={feature}
                    key={feature}
                    onPress={() => (selectingAdditional ? toggleAdditionalFeature(feature) : updateMainFeature(feature))}
                    selected={selectingAdditional ? additionalFeatures.includes(feature) : mainFeature === feature}
                    showIcon={section.showIcons && shouldShowHoldIcons}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      });
    }

    return null;
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Current Climb</Text>
          <View style={styles.titleRow}>
            {mainFeature && shouldShowHoldIcons ? <HoldIcon colours={selectedColours} holdType={mainFeature} size={46} /> : null}
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.grade}>{gradeLabel}</Text>
            {climb.colour ? <Text ellipsizeMode="tail" numberOfLines={1} style={styles.meta}>- {colourLabel}</Text> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Edit climb grade and hold colour"
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
          error={showMainFeatureRequired && !mainFeature}
          helperText={showMainFeatureRequired && !mainFeature ? 'Pick a main feature first.' : undefined}
          label="Main feature"
          onPress={() => openFeatureSelector('mainFeature')}
          value={featureLabel}
          wide
        />
        <SelectButton
          disabled={!mainFeature}
          label="Additional features"
          onPress={() => openFeatureSelector('additionalFeatures')}
          value={additionalFeatureLabel}
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
        <AppButton
          disabled={disabled}
          icon="x-circle"
          onPress={() => completeClimb(onAnotherTime)}
          style={styles.halfButton}
          title="Another Time"
          variant="secondary"
        />
        <AppButton
          disabled={disabled}
          icon="check-circle"
          onPress={() => completeClimb(onSentIt)}
          style={styles.halfButton}
          title="Sent It"
        />
      </View>

      <DismissibleModal onDismiss={() => setOpenField(null)} visible={Boolean(openField)}>
          <AppCard style={styles.dropdownCard}>
            <View style={styles.dropdownHeader}>
              <View>
                <Text style={styles.dropdownTitle}>{openField === 'additionalFeatures' ? 'Additional features' : 'Main feature'}</Text>
                {openField === 'additionalFeatures' ? (
                  <Text style={styles.dropdownSubtitle}>Choose up to {maxAdditionalFeatures}</Text>
                ) : null}
              </View>
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
            <View style={styles.searchBox}>
              <Feather name="search" size={17} color={colors.muted} />
              <TextInput
                accessibilityLabel={openField === 'additionalFeatures' ? 'Search additional features' : 'Search main features'}
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
                  activeOpacity={0.76}
                  accessibilityLabel="Clear feature search"
                  accessibilityRole="button"
                  onPress={() => setFeatureSearch('')}
                  style={styles.searchClearButton}
                >
                  <Feather name="x" size={16} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView contentContainerStyle={styles.optionList}>
              {renderDropdownOptions()}
            </ScrollView>
            <AppButton icon="check" onPress={() => setOpenField(null)} title="Done" />
          </AppCard>
      </DismissibleModal>

      <DismissibleModal onDismiss={() => setIsDetailsEditorVisible(false)} visible={isDetailsEditorVisible}>
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
                {gradingScaleIsTape ? (
                  <View style={styles.detailsTapeGradeValue}>
                    <View style={styles.detailsTapeGradeMainRow}>
                      <View
                        style={[
                          styles.detailsTapeGradeDot,
                          { backgroundColor: climbColours.find((climbColour) => climbColour.label === detailsGrade)?.value ?? colors.stone },
                        ]}
                      />
                      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.detailsStepperValue}>{detailsGrade}</Text>
                    </View>
                    <Text style={styles.detailsTapeGradeEstimate}>
                      Est. {formatEstimatedVGradeAverage(detailsGrade, { gradingScaleVGradeRanges })}
                    </Text>
                  </View>
                ) : (
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.detailsStepperValue}>{detailsGrade}</Text>
                )}
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

              <Text style={styles.detailsLabel}>Hold colour</Text>
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
      </DismissibleModal>
    </AppCard>
  );
}

function SelectButton({
  disabled = false,
  error = false,
  helperText,
  label,
  onPress,
  value,
  wide = false,
}: {
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label: string;
  onPress: () => void;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[wide && styles.wideSelectButton]}>
      <TouchableOpacity
        activeOpacity={0.78}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.selectButton, error && styles.selectButtonError, disabled && styles.disabledOptionRow]}
      >
        <View style={styles.selectTextWrap}>
          <Text style={[styles.selectLabel, error && styles.selectLabelError]}>{label}</Text>
          <Text numberOfLines={1} style={styles.selectValue}>
            {value}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={error ? destructiveRed : colors.charcoal} />
      </TouchableOpacity>
      {helperText ? <Text style={styles.selectErrorText}>{helperText}</Text> : null}
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
      style={[showIcon ? styles.holdOptionTile : styles.featureTextOption, selected && styles.selectedOptionRow, disabled && styles.disabledOptionRow]}
    >
      {selected ? (
        <View style={styles.holdOptionCheck}>
          <Feather name="check" size={14} color={colors.charcoal} />
        </View>
      ) : null}
      {showIcon ? <HoldIcon colours={colours} holdType={feature} size={58} /> : null}
      <View style={styles.featureOptionLabelRow}>
        <Text
          numberOfLines={showIcon ? 1 : 2}
          style={[showIcon ? styles.holdOptionText : styles.featureTextOptionText, selected && styles.selectedOptionText]}
        >
          {feature}
        </Text>
        {common ? <FontAwesome name="star" size={14} color={colors.amber} style={styles.commonFeatureStar} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export function DoneClimbCard({
  celebrate = false,
  climb,
  disabled = false,
  gradingScaleIsTape = false,
  onDelete,
  onEdit,
}: DoneClimbCardProps) {
  const visibleHoldTypes = getVisibleHoldTypes(climb);
  const mainFeature = getMainFeature(visibleHoldTypes);
  const additionalFeatures = getAdditionalFeatures(visibleHoldTypes);
  const featureDetails = [mainFeature, ...additionalFeatures].filter(Boolean).join(' + ');
  const selectedColours = parseColours(climb.colour);
  const shouldShowHoldIcons = selectedColours.length > 0;
  const colourLabel = formatColourDisplay(selectedColours);
  const gradeLabel = formatClimbGradeLabel(climb.grade, gradingScaleIsTape);
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
              {mainFeature && shouldShowHoldIcons ? <HoldIcon colours={selectedColours} holdType={mainFeature} size={34} /> : null}
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.doneGrade}>{gradeLabel}</Text>
              {climb.colour ? <Text ellipsizeMode="tail" numberOfLines={1} style={styles.doneMeta}>{colourLabel}</Text> : null}
              <Text style={[styles.doneState, climb.completed ? styles.sentState : styles.anotherTimeState]}>
                {climb.completed ? 'Sent it' : 'Another time'}
              </Text>
            </View>
            <View style={styles.doneIconActions}>
              {onEdit ? (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel={`Edit ${gradeLabel} climb`}
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
                  accessibilityLabel={`Delete ${gradeLabel} climb`}
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
            {featureDetails ? ` - ${featureDetails}` : ''}
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
    maxHeight: '100%',
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
  dropdownSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
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
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '900',
    minWidth: 54,
    textAlign: 'center',
  },
  detailsTapeGradeDot: {
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  detailsTapeGradeEstimate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  detailsTapeGradeMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  detailsTapeGradeValue: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    paddingHorizontal: spacing.xs,
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
    flexShrink: 1,
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
    minWidth: 0,
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
  anotherTimeState: {
    backgroundColor: 'rgba(255,150,102,0.18)',
    color: '#9A4E31',
  },
  featureSection: {
    gap: spacing.sm,
    width: '100%',
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
  featureTextGrid: {
    gap: spacing.sm,
    width: '100%',
  },
  featureTextOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  featureTextOptionText: {
    color: colors.charcoal,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'left',
  },
  featureOptionLabelRow: {
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
  grade: {
    ...typography.h2,
    color: colors.charcoal,
    flexShrink: 1,
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
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
    gap: spacing.lg,
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
    gap: spacing.sm,
    width: '100%',
  },
  holdOptionText: {
    color: colors.charcoal,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'left',
  },
  holdOptionTile: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-start',
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  disabledOptionRow: {
    opacity: 0.42,
  },
  disabledStepperButton: {
    opacity: 0.36,
  },
  meta: {
    color: colors.muted,
    flexShrink: 1,
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
  selectButtonError: {
    borderColor: destructiveRed,
    borderWidth: 2,
  },
  selectErrorText: {
    color: destructiveRed,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  selectLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectLabelError: {
    color: destructiveRed,
  },
  selectTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectValue: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    marginBottom: spacing.md,
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
    gap: spacing.xs,
    minWidth: 0,
  },
  wideSelectButton: {
    flexBasis: '100%',
  },
});
