import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../design/tokens';

type Segment<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  segments: Segment<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({ onChange, segments, value }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {segments.map((segment) => {
        const isActive = segment.value === value;

        return (
          <TouchableOpacity
            key={segment.value}
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, isActive && styles.activeSegment]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{segment.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(250,247,241,0.86)',
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 50,
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#342C23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.charcoal,
    fontWeight: '800',
  },
});
