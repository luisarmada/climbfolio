import { Feather, Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';

type ProfileFlairPillProps = {
  backgroundColor: string;
  borderColor?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  isStreak?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

export function ProfileFlairPill({
  backgroundColor,
  borderColor = 'transparent',
  icon,
  isStreak = false,
  label,
  style,
  textColor = colors.charcoal,
}: ProfileFlairPillProps) {
  return (
    <View
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor, borderColor }, style]}
    >
      {isStreak ? <Ionicons name="flame" size={14} color={textColor} /> : null}
      {!isStreak && icon ? <Feather name={icon} size={13} color={textColor} /> : null}
      <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.text, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 3,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  text: {
    flexShrink: 1,
    fontFamily: fonts.extraBold,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
});
