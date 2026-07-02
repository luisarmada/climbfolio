import type { ProfileFlairId } from '../../domain/models';

export type ProfileFlairPreset = {
  backgroundColor: string;
  borderColor: string;
  description: string;
  id: ProfileFlairId;
  label: string;
  textColor: string;
};

export type ProfileFlairDisplay = {
  backgroundColor: string;
  borderColor: string;
  id: string;
  label: string;
  textColor: string;
};

export const maxSelectedProfileFlairs = 3;
export const defaultSelectedProfileFlairIds: ProfileFlairId[] = ['best_grade'];

export const profileFlairPresets: ProfileFlairPreset[] = [
  {
    backgroundColor: 'rgba(229,222,212,0.55)',
    borderColor: 'rgba(216,208,198,0.9)',
    description: 'Show your highest sent grade as a climber flair.',
    id: 'best_grade',
    label: 'Grade climber',
    textColor: '#494039',
  },
  {
    backgroundColor: 'rgba(185,153,242,0.34)',
    borderColor: '#B999F2',
    description: 'Early supporter and original community member.',
    id: 'founder',
    label: 'Founder',
    textColor: '#3D2B63',
  },
  {
    backgroundColor: 'rgba(168,221,191,0.45)',
    borderColor: '#58AA81',
    description: 'Helps shape Climb Book through feedback and testing.',
    id: 'contributor',
    label: 'Contributor',
    textColor: '#214A36',
  },
  {
    backgroundColor: 'rgba(255,209,102,0.48)',
    borderColor: '#FFD166',
    description: 'Supports continued development.',
    id: 'supporter',
    label: 'Supporter',
    textColor: '#54410B',
  },
];

const profileFlairIds = new Set(profileFlairPresets.map((flair) => flair.id));

export function normalizeSelectedProfileFlairIds(value: unknown): ProfileFlairId[] {
  if (!Array.isArray(value)) {
    return [...defaultSelectedProfileFlairIds];
  }

  const selected: ProfileFlairId[] = [];

  value.forEach((item) => {
    if (typeof item !== 'string' || !profileFlairIds.has(item as ProfileFlairId)) {
      return;
    }

    const flairId = item as ProfileFlairId;

    if (!selected.includes(flairId) && selected.length < maxSelectedProfileFlairs) {
      selected.push(flairId);
    }
  });

  return selected;
}

export function parseSelectedProfileFlairIdsJson(value: string | null | undefined) {
  if (!value) {
    return [...defaultSelectedProfileFlairIds];
  }

  try {
    return normalizeSelectedProfileFlairIds(JSON.parse(value));
  } catch {
    return [...defaultSelectedProfileFlairIds];
  }
}

export function serializeSelectedProfileFlairIds(value: ProfileFlairId[]) {
  return JSON.stringify(normalizeSelectedProfileFlairIds(value));
}

export function resolveProfileFlairs(selectedFlairIds: ProfileFlairId[], bestGradeLabel: string): ProfileFlairDisplay[] {
  return normalizeSelectedProfileFlairIds(selectedFlairIds)
    .reduce<ProfileFlairDisplay[]>((flairs, flairId) => {
      const preset = profileFlairPresets.find((flair) => flair.id === flairId);

      if (!preset) {
        return flairs;
      }

      flairs.push({
        backgroundColor: preset.backgroundColor,
        borderColor: preset.borderColor,
        id: preset.id,
        label: flairId === 'best_grade' ? bestGradeLabel : preset.label,
        textColor: preset.textColor,
      });

      return flairs;
    }, []);
}
