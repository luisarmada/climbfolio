import { useEffect, useMemo, useState } from 'react';

function secondsSince(startTime: string) {
  const startedAt = new Date(startTime).getTime();

  if (Number.isNaN(startedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function useElapsedSeconds(startTime: string | null | undefined) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!startTime) {
      return undefined;
    }

    const intervalId = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  return useMemo(() => (startTime ? secondsSince(startTime) : 0), [startTime, tick]);
}
