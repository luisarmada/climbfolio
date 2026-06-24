export type GradingScaleType = 'v_scale' | 'font' | 'custom';

export type CustomGradingScale = {
  grades: string[];
  id: string;
  name: string;
};

export type GradingScaleSnapshot = {
  gradingScaleGrades: string[];
  gradingScaleName: string;
  gradingScaleType: GradingScaleType;
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

export const builtInGradingScales: GradingScaleSnapshot[] = [
  {
    gradingScaleGrades: vScaleGrades,
    gradingScaleName: 'V Scale',
    gradingScaleType: 'v_scale',
  },
  {
    gradingScaleGrades: fontScaleGrades,
    gradingScaleName: 'Font',
    gradingScaleType: 'font',
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

export function normalizeCustomScales(scales: CustomGradingScale[] | undefined) {
  const seen = new Set<string>();

  return (scales ?? [])
    .map((scale) => ({
      grades: normalizeCustomGrades(scale.grades),
      id: scale.id.trim(),
      name: scale.name.trim() || 'Custom scale',
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
    };
  }

  if (input.gradingScaleType === 'custom') {
    const customGrades = normalizeCustomGrades(input.customGrades);

    if (customGrades.length > 0) {
      return {
        gradingScaleGrades: customGrades,
        gradingScaleName: input.customGradingScaleName?.trim() || 'Custom',
        gradingScaleType: 'custom',
      };
    }
  }

  return {
    gradingScaleGrades: vScaleGrades,
    gradingScaleName: 'V Scale',
    gradingScaleType: 'v_scale',
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
  };
  const builtInScale = builtInGradingScales.find((scale) => scale.gradingScaleType === input.selectedGradingScaleId);

  if (builtInScale) {
    return builtInScale;
  }

  const customScale = normalizeCustomScales(input.customScales).find((scale) => scale.id === input.selectedGradingScaleId);

  if (customScale) {
    return {
      gradingScaleGrades: customScale.grades,
      gradingScaleName: customScale.name,
      gradingScaleType: 'custom',
    };
  }

  return fallbackScale;
}
