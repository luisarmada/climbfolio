export type Attempt = {
  id: string;
  climbId: string;
  attemptNumber: number;
  timestamp: string;
  restSincePreviousAttemptSeconds: number | null;
  createdAt: string;
  deletedAt: string | null;
};

export type CreateAttemptInput = {
  id?: string;
  climbId: string;
  attemptNumber: number;
  timestamp?: string;
  restSincePreviousAttemptSeconds?: number | null;
};

export type UpdateAttemptInput = {
  deletedAt?: string | null;
};
