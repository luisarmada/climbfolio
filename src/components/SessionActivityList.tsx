import { useCallback, useEffect, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { spacing } from '../design/tokens';
import { SessionSummary } from '../features/summaries';
import { SessionActivityCard, SessionActivityCardProps } from './SessionActivityCard';

const initialVisibleSessions = 6;
const sessionBatchSize = 6;
const loadMoreThreshold = 220;
const rememberedVisibleSessionCounts = new Map<string, number>();

type SessionActivityListProps = {
  actionIcon?: SessionActivityCardProps['actionIcon'];
  displayName: string;
  onActionPress?: (summary: SessionSummary) => void;
  onPress: (summary: SessionSummary) => void;
  profilePictureId?: string | null;
  style?: StyleProp<ViewStyle>;
  summaries: SessionSummary[];
  visibleCount: number;
};

export function useSessionActivityPagination(totalCount: number, memoryKey?: string) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(rememberedVisibleSessionCounts.get(memoryKey ?? '') ?? initialVisibleSessions, totalCount),
  );

  useEffect(() => {
    setVisibleCount((currentCount) => {
      if (totalCount === 0) {
        if (memoryKey) {
          rememberedVisibleSessionCounts.set(memoryKey, 0);
        }

        return 0;
      }

      const rememberedCount = memoryKey ? rememberedVisibleSessionCounts.get(memoryKey) ?? 0 : 0;
      const nextCount = currentCount === 0 ? initialVisibleSessions : Math.max(currentCount, rememberedCount, initialVisibleSessions);
      return Math.min(nextCount, totalCount);
    });
  }, [memoryKey, totalCount]);

  useEffect(() => {
    if (memoryKey) {
      rememberedVisibleSessionCounts.set(memoryKey, visibleCount);
    }
  }, [memoryKey, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((currentCount) => {
      const nextCount = Math.min(currentCount + sessionBatchSize, totalCount);

      if (memoryKey) {
        rememberedVisibleSessionCounts.set(memoryKey, nextCount);
      }

      return nextCount;
    });
  }, [memoryKey, totalCount]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);

    if (distanceFromBottom <= loadMoreThreshold) {
      loadMore();
    }
  }, [loadMore]);

  return {
    handleScroll,
    visibleCount,
  };
}

export function SessionActivityList({
  actionIcon,
  displayName,
  onActionPress,
  onPress,
  profilePictureId,
  style,
  summaries,
  visibleCount,
}: SessionActivityListProps) {
  return (
    <View style={[styles.list, style]}>
      {summaries.slice(0, visibleCount).map((summary) => (
        <SessionActivityCard
          actionIcon={actionIcon}
          displayName={displayName}
          key={summary.session.id}
          onActionPress={onActionPress ? () => onActionPress(summary) : undefined}
          onPress={() => onPress(summary)}
          profilePictureId={profilePictureId}
          summary={summary}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
