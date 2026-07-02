import { useCallback, useRef, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { useTabScrollToTop } from '../components/AppShell';
import { DismissibleModal } from '../components/DismissibleModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SectionHeader } from '../components/SectionHeader';
import { SessionActivityList } from '../components/SessionActivityList';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useProfileStore } from '../features/profile';
import { followingService } from '../features/social';
import {
  AggregateStats,
  calculateWeeklyStreak,
  SessionSummary,
  sessionSummaryService,
  summarizeAggregate,
} from '../features/summaries';
import { useRememberedScrollView } from '../hooks/useRememberedScrollView';
import { runAfterInteractionsWithFallback } from '../utils/runAfterInteractions';
import { smoothScrollViewToTop } from '../utils/scrolling';

const emptyStats: AggregateStats = {
  averageAttemptsPerClimb: 0,
  averageClimbsPerSession: 0,
  averageSessionDurationSeconds: null,
  completedClimbs: 0,
  completionRate: 0,
  highestGradeAttempted: null,
  highestGradeCompleted: null,
  mostClimbedGrade: null,
  mostCommonColour: null,
  mostCommonHoldType: null,
  sessions: 0,
  totalAttempts: 0,
  totalClimbs: 0,
};

type CachedHomeData = {
  friendActivitySummaries: SessionSummary[];
  lifetimeStats: AggregateStats;
  weeklyStreak: number;
};

let cachedHomeData: CachedHomeData | null = null;

type HomeScreenProps = {
  initialScrollOffset?: number;
};

export function HomeScreen({ initialScrollOffset = 0 }: HomeScreenProps = {}) {
  const router = useRouter();
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const profile = useProfileStore((state) => state.profile);
  const displayName = profile?.displayName ?? 'Local Climber';
  const [lifetimeStats, setLifetimeStats] = useState<AggregateStats>(cachedHomeData?.lifetimeStats ?? emptyStats);
  const [friendActivitySummaries, setFriendActivitySummaries] = useState<SessionSummary[]>(cachedHomeData?.friendActivitySummaries ?? []);
  const [isStatsLoading, setIsStatsLoading] = useState(cachedHomeData === null);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [weeklyStreak, setWeeklyStreak] = useState(cachedHomeData?.weeklyStreak ?? 0);
  const activityListRef = useRef<FlatList<SessionSummary>>(null);
  const hadCachedHomeDataOnMountRef = useRef(cachedHomeData !== null);
  const canRestoreHomeScroll = !isStatsLoading && (friendActivitySummaries.length > 0 || initialScrollOffset > 0);
  const rememberedScroll = useRememberedScrollView('/', activityListRef, {
    canRestore: canRestoreHomeScroll,
    initialOffset: initialScrollOffset,
    resetRememberedOffsetOnMount: !hadCachedHomeDataOnMountRef.current && initialScrollOffset <= 0,
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
  const openSearch = useCallback(() => {
    const homeScrollOffset = rememberCurrentScrollOffset();
    if (homeScrollOffset) {
      router.push({ pathname: '/search', params: { homeScrollOffset: String(Math.round(homeScrollOffset)) } });
      return;
    }

    router.push('/search');
  }, [rememberCurrentScrollOffset, router]);
  const openSessionDetail = useCallback((summary: SessionSummary) => {
    const homeScrollOffset = rememberCurrentScrollOffset();
    router.push({
      pathname: '/session/[sessionId]',
      params: {
        homeScrollOffset: homeScrollOffset ? String(Math.round(homeScrollOffset)) : '',
        returnTo: 'home',
        sessionId: summary.session.id,
      },
    });
  }, [rememberCurrentScrollOffset, router]);

  useTabScrollToTop('home', scrollToTop);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    async function loadHomeStats() {
      const nextProfile = await loadProfile();
      const ownUserIds = [nextProfile.userId];
      const followingUserIds = followingService.listFollowingUserIds(nextProfile.userId);
      const [ownSummaries, nextFriendActivitySummaries] = await Promise.all([
        sessionSummaryService.listCompletedSessionSummaries({ userIds: ownUserIds }),
        sessionSummaryService.listCompletedSessionSummaries({ userIds: followingUserIds }),
      ]);

      if (isMounted) {
        const nextLifetimeStats = summarizeAggregate(ownSummaries);
        const nextWeeklyStreak = calculateWeeklyStreak(ownSummaries);

        cachedHomeData = {
          friendActivitySummaries: nextFriendActivitySummaries,
          lifetimeStats: nextLifetimeStats,
          weeklyStreak: nextWeeklyStreak,
        };
        setLifetimeStats(nextLifetimeStats);
        setWeeklyStreak(nextWeeklyStreak);
        setFriendActivitySummaries(nextFriendActivitySummaries);
        setIsStatsLoading(false);
      }
    }

    if (cachedHomeData === null) {
      void loadHomeStats();
      return () => {
        isMounted = false;
      };
    }

    const interactionTask = runAfterInteractionsWithFallback(() => {
      void loadHomeStats();
    });

    return () => {
      isMounted = false;
      interactionTask.cancel();
    };
  }, [loadProfile]));

  return (
    <>
      <SessionActivityList
        ref={activityListRef}
        initialContentOffset={canRestoreHomeScroll ? rememberedScroll.initialContentOffset : undefined}
        nativeID={nativeID}
        contentContainerStyle={styles.content}
        displayName={displayName}
        ListHeaderComponent={(
        <>
          <View style={styles.topRow}>
            <Text style={styles.title}>Home</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityLabel="Open search"
                accessibilityRole="button"
                onPress={openSearch}
                style={styles.iconButton}
              >
                <Feather name="search" size={23} color={colors.charcoal} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityLabel="Open notifications"
                accessibilityRole="button"
                onPress={() => setIsNotificationsVisible(true)}
                style={styles.iconButton}
              >
                <Feather name="bell" size={23} color={colors.charcoal} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.streakFlair}>
            <Ionicons name="flame" size={15} color={colors.charcoal} />
            {isStatsLoading ? <LoadingSpinner style={styles.flairSpinner} /> : <Text style={styles.streakText}>{weeklyStreak} week streak</Text>}
          </View>

          <SectionHeader title="Lifetime Statistics" />

          <AppCard style={styles.lifetimePanel}>
            <View style={styles.bestRow}>
              <View style={styles.bestIcon}>
                <Feather name="star" size={17} color={colors.charcoal} />
              </View>
              <View style={styles.bestCopy}>
                <Text style={styles.bestLabel}>Best sent</Text>
                {isStatsLoading ? <LoadingSpinner style={styles.valueSpinner} /> : (
                  <Text style={styles.bestValue}>{lifetimeStats.highestGradeCompleted ?? 'None yet'}</Text>
                )}
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                {isStatsLoading ? <LoadingSpinner style={styles.valueSpinner} /> : <Text style={styles.metricValue}>{lifetimeStats.sessions}</Text>}
                <Text style={styles.metricLabel}>Sessions</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                {isStatsLoading ? <LoadingSpinner style={styles.valueSpinner} /> : <Text style={styles.metricValue}>{lifetimeStats.totalClimbs}</Text>}
                <Text style={styles.metricLabel}>Climbs</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                {isStatsLoading ? <LoadingSpinner style={styles.valueSpinner} /> : <Text style={styles.metricValue}>{lifetimeStats.totalAttempts}</Text>}
                <Text style={styles.metricLabel}>Attempts</Text>
              </View>
            </View>
          </AppCard>

          <SectionHeader title="Recent Activity" />
          {isStatsLoading ? (
            <AppCard style={styles.loadingCard}>
              <LoadingSpinner size="large" />
            </AppCard>
          ) : friendActivitySummaries.length === 0 ? (
            <AppCard style={styles.comingSoonCard}>
              <View style={styles.comingSoonIcon}>
                <Feather name="users" size={20} color={colors.charcoal} />
              </View>
              <Text style={styles.comingSoonTitle}>No activity yet</Text>
              <Text style={styles.comingSoonCopy}>
                Sessions from you and followed climbers will appear here after they are saved.
              </Text>
            </AppCard>
          ) : null}
        </>
        )}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onPress={openSessionDetail}
        profilePictureId={profile?.profilePictureId}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        summaries={isStatsLoading ? [] : friendActivitySummaries}
      />

      <DismissibleModal onDismiss={() => setIsNotificationsVisible(false)} visible={isNotificationsVisible}>
        <AppCard style={styles.notificationCard}>
          <View style={styles.notificationIcon}>
            <Feather name="bell" size={22} color={colors.charcoal} />
          </View>
          <Text style={styles.notificationTitle}>Notifications coming soon</Text>
          <Text style={styles.notificationCopy}>
            This will become the place for session nudges, recent activity, and useful climbing updates.
          </Text>
          <AppButton icon="check" onPress={() => setIsNotificationsVisible(false)} title="Got it" />
        </AppCard>
      </DismissibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  bestCopy: {
    flex: 1,
  },
  bestIcon: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bestLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bestRow: {
    alignItems: 'center',
    borderBottomColor: colors.stone,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  bestValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 1,
  },
  comingSoonCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  comingSoonCopy: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: spacing.sm,
    maxWidth: 300,
    textAlign: 'center',
  },
  comingSoonIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 44,
  },
  comingSoonTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
  },
  flairSpinner: {
    backgroundColor: 'rgba(255,253,248,0.44)',
    borderColor: 'rgba(30,30,30,0.12)',
    height: 22,
    width: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  notificationCard: {
    alignItems: 'center',
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  notificationCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  notificationIcon: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 52,
  },
  notificationTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  lifetimePanel: {
    padding: spacing.lg,
  },
  loadingCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  metricDivider: {
    backgroundColor: colors.stone,
    height: 36,
    width: 1,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 2,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  metricValue: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  streakFlair: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streakText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueSpinner: {
    marginTop: 1,
  },
});
