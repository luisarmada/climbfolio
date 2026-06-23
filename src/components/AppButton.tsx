import { Feather } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type AppButtonProps = PropsWithChildren<{
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  variant?: ButtonVariant;
}>;

export function AppButton({
  accessibilityLabel,
  children,
  disabled = false,
  icon,
  onPress,
  style,
  title,
  variant = 'primary',
}: AppButtonProps) {
  const label = title ?? (typeof children === 'string' ? children : undefined);
  const content = children ?? title;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      {icon ? <Feather name={icon} size={20} color={variant === 'primary' ? colors.white : colors.charcoal} /> : null}
      {content ? <Text style={[styles.text, variant !== 'primary' && styles.secondaryText]}>{content}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.charcoal,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderWidth: 1,
  },
  destructive: {
    backgroundColor: 'rgba(255,150,102,0.18)',
    borderColor: colors.coral,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.48,
  },
  text: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryText: {
    color: colors.charcoal,
  },
});
