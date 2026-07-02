import { InteractionManager } from 'react-native';

type CancellableTask = {
  cancel: () => void;
};

export function runAfterInteractionsWithFallback(task: () => void, fallbackDelayMs = 320): CancellableTask {
  let hasRun = false;
  let interactionTask: CancellableTask | null = null;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

  const runOnce = () => {
    if (hasRun) {
      return;
    }

    hasRun = true;
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
    interactionTask?.cancel();
    task();
  };

  timeoutId = globalThis.setTimeout(runOnce, fallbackDelayMs);
  interactionTask = InteractionManager.runAfterInteractions(runOnce);

  return {
    cancel: () => {
      hasRun = true;
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
      interactionTask?.cancel();
    },
  };
}
