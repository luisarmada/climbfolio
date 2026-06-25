import { create } from 'zustand';
import { ClimbingLocation, CreateClimbingLocationInput, UpdateClimbingLocationInput } from '../../domain/models';
import { locationService } from './location.service';

type LocationStore = {
  error: string | null;
  isLoading: boolean;
  locations: ClimbingLocation[];
  selectedLocation: ClimbingLocation | null;
  createLocation(input: CreateClimbingLocationInput): Promise<ClimbingLocation>;
  loadLocations(): Promise<ClimbingLocation[]>;
  removeLocation(locationId: string): Promise<void>;
  selectLocation(locationId: string | null): Promise<ClimbingLocation | null>;
  updateLocation(locationId: string, input: UpdateClimbingLocationInput): Promise<ClimbingLocation | null>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not update locations.';
}

export const useLocationStore = create<LocationStore>((set) => ({
  error: null,
  isLoading: false,
  locations: [],
  selectedLocation: null,

  async createLocation(input) {
    set({ error: null, isLoading: true });

    try {
      const location = await locationService.createLocation(input);
      const locations = await locationService.listLocations();
      const selectedLocation = await locationService.getSelectedLocation();
      set({ error: null, isLoading: false, locations, selectedLocation });
      return location;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async loadLocations() {
    set({ error: null, isLoading: true });

    try {
      const [locations, selectedLocation] = await Promise.all([
        locationService.listLocations(),
        locationService.getSelectedLocation(),
      ]);
      set({ error: null, isLoading: false, locations, selectedLocation });
      return locations;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async removeLocation(locationId) {
    set({ error: null, isLoading: true });

    try {
      await locationService.removeLocation(locationId);
      const locations = await locationService.listLocations();
      const selectedLocation = await locationService.getSelectedLocation();
      set({ error: null, isLoading: false, locations, selectedLocation });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async selectLocation(locationId) {
    set({ error: null, isLoading: true });

    try {
      const selectedLocation = await locationService.selectLocation(locationId);
      const locations = await locationService.listLocations();
      set({ error: null, isLoading: false, locations, selectedLocation });
      return selectedLocation;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  async updateLocation(locationId, input) {
    set({ error: null, isLoading: true });

    try {
      const location = await locationService.updateLocation(locationId, input);
      const locations = await locationService.listLocations();
      const selectedLocation = await locationService.getSelectedLocation();
      set({ error: null, isLoading: false, locations, selectedLocation });
      return location;
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },
}));
