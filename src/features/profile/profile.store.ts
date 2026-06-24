import { create } from 'zustand';
import { UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { profileService } from './profile.service';

type ProfileStore = {
  error: string | null;
  isLoading: boolean;
  profile: UserProfile | null;
  loadProfile(): Promise<UserProfile>;
  updateProfile(input: UpdateUserProfileInput): Promise<UserProfile>;
};

export const useProfileStore = create<ProfileStore>((set) => ({
  error: null,
  isLoading: false,
  profile: null,

  async loadProfile() {
    set({ error: null, isLoading: true });

    try {
      const profile = await profileService.getLocalProfile();
      set({ isLoading: false, profile });
      return profile;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not load profile.', isLoading: false });
      throw error;
    }
  },

  async updateProfile(input) {
    set({ error: null, isLoading: true });

    try {
      const profile = await profileService.updateLocalProfile(input);
      set({ isLoading: false, profile });
      return profile;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update profile.', isLoading: false });
      throw error;
    }
  },
}));
