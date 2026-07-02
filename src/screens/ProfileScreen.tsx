import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { useTabScrollToTop } from '../components/AppShell';
import { DismissibleModal } from '../components/DismissibleModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProfileAccountCard } from '../components/ProfileAccountCard';
import { SavedSessionEditorModal } from '../components/SavedSessionEditorModal';
import { SectionHeader } from '../components/SectionHeader';
import { SessionActivityList } from '../components/SessionActivityList';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { resolveSelectedGradingScale } from '../domain/gradeScales';
import { useClimbingPreferencesStore } from '../features/preferences';
import { defaultSelectedProfileFlairIds, formatProfileBadge, resolveProfileFlairs, useProfileStore } from '../features/profile';
import {
  calculateWeeklyStreak,
  SessionSummary,
  sessionSummaryService,
  summarizeAggregate,
} from '../features/summaries';
import { useRememberedScrollView } from '../hooks/useRememberedScrollView';
import { runAfterInteractionsWithFallback } from '../utils/runAfterInteractions';
import { smoothScrollViewToTop } from '../utils/scrolling';

type FeatherName = ComponentProps<typeof Feather>['name'];
type DashboardAction = {
  accent: string;
  href?: '/calendar' | '/collection' | '/statistics';
  icon: FeatherName;
  label: string;
  modal?: 'betas';
};

const dashboardActions: DashboardAction[] = [
  { accent: colors.mint, href: '/statistics', icon: 'bar-chart-2', label: 'Statistics' },
  { accent: colors.sky, href: '/calendar', icon: 'calendar', label: 'Calendar' },
  { accent: colors.lavender, icon: 'video', label: 'Betas', modal: 'betas' },
  { accent: colors.amber, href: '/collection', icon: 'grid', label: 'Collection' },
];

let cachedProfileSummaries: SessionSummary[] | null = null;

function getSummaryRevision(summary: SessionSummary) {
  return [
    summary.session.id,
    summary.session.updatedAt,
    summary.totalClimbs,
    summary.totalAttempts,
    summary.completedClimbs,
    summary.highestGradeCompleted ?? '',
    ...summary.climbs.map((climb) => `${climb.id}:${climb.updatedAt}:${climb.attemptCount}:${climb.completed}`),
  ].join('|');
}

function areSummaryListsEqual(left: SessionSummary[], right: SessionSummary[]) {
  return left.length === right.length && left.every((summary, index) => {
    const nextSummary = right[index];

    if (!nextSummary) {
      return false;
    }

    return getSummaryRevision(summary) === getSummaryRevision(nextSummary);
  });
}

export function ProfileScreen() {
  const router = useRouter();
  const climbingPreferences = useClimbingPreferencesStore((state) => state.preferences);
  const loadClimbingPreferences = useClimbingPreferencesStore((state) => state.loadPreferences);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const profile = useProfileStore((state) => state.profile);
  const [summaries, setSummaries] = useState<SessionSummary[]>(cachedProfileSummaries ?? []);
  const [editingSummary, setEditingSummary] = useState<SessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(cachedProfileSummaries === null);
  const [isBetasModalVisible, setIsBetasModalVisible] = useState(false);
  const activityListRef = useRef<FlatList<SessionSummary>>(null);
  const hadCachedProfileSummariesOnMountRef = useRef(cachedProfileSummaries !== null);
  const canRestoreProfileScroll = !isLoading && summaries.length > 0;
  const rememberedScroll = useRememberedScrollView('/profile', activityListRef, {
    canRestore: canRestoreProfileScroll,
    resetRememberedOffsetOnMount: !hadCachedProfileSummariesOnMountRef.current,
  });
  const {
    handleContentSizeChange,
    handleScroll,
    nativeID,
    rememberCurrentScrollOffset,
  } = rememberedScroll;
  const scrollToTop = useCallback(() => {
    smoothScrollViewToTop(activityListRef.current);
  }, []);
  const openSettings = useCallback(() => {
    rememberCurrentScrollOffset();
    router.push('/settings');
  }, [rememberCurrentScrollOffset, router]);
  const openSessionDetail = useCallback((summary: SessionSummary) => {
    rememberCurrentScrollOffset();
    router.push(`/session/${summary.session.id}`);
  }, [rememberCurrentScrollOffset, router]);

  useTabScrollToTop('profile', scrollToTop);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadSessions() {
      if (cachedProfileSummaries === null) {
        setIsLoading(true);
      }

      const [nextProfile] = await Promise.all([loadProfile(), loadClimbingPreferences()]);
      const nextSummaries = await sessionSummaryService.listCompletedSessionSummaries({
        userIds: [nextProfile.userId],
      });

      if (isMounted) {
        setSummaries((currentSummaries) => {
          if (areSummaryListsEqual(currentSummaries, nextSummaries)) {
            cachedProfileSummaries = currentSummaries;
            return currentSummaries;
          }

          cachedProfileSummaries = nextSummaries;
          return nextSummaries;
        });
        setIsLoading(false);
      }
    }

    if (cachedProfileSummaries === null) {
      void loadSessions();
      return () => {
        isMounted = false;
      };
    }

    const interactionTask = runAfterInteractionsWithFallback(() => {
      void loadSessions();
    });

    return () => {
      isMounted = false;
      interactionTask.cancel();
    };
  }, [loadClimbingPreferences, loadProfile]));

  const aggregateStats = useMemo(() => summarizeAggregate(summaries), [summaries]);
  const weeklyStreak = useMemo(() => calculateWeeklyStreak(summaries), [summaries]);
  const selectedScale = useMemo(
    () => resolveSelectedGradingScale(climbingPreferences ?? { customScales: [], selectedGradingScaleId: 'v_scale' }),
    [climbingPreferences],
  );
  const displayName = profile?.displayName ?? 'Local Climber';
  const tagline = profile?.tagline ?? 'Indoor boulderer';
  const badgeText = formatProfileBadge(summaries, selectedScale);
  const flairs = resolveProfileFlairs(profile?.selectedFlairIds ?? defaultSelectedProfileFlairIds, badgeText);
  const replaceSessionSummary = useCallback((nextSummary: SessionSummary) => {
    setSummaries((currentSummaries) => {
      const nextSummaries = currentSummaries.map((summary) => (summary.session.id === nextSummary.session.id ? nextSummary : summary));
      cachedProfileSummaries = nextSummaries;
      return nextSummaries;
    });
  }, []);
  const removeSessionSummary = useCallback((sessionId: string) => {
    setSummaries((currentSummaries) => {
      const nextSummaries = currentSummaries.filter((summary) => summary.session.id !== sessionId);
      cachedProfileSummaries = nextSummaries;
      return nextSummaries;
    });
  }, []);

  return (
    <>
      <SessionActivityList
        ref={activityListRef}
        initialContentOffset={canRestoreProfileScroll ? rememberedScroll.initialContentOffset : undefined}
        nativeID={nativeID}
        contentContainerStyle={styles.content}
        actionIcon="more-horizontal"
        displayName={displayName}
        ListHeaderComponent={(
        <>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.title}>Profile</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityLabel="Open profile settings"
              accessibilityRole="button"
              onPress={openSettings}
              style={styles.iconButton}
            >
              <Feather name="settings" size={23} color={colors.charcoal} />
            </TouchableOpacity>
          </View>

          <ProfileAccountCard
            badgeText={badgeText}
            displayName={displayName}
            flairs={flairs}
            profilePictureId={profile?.profilePictureId}
            showStreakFlair={profile?.showStreakFlair ?? true}
            stats={[
              { label: 'Sessions', value: String(aggregateStats.sessions) },
              { label: 'Followers', value: '0' },
              { label: 'Following', value: '0' },
            ]}
            streakCount={weeklyStreak}
            tagline={tagline}
          />

          <View style={styles.dashboardHeader}>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
          </View>

          <View style={styles.dashboardGrid}>
            {dashboardActions.map((action) => {
              const href = action.href;
              const onPress = href
                ? () => {
                    rememberCurrentScrollOffset();
                    router.push(href);
                  }
                : action.modal === 'betas'
                  ? () => setIsBetasModalVisible(true)
                  : undefined;

              return (
                <TouchableOpacity
                  activeOpacity={0.72}
                  accessibilityLabel={onPress ? `Open ${action.label}` : `${action.label} dashboard placeholder`}
                  accessibilityRole="button"
                  key={action.label}
                  onPress={onPress}
                  style={styles.dashboardButton}
                >
                  <View style={[styles.dashboardIcon, { backgroundColor: action.accent }]}>
                    <Feather name={action.icon} size={21} color={colors.charcoal} />
                  </View>
                  <Text style={styles.dashboardButtonText}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionHeader title="Session History" />

          {isLoading ? (
            <AppCard style={styles.emptyState}>
              <LoadingSpinner size="large" />
            </AppCard>
          ) : summaries.length === 0 ? (
            <AppCard style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="calendar" size={26} color={colors.charcoal} />
              </View>
              <Text style={styles.emptyTitle}>No sessions logged</Text>
              <Text style={styles.emptyCopy}>Completed sessions will appear here after you end a climbing session.</Text>
            </AppCard>
          ) : null}
        </>
        )}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onActionPress={setEditingSummary}
        onPress={openSessionDetail}
        profilePictureId={profile?.profilePictureId}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        summaries={isLoading ? [] : summaries}
      />

      <SavedSessionEditorModal
        onDeleted={removeSessionSummary}
        onDismiss={() => setEditingSummary(null)}
        onSaved={replaceSessionSummary}
        summary={editingSummary}
        visible={Boolean(editingSummary)}
      />

      <DismissibleModal onDismiss={() => setIsBetasModalVisible(false)} visible={isBetasModalVisible}>
        <AppCard style={styles.betasCard}>
          <View style={styles.betasIcon}>
            <Feather name="video" size={24} color={colors.charcoal} />
          </View>
          <Text style={styles.betasTitle}>Betas are coming soon</Text>
          <Text style={styles.betasCopy}>
            A local video library for climbs you want to remember, study, and share.
          </Text>

          <View style={styles.betasFeatureList}>
            <View style={styles.betasFeatureRow}>
              <Feather name="upload-cloud" size={17} color={colors.charcoal} />
              <Text style={styles.betasFeatureText}>Upload and store beta videos against climbs, grades, locations, and notes.</Text>
            </View>
            <View style={styles.betasFeatureRow}>
              <Feather name="sliders" size={17} color={colors.charcoal} />
              <Text style={styles.betasFeatureText}>Sort by grade, session, project, wall angle, and the details that matter later.</Text>
            </View>
            <View style={styles.betasFeatureRow}>
              <Feather name="share" size={17} color={colors.charcoal} />
              <Text style={styles.betasFeatureText}>Export polished reel-format clips for Instagram and other socials.</Text>
            </View>
          </View>

          <Text style={styles.betasSupportCopy}>Supporting development helps bring Betas to life sooner.</Text>
          <AppButton icon="check" onPress={() => setIsBetasModalVisible(false)} title="Got it" />
        </AppCard>
      </DismissibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  betasCard: {
    alignItems: 'center',
    maxWidth: 430,
    padding: spacing.xl,
    width: '100%',
  },
  betasCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  betasFeatureList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  betasFeatureRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  betasFeatureText: {
    color: colors.charcoal,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  betasIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 58,
  },
  betasSupportCopy: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  betasTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  dashboardButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 86,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  dashboardButtonText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dashboardHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  dashboardIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  dashboardTitle: {
    ...typography.sectionTitle,
    color: colors.charcoal,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 58,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
});
