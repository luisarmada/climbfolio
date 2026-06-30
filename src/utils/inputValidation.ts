export const inputLimits = {
  customGradeName: 16,
  customScaleName: 30,
  featureSearch: 60,
  locationName: 30,
  profileDisplayName: 16,
  profileTagline: 32,
  sessionDescription: 280,
  sessionName: 40,
} as const;

export function limitInput(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export function normalizeSingleLineInput(value: string | null | undefined, maxLength: number) {
  return limitInput((value ?? '').trim().replace(/\s+/g, ' '), maxLength);
}

export function normalizeMultilineInput(value: string | null | undefined, maxLength: number) {
  return limitInput((value ?? '').replace(/\r\n?/g, '\n').trim(), maxLength);
}
