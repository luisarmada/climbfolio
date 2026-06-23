export type SyncStatus = 'idle';

export type SyncService = {
  getStatus(): SyncStatus;
  syncNow(): Promise<SyncStatus>;
};

export const syncService: SyncService = {
  getStatus() {
    return 'idle';
  },

  async syncNow() {
    return 'idle';
  },
};
