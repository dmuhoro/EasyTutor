import { RuntimeLoadSignal } from './contracts';

export class UnifiedProductionTelemetryEngine {
  summarize(input: RuntimeLoadSignal): { throughputIndex: number } {
    const throughputIndex = Math.max(0, Math.min(1, input.concurrentUsers / 1000 * 0.5 + (1 - Math.min(1, input.avgLatencyMs / 1000)) * 0.5));
    return { throughputIndex };
  }
}

export class InfrastructureMetricsAggregator {
  aggregate(input: Array<{ cpu: number; memory: number; errors: number }>): { avgCpu: number; avgMemory: number; avgErrors: number } {
    if (input.length === 0) return { avgCpu: 0, avgMemory: 0, avgErrors: 0 };
    return {
      avgCpu: input.reduce((sum, p) => sum + p.cpu, 0) / input.length,
      avgMemory: input.reduce((sum, p) => sum + p.memory, 0) / input.length,
      avgErrors: input.reduce((sum, p) => sum + p.errors, 0) / input.length,
    };
  }
}

export class RealTimeSystemHealthMonitor {
  monitor(input: { uptime: number; errorRate: number; p95LatencyMs: number }): { health: 'healthy' | 'watch' | 'critical' } {
    if (input.uptime < 0.95 || input.errorRate > 0.08) return { health: 'critical' };
    if (input.p95LatencyMs > 450 || input.errorRate > 0.03) return { health: 'watch' };
    return { health: 'healthy' };
  }
}

export class FailurePredictionAnalyzer {
  predict(input: { incidentTrend: number[] }): { risk: 'low' | 'medium' | 'high' } {
    if (input.incidentTrend.length < 2) return { risk: 'low' };
    const delta = input.incidentTrend[input.incidentTrend.length - 1] - input.incidentTrend[0];
    if (delta > 5) return { risk: 'high' };
    if (delta > 2) return { risk: 'medium' };
    return { risk: 'low' };
  }
}

export class ProductionAlertCoordinator {
  route(input: { severity: 'low' | 'medium' | 'high' | 'critical' }): { channel: 'ops-feed' | 'incident-room' | 'exec-bridge' } {
    if (input.severity === 'critical') return { channel: 'exec-bridge' };
    if (input.severity === 'high') return { channel: 'incident-room' };
    return { channel: 'ops-feed' };
  }
}
