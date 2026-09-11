import { CacheKey } from './contracts';

export class SemanticResponseCache {
  private readonly store = new Map<string, string>();

  private key(input: CacheKey): string {
    return `${input.tenantId}:${input.namespace}:${input.key}`;
  }

  get(input: CacheKey): string | undefined {
    return this.store.get(this.key(input));
  }

  set(input: CacheKey, value: string): { cached: boolean; size: number } {
    this.store.set(this.key(input), value);
    return { cached: true, size: this.store.size };
  }
}

export class TenantAwareCacheManager {
  partition(keys: CacheKey[]): { tenantCount: number; keysPerTenant: Record<string, number> } {
    const keysPerTenant: Record<string, number> = {};
    for (const key of keys) {
      keysPerTenant[key.tenantId] = (keysPerTenant[key.tenantId] ?? 0) + 1;
    }
    return { tenantCount: Object.keys(keysPerTenant).length, keysPerTenant };
  }
}

export class AIInferenceOptimizationEngine {
  optimize(input: { repeatedRequests: number; deduplicatedRequests: number }): { reductionRate: number } {
    if (input.repeatedRequests === 0) return { reductionRate: 0 };
    return { reductionRate: Math.max(0, Math.min(1, input.deduplicatedRequests / input.repeatedRequests)) };
  }
}

export class QueryAccelerationLayer {
  accelerate(input: { baselineMs: number; acceleratedMs: number }): { latencyGain: number } {
    if (input.baselineMs <= 0) return { latencyGain: 0 };
    return { latencyGain: Math.max(0, (input.baselineMs - input.acceleratedMs) / input.baselineMs) };
  }
}

export class HotPathExecutionReducer {
  reduce(input: { hotPathCalls: number; optimizedCalls: number }): { reduction: number } {
    if (input.hotPathCalls === 0) return { reduction: 0 };
    return { reduction: Math.max(0, Math.min(1, (input.hotPathCalls - input.optimizedCalls) / input.hotPathCalls)) };
  }
}
