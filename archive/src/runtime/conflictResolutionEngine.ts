import { ExecutionSnapshot } from './unifiedRuntimeContracts';

/**
 * CONFLICT RESOLUTION ENGINE
 * 
 * Deterministically resolves state conflicts between local and remote snapshots.
 * Mandated for all offline sync reconciliation paths.
 */
export type ResolutionStrategy = 'latest_wins' | 'merge_progressive' | 'remote_priority' | 'local_priority';

export class ConflictResolutionEngine {
  resolve(
    local: ExecutionSnapshot, 
    remote: ExecutionSnapshot, 
    strategy: ResolutionStrategy = 'latest_wins'
  ): ExecutionSnapshot {
    switch (strategy) {
      case 'merge_progressive':
        return this.mergeSnapshots(local, remote);
      case 'remote_priority':
        return remote;
      case 'local_priority':
        return local;
      case 'latest_wins':
      default:
        return this.latestWins(local, remote);
    }
  }

  private latestWins(a: ExecutionSnapshot, b: ExecutionSnapshot): ExecutionSnapshot {
    const ta = new Date(a.metadata.updated_at || a.metadata.started_at).getTime();
    const tb = new Date(b.metadata.updated_at || b.metadata.started_at).getTime();
    return ta >= tb ? a : b;
  }

  private mergeSnapshots(local: ExecutionSnapshot, remote: ExecutionSnapshot): ExecutionSnapshot {
    // Basic structural merge for state - prefer remote for metadata updates
    const mergedState = {
      ...(typeof local.state === 'object' ? local.state : {}),
      ...(typeof remote.state === 'object' ? remote.state : {})
    };

    return {
      metadata: this.latestWins(local, remote).metadata,
      state: mergedState,
      deterministic_hash: remote.deterministic_hash // Re-hash happens later in snapshot save
    };
  }
}

export const conflictResolutionEngine = new ConflictResolutionEngine();
