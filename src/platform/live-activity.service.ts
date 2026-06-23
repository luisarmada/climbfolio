import { ActiveSessionSnapshot } from '../features/sessions/session.snapshot';

export type LiveActivityService = {
  endSessionActivity(): Promise<void>;
  isSupported(): boolean;
  startSessionActivity(snapshot: ActiveSessionSnapshot): Promise<void>;
  updateSessionActivity(snapshot: ActiveSessionSnapshot): Promise<void>;
};

export const liveActivityService: LiveActivityService = {
  async endSessionActivity() {
    return Promise.resolve();
  },

  isSupported() {
    return false;
  },

  async startSessionActivity() {
    return Promise.resolve();
  },

  async updateSessionActivity() {
    return Promise.resolve();
  },
};
