import { formatVGradeRange, getDisplayGradeForVRank, getGradeVRange, getVGradeIndex, resolveSelectedGradingScale } from '../../domain/gradeScales';
import { getClimbScaleSnapshot } from '../climbs';
import { SessionSummary } from '../summaries';

export function formatProfileBadge(summaries: SessionSummary[], selectedScale: ReturnType<typeof resolveSelectedGradingScale>) {
  const bestGrade = summaries
    .flatMap((summary) =>
      summary.climbs
        .filter((climb) => climb.completed)
        .map((climb) => {
          const range = getGradeVRange(climb.grade, getClimbScaleSnapshot(climb, summary.session));
          return {
            maxRank: getVGradeIndex(range.max),
            minRank: getVGradeIndex(range.min),
            range,
          };
        }),
    )
    .sort((left, right) => right.maxRank - left.maxRank || right.minRank - left.minRank)[0];

  if (!bestGrade) {
    return 'New climber';
  }

  const gradeLabel =
    selectedScale.gradingScaleType === 'font'
      ? getDisplayGradeForVRank(bestGrade.maxRank, selectedScale)
      : formatVGradeRange(bestGrade.range);

  return `${gradeLabel} climber`;
}
