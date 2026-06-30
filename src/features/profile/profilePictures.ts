import { ImageSourcePropType } from 'react-native';

export const defaultProfilePictureId = 'pfp_mug';

export type ProfilePicturePreset = {
  group: 'general' | 'characters';
  id: string;
  label: string;
  source: ImageSourcePropType;
};

type RequireContext = {
  (key: string): ImageSourcePropType;
  keys(): string[];
};

declare const require: {
  context?: (path: string, recursive: boolean, pattern: RegExp) => RequireContext;
};

function formatPresetLabel(id: string) {
  const fileName = id.split('/').pop() ?? id;

  return fileName
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPresetGroup(id: string): ProfilePicturePreset['group'] {
  return id.startsWith('characters/') ? 'characters' : 'general';
}

function loadProfilePictureContext() {
  if (typeof require.context !== 'function') {
    return null;
  }

  return require.context('../../assets/profile-pictures', true, /\.png$/);
}

function loadProfilePicturePresets() {
  const profilePictureContext = loadProfilePictureContext();

  if (!profilePictureContext) {
    return [];
  }

  return profilePictureContext.keys().map((key) => {
    const id = key.replace('./', '').replace(/\.png$/i, '');

    return {
      group: getPresetGroup(id),
      id,
      label: formatPresetLabel(id),
      source: profilePictureContext(key),
    };
  });
}

export const profilePicturePresets: ProfilePicturePreset[] = loadProfilePicturePresets().sort((left, right) => {
    if (left.group !== right.group) {
      return left.group === 'general' ? -1 : 1;
    }

    if (left.id === defaultProfilePictureId) {
      return -1;
    }

    if (right.id === defaultProfilePictureId) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });

export function resolveProfilePicturePreset(id?: string | null) {
  return (
    profilePicturePresets.find((preset) => preset.id === id) ??
    profilePicturePresets.find((preset) => preset.id === defaultProfilePictureId) ??
    profilePicturePresets[0] ??
    null
  );
}
