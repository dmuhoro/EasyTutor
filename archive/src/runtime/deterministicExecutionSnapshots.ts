import { ExecutionSnapshot, PersistenceDriver } from './unifiedRuntimeContracts';

/**
 * In-memory persistence driver used as the default when no external driver
 * (e.g. AsyncStorage) is configured. Enables deterministic snapshot tests
 * without requiring a real storage backend.
 */
class InMemoryPersistenceDriver implements PersistenceDriver {
  private store: Map<string, ExecutionSnapshot> = new Map();

  async saveSnapshot(key: string, snapshot: ExecutionSnapshot): Promise<void> {
    this.store.set(key, { ...snapshot });
  }

  async loadSnapshot(key: string): Promise<ExecutionSnapshot | null> {
    return this.store.get(key) ?? null;
  }

  clear(): void {
    this.store.clear();
  }
}

export const inMemoryDriver = new InMemoryPersistenceDriver();

export class DeterministicExecutionSnapshots {
  /**
   * Falls back to the shared in-memory driver when no external driver is
   * injected, ensuring tests can exercise full save/load cycles without I/O.
   */
  constructor(private readonly driver: PersistenceDriver = inMemoryDriver) {}

  async save(key: string, snapshot: ExecutionSnapshot): Promise<void> {
    try {
      snapshot.deterministic_hash = this.computeHash(snapshot);
      await this.driver.saveSnapshot(key, snapshot);
    } catch (err) {
      console.warn('[Snapshots] Failed to persist snapshot:', (err as Error).message);
    }
  }

  async load(key: string): Promise<ExecutionSnapshot | null> {
    try {
      return await this.driver.loadSnapshot(key);
    } catch (err) {
      console.warn('[Snapshots] Failed to load snapshot:', (err as Error).message);
      return null;
    }
  }

  computeHash(snapshot: ExecutionSnapshot): string {
    const payload = JSON.stringify({ metadata: snapshot.metadata, state: snapshot.state });
    let h = 0;
    for (let i = 0; i < payload.length; i++) {
      h = (h << 5) - h + payload.charCodeAt(i);
      h |= 0;
    }
    return `h_${Math.abs(h)}`;
  }
}

export const deterministicSnapshots = new DeterministicExecutionSnapshots();
