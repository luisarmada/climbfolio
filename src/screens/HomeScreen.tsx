import { useCallback, useRef, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { useTabScrollToTop } from '../components/AppShell';
import { DismissibleModal } from '../components/DismissibleModal';
import { SectionHeader } from '../components/SectionHeader';
import { SessionActivityList, useSessionActivityPagination } from '../components/SessionActivityList';
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
  const friendActivityPagination = useSessionActivityPagination(friendActivitySummaries.length, 'home-recent-activity');
  const scrollViewRef = useRef<ScrollView>(null);
  const rememberedScroll = useRememberedScrollView('/', scrollViewRef, { initialOffset: initialScrollOffset });
  const scrollToTop = useCallback(() => {
    smoothScrollViewToTop(scrollViewRef.current);
  }, []);
  const openSearch = useCallback(() => {
    const homeScrollOffset = rememberedScroll.rememberCurrentScrollOffset();
    if (homeScrollOffset) {
      router.push({ pathname: '/search', params: { homeScrollOffset: String(Math.round(homeScrollOffset)) } });
      return;
    }

    router.push('/search');
  }, [rememberedScroll, router]);

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

    void loadHomeStats();

    return () => {
      isMounted = false;
    };
  }, [loadProfile]));

  return (
    <ScrollView
      nativeID={rememberedScroll.nativeID}
      ref={scrollViewRef}
      contentContainerStyle={styles.content}
      contentOffset={rememberedScroll.initialContentOffset}
      onContentSizeChange={rememberedScroll.handleContentSizeChange}
      onScroll={(event) => {
        rememberedScroll.handleScroll(event);
        friendActivityPagination.handleScroll(event);
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
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
        <Text style={styles.streakText}>{isStatsLoading ? '...' : `${weeklyStreak} week streak`}</Text>
      </View>

      <SectionHeader title="Lifetime Statistics" />

      <AppCard style={styles.lifetimePanel}>
        <View style={styles.bestRow}>
          <View style={styles.bestIcon}>
            <Feather name="star" size={17} color={colors.charcoal} />
          </View>
          <View style={styles.bestCopy}>
            <Text style={styles.bestLabel}>Best sent</Text>
            <Text style={styles.bestValue}>{isStatsLoading ? '...' : lifetimeStats.highestGradeCompleted ?? 'None yet'}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{isStatsLoading ? '...' : String(lifetimeStats.sessions)}</Text>
            <Text style={styles.metricLabel}>Sessions</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{isStatsLoading ? '...' : String(lifetimeStats.totalClimbs)}</Text>
            <Text style={styles.metricLabel}>Climbs</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{isStatsLoading ? '...' : String(lifetimeStats.totalAttempts)}</Text>
            <Text style={styles.metricLabel}>Attempts</Text>
          </View>
        </View>
      </AppCard>

      <SectionHeader title="Recent Activity" />
      {isStatsLoading ? (
        <AppCard style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Loading activity...</Text>
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
      ) : (
        <SessionActivityList
          displayName={displayName}
          onPress={(summary) => {
            const homeScrollOffset = rememberedScroll.rememberCurrentScrollOffset();
            router.push({
              pathname: '/session/[sessionId]',
              params: {
                homeScrollOffset: homeScrollOffset ? String(Math.round(homeScrollOffset)) : '',
                returnTo: 'home',
                sessionId: summary.session.id,
              },
            });
          }}
          profilePictureId={profile?.profilePictureId}
          summaries={friendActivitySummaries}
          visibleCount={friendActivityPagination.visibleCount}
        />
      )}

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
    </ScrollView>
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
});
