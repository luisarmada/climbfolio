import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Href, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { SavedSessionEditorModal } from '../components/SavedSessionEditorModal';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { normalizeFeature } from '../features/climbs';
import { getSessionDisplayName } from '../features/sessions';
import {
  formatDuration,
  formatOneDecimal,
  formatSessionDate,
  formatSessionTime,
  SessionSummary,
  sessionSummaryService,
} from '../features/summaries';

function formatColourDisplay(colour: string | null) {
  return colour?.split(',').map((item) => item.trim()).filter(Boolean).join(' & ') || 'No hold colour';
}

function formatFeatureDisplay(features: string[]) {
  return features.length > 0 ? features.map(normalizeFeature).join(', ') : 'No feature selected';
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
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const openedFromCollectionCell = returnTo === 'collectionCell';
  const openedFromCalendar = returnTo === 'calendar';
  const openedFromCalendarDay = returnTo === 'calendarDay';
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
  const backFallback: Href = openedFromCollectionCell ? collectionCellFallback : openedFromCalendarDay ? calendarDayFallback : openedFromCalendar ? '/calendar' : '/profile';
  const backAccessibilityLabel = openedFromCollectionCell
    ? 'Back to cell sessions'
    : openedFromCalendarDay
      ? 'Back to day sessions'
      : openedFromCalendar
        ? 'Back to calendar'
        : 'Back to profile';
  const handleBack = () => goBackWithTransition(backFallback);

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
                    {index + 1}. {climb.grade}
                  </Text>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.climbMeta}>
                    {formatColourDisplay(climb.colour)} - {climb.completed ? 'Sent it' : 'Another time'}
                  </Text>
                </View>
                <View style={[styles.statusPill, climb.completed ? styles.sentPill : styles.anotherTimePill]}>
                  <Text style={styles.statusText}>{climb.completed ? 'Sent' : 'Tried'}</Text>
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
  climbCopy: {
    flex: 1,
    minWidth: 0,
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
    justifyContent: 'space-between',
  },
});
