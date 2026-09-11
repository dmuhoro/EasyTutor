import { SyncEnvelope } from '../field/types';
import { ConflictRecoveryResolver } from './ConflictRecoveryResolver';

export class OfflineOperationalSyncEngine<T extends Record<string, unknown>> {
  private readonly resolver = new ConflictRecoveryResolver<T>();

  sync(localQueue: Array<SyncEnvelope<T>>, remoteQueue: Array<SyncEnvelope<T>>): Array<SyncEnvelope<T>> {
    const byId = new Map<string, SyncEnvelope<T>>();
    for (const item of [...localQueue, ...remoteQueue]) {
      const existing = byId.get(item.id);
      byId.set(item.id, existing ? this.resolver.resolve(existing, item) : item);
    }
    return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  }
}
