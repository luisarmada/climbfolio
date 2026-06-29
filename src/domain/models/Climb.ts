import { GradingScaleType, VGradeRange } from '../gradeScales';

export type Climb = {
  id: string;
  sessionId: string;
  grade: string;
  gradingScaleGrades?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  colour: string | null;
  holdTypes: string[];
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  attemptCount: number;
  completed: boolean;
  restBeforeClimbSeconds: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateClimbInput = {
  id?: string;
  sessionId: string;
  grade: string;
  gradingScaleGrades?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  colour?: string | null;
  holdTypes?: string[];
  startTime?: string;
  restBeforeClimbSeconds?: number | null;
  sortOrder?: number;
};

export type UpdateClimbInput = {
  grade?: string;
  gradingScaleGrades?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  colour?: string | null;
  holdTypes?: string[];
  endTime?: string | null;
  durationSeconds?: number | null;
  attemptCount?: number;
  completed?: boolean;
  restBeforeClimbSeconds?: number | null;
  sortOrder?: number;
  deletedAt?: string | null;
};
