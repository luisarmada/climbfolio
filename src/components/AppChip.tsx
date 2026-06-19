import { Feather } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../design/tokens';

type AppChipProps = {
  accentColor?: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppChip({ accentColor, label, onPress, selected = false, style }: AppChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip, style]}
    >
      {accentColor ? <View style={[styles.dot, { backgroundColor: accentColor }]} /> : null}
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      {selected ? <Feather name="check" size={14} color={colors.white} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  selectedChip: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  dot: {
    borderColor: 'rgba(30,30,30,0.16)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  label: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLabel: {
    color: colors.white,
  },
});
