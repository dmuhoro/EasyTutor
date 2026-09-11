import { runtimeExecutionRegistry } from './runtimeExecutionRegistry';
import { ExecutionRegistryEntry } from './unifiedRuntimeContracts';

/**
 * RUNTIME HEALTH MONITOR
 * 
 * Monitors the operational health of the cognitive runtime.
 */
export class RuntimeHealthMonitor {
  private static instance: RuntimeHealthMonitor;

  static getInstance(): RuntimeHealthMonitor {
    if (!RuntimeHealthMonitor.instance) {
      RuntimeHealthMonitor.instance = new RuntimeHealthMonitor();
    }
    return RuntimeHealthMonitor.instance;
  }
  async getStatus(): Promise<{ 
    healthy: boolean; 
    activeExecutions: number; 
    queueDepth: number; 
    issues: string[];
    performanceScore: number;
  }> {
    const all = runtimeExecutionRegistry.list();
    const active = all.filter(e => e.status === 'running').length;
    const queued = all.filter(e => e.status === 'queued').length;
    const issues: string[] = [];

    // Memory Pressure
    if (active > 20) issues.push('Runtime concurrency at capacity');
    if (queued > 50) issues.push('Execution queue building up');

    // Latency Check
    const recentFailures = all.filter(e => e.status === 'failed').slice(-10);
    if (recentFailures.length > 5) issues.push('High failure rate in recent executions');

    // Calculate performance score (0-100)
    let score = 100;
    score -= (active * 2);
    score -= (queued * 1);
    score -= (recentFailures.length * 5);

    return {
      healthy: issues.length === 0,
      activeExecutions: active,
      queueDepth: queued,
      issues,
      performanceScore: Math.max(0, score)
    };
  }

  async probeEntry(execution_id: string): Promise<ExecutionRegistryEntry | null> {
    return runtimeExecutionRegistry.get(execution_id);
  }
}

export const runtimeHealthMonitor = new RuntimeHealthMonitor();
