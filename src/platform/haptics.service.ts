export type HapticEvent = 'selection' | 'success' | 'warning';

export type HapticsService = {
  notify(event: HapticEvent): Promise<void>;
};

export const hapticsService: HapticsService = {
  async notify() {
    return Promise.resolve();
  },
};
