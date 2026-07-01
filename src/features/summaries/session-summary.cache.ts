let summaryCacheRevision = 0;

export function getSessionSummaryCacheRevision() {
  return summaryCacheRevision;
}

export function invalidateSessionSummaryCache() {
  summaryCacheRevision += 1;
}
