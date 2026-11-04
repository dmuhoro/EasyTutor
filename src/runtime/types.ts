import type { PortalType } from '../types/canonical';

/**
 * Shared runtime contracts. They live in a leaf module so parent and child
 * runtime engines can both import them without pointing back at
 * `hybridRuntime.ts` (which previously created 11 cycles).
 */
export interface RuntimeExecution {
  runtime_id: string;
  execution_mode: 'local' | 'cloud' | 'hybrid' | 'offline';
  portal_type: PortalType;
  canonical_id: string;
  latency_budget: number;
  memory_budget: number;
  battery_budget: number;
  fallback_strategy: 'local_first' | 'cloud_first' | 'offline_only';
  execution_priority: 'critical' | 'high' | 'normal' | 'low';
  runtime_timestamp: string;
  // Optional fields populated by scheduler for routers/engines
  operation?: string;
  context?: Record<string, unknown>;
  learner_profile?: Record<string, unknown>;
}

export interface RuntimeRequest {
  portal_type: PortalType;
  canonical_id: string;
  operation: 'inference' | 'retrieval' | 'reasoning' | 'generation';
  payload: Record<string, unknown>;
  constraints?: {
    maxLatency?: number;
    maxMemory?: number;
    batterySensitive?: boolean;
  };
}

export interface RuntimeTelemetry {
  execution_time: number;
  memory_used: number;
  battery_impact: number;
  network_used: boolean;
  cache_hit: boolean;
  fallback_triggered: boolean;
}

export interface RuntimeResult {
  success: boolean;
  execution: RuntimeExecution;
  result: unknown;
  fallback_used?: boolean;
  telemetry: RuntimeTelemetry;
}
