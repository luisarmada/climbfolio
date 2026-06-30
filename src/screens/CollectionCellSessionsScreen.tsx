import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityHighlightCard } from '../components/ActivityHighlightCard';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { builtInGradingScales } from '../domain/gradeScales';
import {
  allLocationsFilterId,
  buildCollectionScaleOptions,
  filterCollectionSummaries,
  findCollectionCellSessionMatches,
} from '../features/collections';
import { useLocationStore } from '../features/locations';
import { useClimbingPreferencesStore } from '../features/preferences';
import {
  SessionSummary,
  formatDuration,
  formatSessionDate,
  formatSessionTime,
  sessionSummaryService,
} from '../features/summaries';
import { getSessionDisplayName } from '../features/sessions';

const fallbackScaleOption = {
  key: 'v_scale',
  label: 'V Scale',
  scale: builtInGradingScales[0]!,
};

function getStringParam(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function formatSessionHistorySubtitle(summary: SessionSummary) {
  const date = formatSessionDate(summary.session.startTime);
  const time = formatSessionTime(summary.session.startTime);
  const dateTime = `${date}, ${time}`;

  if (summary.session.locationName) {
    return `${dateTime} @ ${summary.session.locationName}`;
  }

  return dateTime;
}

export function CollectionCellSessionsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { goBackWithTransition } = useProfileReturnTransition();
  const loadPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const preferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadLocations = useLocationStore((state) => state.loadLocations);
  const locations = useLocationStore((state) => state.locations);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const feature = getStringParam(params.feature);
  const grade = getStringParam(params.grade);
  const locationId = getStringParam(params.locationId, allLocationsFilterId);
  const scaleKey = getStringParam(params.scaleKey, 'v_scale');
  const scaleOptions = useMemo(() => buildCollectionScaleOptions(preferences, summaries), [preferences, summaries]);
  const selectedScaleOption = scaleOptions.find((option) => option.key === scaleKey) ?? scaleOptions[0] ?? fallbackScaleOption;
  const locationName = locationId === allLocationsFilterId ? 'All locations' : locations.find((location) => location.id === locationId)?.name ?? 'Location';
  const filteredSummaries = useMemo(
    () => filterCollectionSummaries(summaries, selectedScaleOption.key, locationId),
    [locationId, selectedScaleOption.key, summaries],
  );
  const matches = useMemo(
    () => findCollectionCellSessionMatches(filteredSummaries, selectedScaleOption.scale, feature, grade),
    [feature, filteredSummaries, grade, selectedScaleOption.scale],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCellSessions() {
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

    void loadCellSessions();

    return () => {
      isMounted = false;
    };
  }, [loadLocations, loadPreferences]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityLabel="Back to collection"
          accessibilityRole="button"
          onPress={() => goBackWithTransition('/collection')}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Cell sessions</Text>
        </View>
      </View>

      <View style={styles.cellHero}>
        <View style={styles.cellHeroTopRow}>
          <View style={styles.cellIcon}>
            <Feather name="grid" size={20} color={colors.charcoal} />
          </View>
          <View style={styles.cellHeroCopy}>
            <Text style={styles.cellLabel}>Collection cell</Text>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.cellTitle}>
              {feature} {grade}
            </Text>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.cellSubtitle}>
              {selectedScaleOption.label} | {locationName}
            </Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{matches.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{matches.reduce((total, match) => total + match.matchingClimbs, 0)}</Text>
            <Text style={styles.statLabel}>Climbs</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{matches.reduce((total, match) => total + match.matchingAttempts, 0)}</Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <AppCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading sessions...</Text>
        </AppCard>
      ) : null}

      {!isLoading && matches.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No sent sessions here</Text>
          <Text style={styles.emptyCopy}>Sent cells open the sessions that contributed to that part of the collection.</Text>
        </AppCard>
      ) : null}

      <View style={styles.sessionList}>
        {matches.map((match) => (
          <ActivityHighlightCard
            key={match.summary.session.id}
            onPress={() =>
              router.push({
                pathname: '/session/[sessionId]',
                params: {
                  feature,
                  grade,
                  locationId,
                  returnTo: 'collectionCell',
                  scaleKey,
                  sessionId: match.summary.session.id,
                },
              })
            }
            stats={[
              { label: 'Time', value: formatDuration(match.summary.session.durationSeconds) },
              { label: 'Climbs', value: String(match.summary.totalClimbs) },
              { label: 'Best', value: match.summary.highestGradeCompleted ?? 'None' },
            ]}
            subtitle={formatSessionHistorySubtitle(match.summary)}
            title={getSessionDisplayName(match.summary.session)}
          />
        ))}
      </View>
    </ScrollView>
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
  cellHero: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  cellHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  cellHeroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cellIcon: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cellLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cellSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cellTitle: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  sessionList: {
    gap: spacing.md,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statRow: {
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  statValue: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
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
});
