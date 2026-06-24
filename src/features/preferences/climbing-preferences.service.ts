import { climbingPreferencesRepository } from '../../data/repositories';
import { ClimbingPreferences, UpdateClimbingPreferencesInput } from '../../domain/models';
import { normalizeCustomScales, resolveSelectedGradingScale } from '../../domain/gradeScales';

function normalizeInput(input: UpdateClimbingPreferencesInput): UpdateClimbingPreferencesInput {
  const customScales = input.customScales ? normalizeCustomScales(input.customScales) : undefined;
  const selectedScale = resolveSelectedGradingScale({
    customScales,
    selectedGradingScaleId: input.selectedGradingScaleId,
  });

  return {
    ...input,
    customScales,
    selectedGradingScaleId:
      input.selectedGradingScaleId === 'v_scale' || input.selectedGradingScaleId === 'font'
        ? selectedScale.gradingScaleType
        : input.selectedGradingScaleId,
  };
}

export const climbingPreferencesService = {
  async getLocalPreferences(): Promise<ClimbingPreferences> {
    return climbingPreferencesRepository.getLocalPreferences();
  },

  async updateLocalPreferences(input: UpdateClimbingPreferencesInput): Promise<ClimbingPreferences> {
    return climbingPreferencesRepository.updateLocalPreferences(normalizeInput(input));
  },
};
