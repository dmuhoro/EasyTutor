import { FieldRuntimeSignal } from './contracts';

export class LowConnectivityExecutionManager {
  manage(signal: FieldRuntimeSignal): { mode: 'online' | 'degraded' | 'offline-first' } {
    if (signal.connectivityScore < 0.3) return { mode: 'offline-first' };
    if (signal.connectivityScore < 0.65) return { mode: 'degraded' };
    return { mode: 'online' };
  }
}

export class DeviceCapabilityAdapter {
  adapt(input: { deviceClass: 'low' | 'mid' | 'high' }): { profile: string; features: string[] } {
    if (input.deviceClass === 'low') return { profile: 'lite', features: ['core-workflows', 'offline-sync'] };
    if (input.deviceClass === 'mid') return { profile: 'balanced', features: ['core-workflows', 'assistant', 'offline-sync'] };
    return { profile: 'full', features: ['core-workflows', 'assistant', 'analytics', 'offline-sync'] };
  }
}

export class OfflineConflictResolutionEngine {
  resolve(records: Array<{ id: string; localRevision: number; remoteRevision: number }>): { resolved: number; conflicts: string[] } {
    const conflicts = records.filter((r) => r.localRevision === r.remoteRevision).map((r) => r.id);
    return { resolved: records.length - conflicts.length, conflicts };
  }
}

export class ResourceAwareRuntimeScaler {
  scale(input: { cpuBudget: number; memoryBudget: number; queueDepth: number }): { workers: number } {
    const budgetFactor = Math.max(1, Math.floor((input.cpuBudget + input.memoryBudget) / 2));
    return { workers: Math.max(1, Math.min(20, Math.floor(budgetFactor + input.queueDepth / 5))) };
  }
}

export class MultiRegionOperationalCoordinator {
  coordinate(input: Array<{ region: string; healthy: boolean }>): { healthyRegions: string[]; degradedRegions: string[] } {
    return {
      healthyRegions: input.filter((r) => r.healthy).map((r) => r.region),
      degradedRegions: input.filter((r) => !r.healthy).map((r) => r.region),
    };
  }
}
