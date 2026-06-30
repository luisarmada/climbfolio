import { useEffect, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppChip } from '../components/AppChip';
import { HoldIcon } from '../components/HoldIcon';
import { colors, spacing, typography } from '../design/tokens';
import { formatEstimatedVGradeAverage, vScaleGrades } from '../domain/gradeScales';
import { climbColours, featureSections, isCommonFeature } from '../features/climbs';
import { useActiveSessionStore } from '../features/sessions';

export function StartClimbScreen() {
  const router = useRouter();
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const error = useActiveSessionStore((state) => state.error);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const startClimb = useActiveSessionStore((state) => state.startClimb);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedColour, setSelectedColour] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const gradeOptions = activeSession?.gradingScaleGrades.length ? activeSession.gradingScaleGrades : vScaleGrades;
  const isTapeScale = Boolean(activeSession?.gradingScaleIsTape);

  useEffect(() => {
    void restoreActiveSession();
  }, [restoreActiveSession]);

  useEffect(() => {
    const firstGrade = gradeOptions[0] ?? 'V0';

    if (!selectedGrade || !gradeOptions.includes(selectedGrade)) {
      setSelectedGrade(firstGrade);
    }
  }, [gradeOptions, selectedGrade]);

  function selectFeature(holdType: string) {
    setSelectedFeature((current) => (current === holdType ? null : holdType));
  }

  async function handleStartClimb() {
    if (!selectedGrade) {
      return;
    }

    await startClimb({
      colour: selectedColour,
      grade: selectedGrade,
      holdTypes: selectedFeature ? [selectedFeature] : [],
    });
    router.replace('/session/active');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Start Climb</Text>

      {activeClimb ? (
        <AppCard style={styles.notice}>
          <Text style={styles.noticeTitle}>Climb already active</Text>
          <Text style={styles.noticeCopy}>Finish or discard the active climb before starting another one.</Text>
          <AppButton icon="arrow-left" onPress={() => router.replace('/session/active')} title="Back to Active Climb" />
        </AppCard>
      ) : null}

      {!activeSession ? (
        <AppCard style={styles.notice}>
          <Text style={styles.noticeTitle}>No active session</Text>
          <Text style={styles.noticeCopy}>Start a session before adding climbs.</Text>
          <AppButton icon="triangle" onPress={() => router.replace('/session/active')} title="Go to Session" />
        </AppCard>
      ) : null}

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>Grade</Text>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionHint}>{activeSession?.gradingScaleName ?? 'V Scale'}</Text>
        {isTapeScale ? (
          <View style={styles.tapeGradeGrid}>
            {gradeOptions.map((grade) => {
              const selected = selectedGrade === grade;

              return (
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel={`Select ${grade} tape grade`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={grade}
                  onPress={() => setSelectedGrade(grade)}
                  style={[styles.tapeGradeOption, selected && styles.selectedTapeGradeOption]}
                >
                  <View
                    style={[
                      styles.tapeGradeDot,
                      { backgroundColor: climbColours.find((climbColour) => climbColour.label === grade)?.value ?? colors.stone },
                    ]}
                  />
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.tapeGradeOptionText}>{grade}</Text>
                  <Text style={styles.tapeGradeEstimate}>
                    Est. {formatEstimatedVGradeAverage(grade, activeSession ?? { gradingScaleVGradeRanges: {} })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.chipWrap}>
            {gradeOptions.map((grade) => (
              <AppChip key={grade} label={grade} onPress={() => setSelectedGrade(grade)} selected={selectedGrade === grade} />
            ))}
          </View>
        )}
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>Main feature</Text>
        <Text style={styles.sectionHint}>Optional, choose one</Text>
        <View style={styles.featureSectionList}>
          {featureSections.map((section) => (
            <View key={section.title} style={styles.featureSection}>
              <Text style={styles.featureSectionTitle}>{section.title}</Text>
              <View style={styles.chipWrap}>
                {section.features.map((feature) =>
                  section.showIcons && selectedColour ? (
                    <View key={feature} style={styles.holdChipWrap}>
                      <HoldIcon colours={selectedColour} holdType={feature} size={32} />
                      <AppChip label={feature} onPress={() => selectFeature(feature)} selected={selectedFeature === feature} />
                      {isCommonFeature(feature) ? <FontAwesome name="star" size={14} color={colors.amber} /> : null}
                    </View>
                  ) : (
                    <View key={feature} style={styles.featureChipWrap}>
                      <AppChip label={feature} onPress={() => selectFeature(feature)} selected={selectedFeature === feature} />
                      {isCommonFeature(feature) ? <FontAwesome name="star" size={14} color={colors.amber} /> : null}
                    </View>
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>Hold colour</Text>
        <Text style={styles.sectionHint}>Optional, but helpful later</Text>
        <View style={styles.chipWrap}>
          {climbColours.map((climbColour) => (
            <AppChip
              accentColor={climbColour.value}
              key={climbColour.label}
              label={climbColour.label}
              onPress={() => setSelectedColour(climbColour.label)}
              selected={selectedColour === climbColour.label}
            />
          ))}
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          disabled={!selectedGrade || !activeSession || Boolean(activeClimb) || isLoading}
          icon="triangle"
          onPress={handleStartClimb}
          title={isLoading ? 'Starting Climb...' : 'Start Climb'}
        />
        <AppButton icon="arrow-left" onPress={() => router.back()} title="Back to Session" variant="secondary" />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
    marginBottom: spacing.xl,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.charcoal,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureSection: {
    gap: spacing.sm,
  },
  featureSectionList: {
    gap: spacing.lg,
  },
  featureSectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  holdChipWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  featureChipWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  selectedTapeGradeOption: {
    backgroundColor: colors.mint,
    borderColor: colors.success,
  },
  tapeGradeDot: {
    borderColor: colors.stone,
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    width: 22,
  },
  tapeGradeEstimate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
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
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 78,
    minWidth: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tapeGradeOptionText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  notice: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  noticeTitle: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
  },
  noticeCopy: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorText: {
    color: '#B85A3B',
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
});
