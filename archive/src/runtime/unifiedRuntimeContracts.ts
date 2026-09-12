export interface ExecutionMetadata {
  execution_id: string;
  runtime_id?: string;
  canonical_id: string;
  portal_type?: string;
  operation: string;
  started_at: string;
  updated_at?: string;
}

export interface ExecutionSnapshot {
  metadata: ExecutionMetadata;
  state: unknown;
  deterministic_hash?: string;
}

export interface ExecutionRegistryEntry {
  metadata: ExecutionMetadata;
  snapshot?: ExecutionSnapshot;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'resumable';
}

export type ExecutionFilter = Partial<Pick<ExecutionRegistryEntry, 'status'>> & {
  canonical_id?: string;
};

export interface PersistenceDriver {
  saveSnapshot(key: string, snapshot: ExecutionSnapshot): Promise<void>;
  loadSnapshot(key: string): Promise<ExecutionSnapshot | null>;
}

export const DEFAULT_SNAPSHOT_TTL = 1000 * 60 * 60 * 24; // 24 hours
