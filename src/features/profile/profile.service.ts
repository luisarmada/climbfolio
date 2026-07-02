import { profileRepository } from '../../data/repositories';
import { UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { inputLimits, normalizeSingleLineInput } from '../../utils/inputValidation';
import { normalizeSelectedProfileFlairIds } from './profileFlairs';

function normalizeProfileInput(input: UpdateUserProfileInput): UpdateUserProfileInput {
  return {
    ...input,
    tagline:
      input.tagline === undefined
        ? undefined
        : normalizeSingleLineInput(input.tagline, inputLimits.profileTagline),
    displayName:
      input.displayName === undefined
        ? undefined
        : normalizeSingleLineInput(input.displayName, inputLimits.profileDisplayName),
    profilePictureId: input.profilePictureId === undefined ? undefined : input.profilePictureId.trim(),
    selectedFlairIds: input.selectedFlairIds === undefined ? undefined : normalizeSelectedProfileFlairIds(input.selectedFlairIds),
    showStreakFlair: input.showStreakFlair,
  };
}

export const profileService = {
  async getLocalProfile(): Promise<UserProfile> {
    return profileRepository.getLocalProfile();
  },

  async updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    return profileRepository.updateLocalProfile(normalizeProfileInput(input));
  },
};
