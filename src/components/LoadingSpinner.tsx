import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../design/tokens';

type LoadingSpinnerProps = {
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
};

export function LoadingSpinner({ size = 'small', style }: LoadingSpinnerProps) {
  return (
    <View accessibilityLabel="Loading" style={[styles.base, size === 'large' && styles.large, style]}>
      <ActivityIndicator color={colors.charcoal} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  large: {
    height: 48,
    width: 48,
  },
});
