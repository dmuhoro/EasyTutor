import { SyncEnvelope } from '../field/types';

export class ConflictRecoveryResolver<T extends Record<string, unknown>> {
  resolve(local: SyncEnvelope<T>, remote: SyncEnvelope<T>): SyncEnvelope<T> {
    if (local.revision > remote.revision) return local;
    if (remote.revision > local.revision) return remote;
    return new Date(local.timestamp).getTime() >= new Date(remote.timestamp).getTime() ? local : remote;
  }
}
