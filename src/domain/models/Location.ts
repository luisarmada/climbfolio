export type ClimbingLocationType = 'gym' | 'outdoor' | 'other';

export type ClimbingLocation = {
  id: string;
  name: string;
  type: ClimbingLocationType;
  gradingScaleId: string;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateClimbingLocationInput = {
  gradingScaleId: string;
  id?: string;
  isSelected?: boolean;
  name: string;
  type: ClimbingLocationType;
};

export type UpdateClimbingLocationInput = {
  gradingScaleId?: string;
  isSelected?: boolean;
  name?: string;
  type?: ClimbingLocationType;
  deletedAt?: string | null;
};
