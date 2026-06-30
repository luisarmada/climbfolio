import { locationRepository } from '../../data/repositories';
import { ClimbingLocation, CreateClimbingLocationInput, UpdateClimbingLocationInput } from '../../domain/models';
import { inputLimits, normalizeSingleLineInput } from '../../utils/inputValidation';

function normalizeLocationName(name: string) {
  return normalizeSingleLineInput(name, inputLimits.locationName);
}

function normalizeLocationInput<T extends CreateClimbingLocationInput | UpdateClimbingLocationInput>(input: T): T {
  return {
    ...input,
    name: input.name === undefined ? input.name : normalizeLocationName(input.name),
  };
}

export const locationService = {
  async createLocation(input: CreateClimbingLocationInput): Promise<ClimbingLocation> {
    const normalizedInput = normalizeLocationInput(input);

    if (!normalizedInput.name) {
      throw new Error('Location name is required.');
    }

    return locationRepository.create(normalizedInput);
  },

  async getSelectedLocation(): Promise<ClimbingLocation | null> {
    return locationRepository.getSelected();
  },

  async listLocations(): Promise<ClimbingLocation[]> {
    return locationRepository.list();
  },

  async removeLocation(locationId: string): Promise<ClimbingLocation | null> {
    return locationRepository.remove(locationId);
  },

  async selectLocation(locationId: string | null): Promise<ClimbingLocation | null> {
    return locationRepository.select(locationId);
  },

  async updateLocation(locationId: string, input: UpdateClimbingLocationInput): Promise<ClimbingLocation | null> {
    const normalizedInput = normalizeLocationInput(input);

    if (normalizedInput.name !== undefined && !normalizedInput.name) {
      throw new Error('Location name is required.');
    }

    return locationRepository.update(locationId, normalizedInput);
  },
};
