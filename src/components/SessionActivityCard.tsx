import { ComponentProps } from 'react';
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

export function SessionActivityCard({
  actionAccessibilityLabel,
  actionIcon,
  displayName,
  onActionPress,
  onPress,
  profilePictureId,
  summary,
}: SessionActivityCardProps) {
  const sessionDisplayName = getSessionDisplayName(summary.session);

  return (
    <ActivityHighlightCard
      actionAccessibilityLabel={actionAccessibilityLabel ?? `Open actions for ${sessionDisplayName}`}
      actionIcon={actionIcon}
      detailDescription={summary.session.description}
      detailTitle={sessionDisplayName}
      leadingVisual={<ProfilePicture profilePictureId={profilePictureId} size={38} />}
      onActionPress={onActionPress}
      onPress={onPress}
      stats={[
        { label: 'Time', value: formatDuration(summary.session.durationSeconds) },
        { label: 'Climbs', value: String(summary.totalClimbs) },
        { label: 'Best', value: summary.highestGradeCompleted ?? 'None' },
      ]}
      subtitle={formatSessionActivitySubtitle(summary)}
      title={formatSessionActivityTitle(displayName, summary)}
    />
  );
}
