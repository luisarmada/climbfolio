import { memo } from 'react';
import { Feather } from '@expo/vector-icons';
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius } from '../design/tokens';
import { resolveProfilePicturePreset } from '../features/profile';

type ProfilePictureProps = {
  accessibilityLabel?: string;
  onPress?: () => void;
  profilePictureId?: string | null;
  showEditBadge?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export const ProfilePicture = memo(function ProfilePicture({
  accessibilityLabel = 'Profile picture',
  onPress,
  profilePictureId,
  showEditBadge = false,
  size = 96,
  style,
}: ProfilePictureProps) {
  const preset = resolveProfilePicturePreset(profilePictureId);
  const defaultSource = preset && !Array.isArray(preset.source) ? preset.source : undefined;

  const content = (
    <View style={[styles.frame, { height: size, width: size }, style]}>
      {preset ? (
        <Image
          accessibilityIgnoresInvertColors
          defaultSource={defaultSource}
          fadeDuration={0}
          resizeMode="cover"
          source={preset.source}
          style={styles.image}
        />
      ) : null}
      {showEditBadge ? (
        <View style={styles.editBanner}>
          <Feather name="shuffle" size={16} color={colors.white} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  editBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(188,184,178,0.82)',
    bottom: 0,
    height: 29,
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
  },
  frame: {
    backgroundColor: '#E6DDD0',
    borderRadius: radius.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    height: '100%',
    transform: [{ scale: 1 }],
    width: '100%',
  },
});
