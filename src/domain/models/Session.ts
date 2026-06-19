export type Session = {
  id: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateSessionInput = {
  id?: string;
  startTime?: string;
};

export type UpdateSessionInput = {
  endTime?: string | null;
  durationSeconds?: number | null;
  deletedAt?: string | null;
};
