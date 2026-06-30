import { Climb } from '../../domain/models';
import { GradingScaleType, VGradeRange } from '../../domain/gradeScales';

export type StartClimbInput = {
  colour?: string | null;
  grade: string;
  gradingScaleGrades?: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
  gradingScaleVGradeRanges?: Record<string, VGradeRange>;
  holdTypes?: string[];
  sessionId: string;
};

export type ActiveClimbUpdate = {
  climb: Climb;
};
