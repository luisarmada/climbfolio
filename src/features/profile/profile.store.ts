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

function isSameProfile(left: UserProfile | null, right: UserProfile) {
  if (!left) {
    return false;
  }

  return (
    left.id === right.id &&
    left.userId === right.userId &&
    left.displayName === right.displayName &&
    left.tagline === right.tagline &&
    left.badgePreference === right.badgePreference &&
    left.profilePictureId === right.profilePictureId &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt &&
    left.deletedAt === right.deletedAt
  );
}

export const useProfileStore = create<ProfileStore>((set) => ({
  error: null,
  isLoading: false,
  profile: null,

  async loadProfile() {
    set({ error: null, isLoading: true });

    try {
      const profile = await profileService.getLocalProfile();
      set((state) => ({
        isLoading: false,
        profile: isSameProfile(state.profile, profile) ? state.profile : profile,
      }));
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
      set((state) => ({
        isLoading: false,
        profile: isSameProfile(state.profile, profile) ? state.profile : profile,
      }));
      return profile;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update profile.', isLoading: false });
      throw error;
    }
  },
}));
