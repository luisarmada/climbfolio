import { create } from 'zustand';
import { ClimbingPreferences, UpdateClimbingPreferencesInput } from '../../domain/models';
import { climbingPreferencesService } from './climbing-preferences.service';

type ClimbingPreferencesStore = {
  error: string | null;
  isLoading: boolean;
  preferences: ClimbingPreferences | null;
  loadPreferences(): Promise<ClimbingPreferences>;
  updatePreferences(input: UpdateClimbingPreferencesInput): Promise<ClimbingPreferences>;
};

export const useClimbingPreferencesStore = create<ClimbingPreferencesStore>((set) => ({
  error: null,
  isLoading: false,
  preferences: null,

  async loadPreferences() {
    set({ error: null, isLoading: true });

    try {
      const preferences = await climbingPreferencesService.getLocalPreferences();
      set({ isLoading: false, preferences });
      return preferences;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not load climbing preferences.', isLoading: false });
      throw error;
    }
  },

  async updatePreferences(input) {
    set({ error: null, isLoading: true });

    try {
      const preferences = await climbingPreferencesService.updateLocalPreferences(input);
      set({ isLoading: false, preferences });
      return preferences;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not update climbing preferences.', isLoading: false });
      throw error;
    }
  },
}));
