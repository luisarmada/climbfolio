import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../design/tokens';

type Accent = 'mint' | 'amber' | 'lavender' | 'coral' | 'sky';

type ProgressRowProps = {
  icon: keyof typeof Feather.glyphMap;
  accent: Accent;
  label: string;
  value: string;
  percent: number;
};

export function ProgressRow({ icon, accent, label, value, percent }: ProgressRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors[accent] }]}>
        <Feather name={icon} size={15} color={colors.charcoal} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(percent, 100))}%`, backgroundColor: colors[accent] }]} />
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.stone,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  label: {
    color: colors.charcoal,
    flex: 1.1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  value: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 58,
    textAlign: 'right',
  },
});
