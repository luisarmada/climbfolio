import { GradingScaleType, VGradeRange } from '../gradeScales';

export type Session = {
  id: string;
  userId: string;
  name: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  gradingScaleGrades: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName: string;
  gradingScaleType: GradingScaleType;
  gradingScaleVGradeRanges: Record<string, VGradeRange>;
  locationId: string | null;
  locationName: string | null;
  locationType: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateSessionInput = {
  userId?: string;
  name?: string | null;
  description?: string | null;
  gradingScaleGrades?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  id?: string;
  locationId?: string | null;
  locationName?: string | null;
  locationType?: string | null;
  startTime?: string;
};

export type UpdateSessionInput = {
  name?: string | null;
  description?: string | null;
  endTime?: string | null;
  durationSeconds?: number | null;
  locationId?: string | null;
  locationName?: string | null;
  locationType?: string | null;
  deletedAt?: string | null;
};

export type SessionMetadataInput = {
  name?: string | null;
  description?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  locationType?: string | null;
};

export type EndSessionInput = SessionMetadataInput & {
  endTime?: string;
};
