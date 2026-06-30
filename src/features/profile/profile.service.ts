import { profileRepository } from '../../data/repositories';
import { UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { inputLimits, normalizeSingleLineInput } from '../../utils/inputValidation';

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
