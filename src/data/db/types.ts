export type SqlParams = (number | string | null | undefined)[];

export type DatabaseClient = {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string, params?: SqlParams): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParams): Promise<T | null>;
  runAsync(sql: string, params?: SqlParams): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};
