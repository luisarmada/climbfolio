import { GradingScaleSnapshot } from '../../domain/gradeScales';
import { Climb, Session } from '../../domain/models';

export function getSessionScaleSnapshot(session: Session): GradingScaleSnapshot {
  return {
    gradingScaleGrades: session.gradingScaleGrades,
    gradingScaleIsTape: session.gradingScaleIsTape,
    gradingScaleName: session.gradingScaleName,
    gradingScaleType: session.gradingScaleType,
    gradingScaleVGradeRanges: session.gradingScaleVGradeRanges,
  };
}

export function getClimbScaleSnapshot(climb: Climb, fallbackSession: Session): GradingScaleSnapshot {
  return {
    gradingScaleGrades: climb.gradingScaleGrades?.length ? climb.gradingScaleGrades : fallbackSession.gradingScaleGrades,
    gradingScaleIsTape: climb.gradingScaleIsTape ?? fallbackSession.gradingScaleIsTape,
    gradingScaleName: climb.gradingScaleName ?? fallbackSession.gradingScaleName,
    gradingScaleType: climb.gradingScaleType ?? fallbackSession.gradingScaleType,
    gradingScaleVGradeRanges: climb.gradingScaleVGradeRanges ?? fallbackSession.gradingScaleVGradeRanges,
  };
}
