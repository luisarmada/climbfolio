import { CustomGradingScale } from '../gradeScales';

export type ClimbingPreferences = {
  id: string;
  customScales: CustomGradingScale[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  selectedGradingScaleId: string;
};

export type UpdateClimbingPreferencesInput = {
  customScales?: CustomGradingScale[];
  selectedGradingScaleId?: string;
};
