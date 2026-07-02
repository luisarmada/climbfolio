import { ComponentProps, memo, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { getSessionDisplayName } from '../features/sessions';
import { formatDuration, formatSessionDate, formatSessionTime, SessionSummary } from '../features/summaries';
import { ActivityHighlightCard } from './ActivityHighlightCard';
import { ProfilePicture } from './ProfilePicture';

export type SessionActivityCardProps = {
  actionAccessibilityLabel?: string;
  actionIcon?: ComponentProps<typeof Feather>['name'];
  displayName: string;
  onActionPress?: () => void;
  onPress?: () => void;
  profilePictureId?: string | null;
  summary: SessionSummary;
};

function formatSessionActivitySubtitle(summary: SessionSummary) {
  const date = formatSessionDate(summary.session.startTime);
  const time = formatSessionTime(summary.session.startTime);

  return `${date}, ${time}`;
}

function formatSessionActivityTitle(displayName: string, summary: SessionSummary) {
  return summary.session.locationName ? `${displayName} @ ${summary.session.locationName}` : displayName;
}

function SessionActivityCardComponent({
  actionAccessibilityLabel,
  actionIcon,
  displayName,
  onActionPress,
  onPress,
  profilePictureId,
  summary,
}: SessionActivityCardProps) {
  const sessionDisplayName = getSessionDisplayName(summary.session);
  const leadingVisual = useMemo(
    () => <ProfilePicture profilePictureId={profilePictureId} size={38} />,
    [profilePictureId],
  );
  const stats = useMemo(
    () => [
      { label: 'Time', value: formatDuration(summary.session.durationSeconds) },
      { label: 'Climbs', value: String(summary.totalClimbs) },
      { label: 'Best', value: summary.highestGradeCompleted ?? 'None' },
    ],
    [summary.highestGradeCompleted, summary.session.durationSeconds, summary.totalClimbs],
  );
  const subtitle = useMemo(() => formatSessionActivitySubtitle(summary), [summary]);
  const title = useMemo(() => formatSessionActivityTitle(displayName, summary), [displayName, summary]);

  return (
    <ActivityHighlightCard
      actionAccessibilityLabel={actionAccessibilityLabel ?? `Open actions for ${sessionDisplayName}`}
      actionIcon={actionIcon}
      detailDescription={summary.session.description}
      detailTitle={sessionDisplayName}
      leadingVisual={leadingVisual}
      onActionPress={onActionPress}
      onPress={onPress}
      stats={stats}
      subtitle={subtitle}
      title={title}
    />
  );
}

export const SessionActivityCard = memo(SessionActivityCardComponent);
