import { GradingScaleType } from '../gradeScales';

export type Session = {
  id: string;
  name: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  gradingScaleGrades: string[];
  gradingScaleName: string;
  gradingScaleType: GradingScaleType;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateSessionInput = {
  name?: string | null;
  description?: string | null;
  gradingScaleGrades?: string[];
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  id?: string;
  startTime?: string;
};

export type UpdateSessionInput = {
  name?: string | null;
  description?: string | null;
  endTime?: string | null;
  durationSeconds?: number | null;
  deletedAt?: string | null;
};

export type SessionMetadataInput = {
  name?: string | null;
  description?: string | null;
};

export type EndSessionInput = SessionMetadataInput & {
  endTime?: string;
};
