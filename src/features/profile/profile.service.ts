import { profileRepository } from '../../data/repositories';
import { UpdateUserProfileInput, UserProfile } from '../../domain/models';

export const profileService = {
  async getLocalProfile(): Promise<UserProfile> {
    return profileRepository.getLocalProfile();
  },

  async updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    return profileRepository.updateLocalProfile(input);
  },
};
