export function nowIso() {
  return new Date().toISOString();
}

export function toIsoDate(date: Date) {
  return date.toISOString();
}

export function parseIsoDate(value: string) {
  return new Date(value);
}
