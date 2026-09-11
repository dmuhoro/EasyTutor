import { ExecutionRegistryEntry, ExecutionSnapshot, ExecutionFilter } from './unifiedRuntimeContracts';

class RuntimeExecutionRegistry {
  private entries: Map<string, ExecutionRegistryEntry> = new Map();

  register(entry: ExecutionRegistryEntry): void {
    this.entries.set(entry.metadata.execution_id, entry);
  }

  update(execution_id: string, patch: Partial<ExecutionRegistryEntry>): void {
    const existing = this.entries.get(execution_id);
    if (!existing) return;
    const updated = { ...existing, ...patch, metadata: { ...existing.metadata, ...(patch.metadata || {}) } };
    this.entries.set(execution_id, updated);
  }

  get(execution_id: string): ExecutionRegistryEntry | null {
    return this.entries.get(execution_id) ?? null;
  }

  list(filter?: ExecutionFilter): ExecutionRegistryEntry[] {
    const results: ExecutionRegistryEntry[] = [];
    for (const entry of this.entries.values()) {
      if (filter?.status && entry.status !== filter.status) continue;
      if (filter?.canonical_id && entry.metadata.canonical_id !== filter.canonical_id) continue;
      results.push(entry);
    }
    return results;
  }

  attachSnapshot(execution_id: string, snapshot: ExecutionSnapshot): void {
    const entry = this.entries.get(execution_id);
    if (!entry) return;
    entry.snapshot = snapshot;
    this.entries.set(execution_id, entry);
  }
}

export const runtimeExecutionRegistry = new RuntimeExecutionRegistry();
