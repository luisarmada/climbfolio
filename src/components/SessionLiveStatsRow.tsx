import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../design/tokens';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { AppCard } from './AppCard';

type SessionLiveStatsRowProps = {
  attempts: number;
  climbs: number;
  elapsedSeconds?: number;
  startTime?: string | null;
  timeValue?: string;
};

export function formatSessionTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

const LiveSessionTimeValue = memo(function LiveSessionTimeValue({ startTime }: { startTime: string | null | undefined }) {
  const elapsedSeconds = useElapsedSeconds(startTime);

  return <Text style={styles.value}>{formatSessionTimer(elapsedSeconds)}</Text>;
});

function SessionTimeValue({
  elapsedSeconds = 0,
  startTime,
  timeValue,
}: {
  elapsedSeconds?: number;
  startTime?: string | null;
  timeValue?: string;
}) {
  if (timeValue !== undefined) {
    return <Text style={styles.value}>{timeValue}</Text>;
  }

  if (startTime) {
    return <LiveSessionTimeValue startTime={startTime} />;
  }

  return <Text style={styles.value}>{formatSessionTimer(elapsedSeconds)}</Text>;
}

export const SessionLiveStatsRow = memo(function SessionLiveStatsRow({
  attempts,
  climbs,
  elapsedSeconds,
  startTime,
  timeValue,
}: SessionLiveStatsRowProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.stat}>
        <Text style={styles.label}>Time</Text>
        <SessionTimeValue elapsedSeconds={elapsedSeconds} startTime={startTime} timeValue={timeValue} />
      </View>
      <View style={styles.stat}>
        <Text style={styles.label}>Climbs</Text>
        <Text style={styles.value}>{climbs}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.label}>Attempts</Text>
        <Text style={styles.value}>{attempts}</Text>
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,253,248,0.68)',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  stat: {
    flex: 1,
  },
  value: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '900',
  },
});
