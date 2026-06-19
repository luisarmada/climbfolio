const randomSegment = () => Math.random().toString(36).slice(2, 10);

export function createLocalId(prefix: string) {
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${randomSegment()}${randomSegment()}`;
}
