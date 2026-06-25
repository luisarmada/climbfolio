export type GradingScaleType = 'v_scale' | 'font' | 'custom';

export type VGradeRange = {
  max: string;
  min: string;
};

export type CustomGradingScale = {
  grades: string[];
  isTape?: boolean;
  vGradeRanges: Record<string, VGradeRange>;
  id: string;
  name: string;
};

export type GradingScaleSnapshot = {
  gradingScaleGrades: string[];
  gradingScaleIsTape?: boolean;
  gradingScaleName: string;
  gradingScaleType: GradingScaleType;
  gradingScaleVGradeRanges: Record<string, VGradeRange>;
};

export const vScaleGrades = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10+'];

export const fontScaleGrades = [
  '3',
  '4',
  '5',
  '5+',
  '6A',
  '6A+',
  '6B',
  '6B+',
  '6C',
  '6C+',
  '7A',
  '7A+',
  '7B',
  '7B+',
  '7C',
  '7C+',
  '8A',
  '8A+',
];

const fontScaleVGradeRanges: Record<string, VGradeRange> = {
  '3': { min: 'VB', max: 'V0' },
  '4': { min: 'VB', max: 'V0' },
  '5': { min: 'V0', max: 'V1' },
  '5+': { min: 'V1', max: 'V2' },
  '6A': { min: 'V2', max: 'V3' },
  '6A+': { min: 'V3', max: 'V4' },
  '6B': { min: 'V4', max: 'V4' },
  '6B+': { min: 'V4', max: 'V5' },
  '6C': { min: 'V5', max: 'V5' },
  '6C+': { min: 'V5', max: 'V6' },
  '7A': { min: 'V6', max: 'V7' },
  '7A+': { min: 'V7', max: 'V7' },
  '7B': { min: 'V8', max: 'V8' },
  '7B+': { min: 'V8', max: 'V9' },
  '7C': { min: 'V9', max: 'V9' },
  '7C+': { min: 'V10+', max: 'V10+' },
  '8A': { min: 'V10+', max: 'V10+' },
  '8A+': { min: 'V10+', max: 'V10+' },
};

export const vScaleVGradeRanges = vScaleGrades.reduce<Record<string, VGradeRange>>((ranges, grade) => {
  ranges[grade] = { min: grade, max: grade };
  return ranges;
}, {});

export const builtInGradingScales: GradingScaleSnapshot[] = [
  {
    gradingScaleGrades: vScaleGrades,
    gradingScaleName: 'V Scale',
    gradingScaleType: 'v_scale',
    gradingScaleVGradeRanges: vScaleVGradeRanges,
  },
  {
    gradingScaleGrades: fontScaleGrades,
    gradingScaleName: 'Font',
    gradingScaleType: 'font',
    gradingScaleVGradeRanges: fontScaleVGradeRanges,
  },
];

export function normalizeCustomGrades(grades: string[] | undefined) {
  const seen = new Set<string>();

  return (grades ?? [])
    .map((grade) => grade.trim())
    .filter((grade) => {
      const key = grade.toLocaleLowerCase();

      if (!grade || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 32);
}

export function getVGradeIndex(grade: string) {
  const index = vScaleGrades.indexOf(grade);
  return index === -1 ? 0 : index;
}

export function normalizeVGradeRange(range: VGradeRange | undefined, fallbackGrade = 'V0'): VGradeRange {
  const fallback = vScaleGrades.includes(fallbackGrade) ? fallbackGrade : 'V0';
  const min = vScaleGrades.includes(range?.min ?? '') ? range!.min : fallback;
  const max = vScaleGrades.includes(range?.max ?? '') ? range!.max : min;

  return getVGradeIndex(max) < getVGradeIndex(min) ? { min: max, max: min } : { min, max };
}

function defaultCustomVRange(index: number) {
  const grade = vScaleGrades[Math.min(index + 1, vScaleGrades.length - 1)] ?? 'V0';
  return { min: grade, max: grade };
}

function normalizeCustomScaleRanges(grades: string[], ranges: Record<string, VGradeRange> | undefined) {
  return grades.reduce<Record<string, VGradeRange>>((nextRanges, grade, index) => {
    nextRanges[grade] = normalizeVGradeRange(ranges?.[grade], defaultCustomVRange(index).min);
    return nextRanges;
  }, {});
}

export function normalizeCustomScales(scales: CustomGradingScale[] | undefined) {
  const seen = new Set<string>();

  return (scales ?? [])
    .map((scale) => ({
      grades: normalizeCustomGrades(scale.grades),
      id: scale.id.trim(),
      isTape: Boolean(scale.isTape),
      name: scale.name.trim() || 'Custom scale',
      vGradeRanges: {},
    }))
    .map((scale) => ({
      ...scale,
      vGradeRanges: normalizeCustomScaleRanges(scale.grades, scales?.find((candidate) => candidate.id === scale.id)?.vGradeRanges),
    }))
    .filter((scale) => {
      if (!scale.id || scale.grades.length === 0 || seen.has(scale.id)) {
        return false;
      }

      seen.add(scale.id);
      return true;
    })
    .slice(0, 12);
}

export function resolveGradingScale(input: {
  customGrades?: string[];
  customGradingScaleName?: string;
  gradingScaleType?: GradingScaleType;
}): GradingScaleSnapshot {
  if (input.gradingScaleType === 'font') {
    return {
      gradingScaleGrades: fontScaleGrades,
      gradingScaleName: 'Font',
      gradingScaleType: 'font',
      gradingScaleVGradeRanges: fontScaleVGradeRanges,
    };
  }

  if (input.gradingScaleType === 'custom') {
    const customGrades = normalizeCustomGrades(input.customGrades);

    if (customGrades.length > 0) {
      return {
        gradingScaleGrades: customGrades,
        gradingScaleIsTape: false,
        gradingScaleName: input.customGradingScaleName?.trim() || 'Custom',
        gradingScaleType: 'custom',
        gradingScaleVGradeRanges: normalizeCustomScaleRanges(customGrades, undefined),
      };
    }
  }

  return {
    gradingScaleGrades: vScaleGrades,
    gradingScaleName: 'V Scale',
    gradingScaleType: 'v_scale',
    gradingScaleVGradeRanges: vScaleVGradeRanges,
  };
}

export function resolveSelectedGradingScale(input: {
  customScales?: CustomGradingScale[];
  selectedGradingScaleId?: string;
}): GradingScaleSnapshot {
  const fallbackScale: GradingScaleSnapshot = {
    gradingScaleGrades: vScaleGrades,
    gradingScaleName: 'V Scale',
    gradingScaleType: 'v_scale',
    gradingScaleVGradeRanges: vScaleVGradeRanges,
  };
  const builtInScale = builtInGradingScales.find((scale) => scale.gradingScaleType === input.selectedGradingScaleId);

  if (builtInScale) {
    return builtInScale;
  }

  const customScale = normalizeCustomScales(input.customScales).find((scale) => scale.id === input.selectedGradingScaleId);

  if (customScale) {
    return {
      gradingScaleGrades: customScale.grades,
      gradingScaleIsTape: Boolean(customScale.isTape),
      gradingScaleName: customScale.name,
      gradingScaleType: 'custom',
      gradingScaleVGradeRanges: customScale.vGradeRanges,
    };
  }

  return fallbackScale;
}

export function getGradeVRange(grade: string, snapshot: Pick<GradingScaleSnapshot, 'gradingScaleVGradeRanges'>) {
  return normalizeVGradeRange(snapshot.gradingScaleVGradeRanges[grade], grade);
}

export function getGradeVRank(grade: string, snapshot: Pick<GradingScaleSnapshot, 'gradingScaleVGradeRanges'>) {
  return getVGradeIndex(getGradeVRange(grade, snapshot).max);
}

export function formatVGradeRange(range: VGradeRange) {
  const normalizedRange = normalizeVGradeRange(range);
  return normalizedRange.min === normalizedRange.max ? normalizedRange.max : `${normalizedRange.min}-${normalizedRange.max}`;
}

export function formatEstimatedVGradeAverage(grade: string, snapshot: Pick<GradingScaleSnapshot, 'gradingScaleVGradeRanges'>) {
  const range = getGradeVRange(grade, snapshot);
  const averageIndex = Math.round((getVGradeIndex(range.min) + getVGradeIndex(range.max)) / 2);

  return vScaleGrades[Math.max(0, Math.min(averageIndex, vScaleGrades.length - 1))] ?? 'V0';
}

export function getDisplayGradeForVRank(vGradeRank: number, scale: GradingScaleSnapshot) {
  if (scale.gradingScaleType !== 'font') {
    return formatVGradeRange({
      min: vScaleGrades[Math.max(0, Math.min(vGradeRank, vScaleGrades.length - 1))] ?? 'V0',
      max: vScaleGrades[Math.max(0, Math.min(vGradeRank, vScaleGrades.length - 1))] ?? 'V0',
    });
  }

  return (
    scale.gradingScaleGrades.find((grade) => {
      const range = getGradeVRange(grade, scale);
      return getVGradeIndex(range.min) <= vGradeRank && getVGradeIndex(range.max) >= vGradeRank;
    }) ??
    scale.gradingScaleGrades.reduce((closest, grade) => {
      const closestDistance = Math.abs(getGradeVRank(closest, scale) - vGradeRank);
      const gradeDistance = Math.abs(getGradeVRank(grade, scale) - vGradeRank);
      return gradeDistance < closestDistance ? grade : closest;
    }, scale.gradingScaleGrades[0] ?? '3')
  );
}
