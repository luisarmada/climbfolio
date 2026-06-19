export function secondsBetween(startIso: string, endIso: string) {
  const startTime = new Date(startIso).getTime();
  const endTime = new Date(endIso).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((endTime - startTime) / 1000));
}
