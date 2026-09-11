export type Job = {
  id: string;
  priority: number;
  attempts: number;
  delayMs?: number;
};

export type CacheKey = {
  tenantId: string;
  namespace: string;
  key: string;
};

export type RuntimeLoadSignal = {
  concurrentUsers: number;
  queueDepth: number;
  avgLatencyMs: number;
};
