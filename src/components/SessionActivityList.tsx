import { ReactElement, forwardRef, memo, useCallback } from 'react';
import {
  FlatList,
  FlatListProps,
  ListRenderItem,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { spacing } from '../design/tokens';
import { SessionSummary } from '../features/summaries';
import { SessionActivityCard, SessionActivityCardProps } from './SessionActivityCard';

type SessionActivityListProps = {
  actionIcon?: SessionActivityCardProps['actionIcon'];
  contentContainerStyle?: StyleProp<ViewStyle>;
  displayName: string;
  initialContentOffset?: { x: number; y: number };
  ListHeaderComponent?: ReactElement | null;
  nativeID?: string;
  onContentSizeChange?: FlatListProps<SessionSummary>['onContentSizeChange'];
  onActionPress?: (summary: SessionSummary) => void;
  onPress: (summary: SessionSummary) => void;
  onScroll?: FlatListProps<SessionSummary>['onScroll'];
  profilePictureId?: string | null;
  scrollEventThrottle?: number;
  showsVerticalScrollIndicator?: boolean;
  style?: StyleProp<ViewStyle>;
  summaries: SessionSummary[];
};

function SessionActivitySeparator() {
  return <View style={styles.separator} />;
}

type SessionActivityRowProps = {
  actionIcon?: SessionActivityCardProps['actionIcon'];
  displayName: string;
  onActionPress?: (summary: SessionSummary) => void;
  onPress: (summary: SessionSummary) => void;
  profilePictureId?: string | null;
  summary: SessionSummary;
};

const SessionActivityRow = memo(function SessionActivityRow({
  actionIcon,
  displayName,
  onActionPress,
  onPress,
  profilePictureId,
  summary,
}: SessionActivityRowProps) {
  const handlePress = useCallback(() => onPress(summary), [onPress, summary]);
  const handleActionPress = useCallback(() => {
    onActionPress?.(summary);
  }, [onActionPress, summary]);

  return (
    <SessionActivityCard
      actionIcon={actionIcon}
      displayName={displayName}
      onActionPress={onActionPress ? handleActionPress : undefined}
      onPress={handlePress}
      profilePictureId={profilePictureId}
      summary={summary}
    />
  );
});

export const SessionActivityList = forwardRef<FlatList<SessionSummary>, SessionActivityListProps>(function SessionActivityList({
  actionIcon,
  contentContainerStyle,
  displayName,
  initialContentOffset,
  ListHeaderComponent,
  nativeID,
  onContentSizeChange,
  onActionPress,
  onPress,
  onScroll,
  profilePictureId,
  scrollEventThrottle,
  showsVerticalScrollIndicator = false,
  style,
  summaries,
}, ref) {
  const listDataStateKey = summaries.length === 0 ? 'empty' : 'populated';
  const renderItem = useCallback<ListRenderItem<SessionSummary>>(({ item }) => (
    <SessionActivityRow
      actionIcon={actionIcon}
      displayName={displayName}
      onActionPress={onActionPress}
      onPress={onPress}
      profilePictureId={profilePictureId}
      summary={item}
    />
  ), [actionIcon, displayName, onActionPress, onPress, profilePictureId]);
  const keyExtractor = useCallback((summary: SessionSummary) => summary.session.id, []);

  // FlatList can retain stale virtualized measurements if it mounts with only the
  // header/empty state and receives rows later. Remount only across empty/populated
  // transitions; keying by length or IDs would reset scroll on normal updates.
  return (
    <FlatList
      contentContainerStyle={[summaries.length === 0 && styles.emptyContent, contentContainerStyle]}
      contentOffset={initialContentOffset}
      data={summaries}
      initialNumToRender={8}
      ItemSeparatorComponent={SessionActivitySeparator}
      key={listDataStateKey}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      maxToRenderPerBatch={8}
      nativeID={nativeID}
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
      ref={ref}
      removeClippedSubviews={false}
      renderItem={renderItem}
      scrollEventThrottle={scrollEventThrottle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      style={[styles.list, style]}
      updateCellsBatchingPeriod={32}
      windowSize={9}
    />
  );
});

const styles = StyleSheet.create({
  emptyContent: {
    flexGrow: 1,
  },
  list: {
    flex: 1,
  },
  separator: {
    height: spacing.md,
  },
});
