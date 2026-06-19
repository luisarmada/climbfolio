import { StyleSheet, Text } from 'react-native';
import { colors } from '../design/tokens';

type TimerTextProps = {
  seconds?: number;
  value?: string;
  variant?: 'hero' | 'card';
};

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function TimerText({ seconds = 0, value, variant = 'hero' }: TimerTextProps) {
  return <Text style={[styles.base, variant === 'card' && styles.card]}>{value ?? formatDuration(seconds)}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.charcoal,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 58,
  },
  card: {
    fontSize: 30,
    lineHeight: 36,
  },
});
