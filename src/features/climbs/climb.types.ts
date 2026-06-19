import { Climb } from '../../domain/models';

export type StartClimbInput = {
  colour?: string | null;
  grade: string;
  holdTypes?: string[];
  sessionId: string;
};

export type ActiveClimbUpdate = {
  climb: Climb;
};
