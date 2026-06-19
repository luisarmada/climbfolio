export function parseStringArrayJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function stringifyStringArray(value: string[]) {
  return JSON.stringify(value);
}
