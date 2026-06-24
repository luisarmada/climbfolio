import { profileRepository } from '../../data/repositories';
import { ProfileBadgePreference, UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { ProfileBadgeOption } from './profile.types';

export const profileBadgeOptions: ProfileBadgeOption[] = [
  {
    description: 'Show the highest grade you have sent.',
    label: 'Best grade',
    value: 'best_grade',
  },
  {
    description: 'Show how many sessions you have logged.',
    label: 'Sessions logged',
    value: 'sessions',
  },
  {
    description: 'Show your current weekly climbing streak.',
    label: 'Weekly streak',
    value: 'weekly_streak',
  },
  {
    description: 'Show that this profile stays on this device.',
    label: 'Local only',
    value: 'local_only',
  },
];

export function getProfileBadgeOption(value: ProfileBadgePreference): ProfileBadgeOption {
  return profileBadgeOptions.find((option) => option.value === value) ?? profileBadgeOptions[0]!;
}

export const profileService = {
  async getLocalProfile(): Promise<UserProfile> {
    return profileRepository.getLocalProfile();
  },

  async updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    return profileRepository.updateLocalProfile(input);
  },
};
