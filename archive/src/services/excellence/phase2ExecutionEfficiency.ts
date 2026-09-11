import { ExecutionMetric } from './contracts';

export class RapidExecutionCoordinator {
  coordinate(metrics: ExecutionMetric[]): { accelerated: number } {
    return { accelerated: metrics.filter((m) => m.completionMinutes <= 30).length };
  }
}

export class WorkflowLatencyReducer {
  reduce(input: { baselineMs: number; optimizedMs: number }): { latencyReduction: number } {
    if (input.baselineMs <= 0) return { latencyReduction: 0 };
    return { latencyReduction: Math.max(0, (input.baselineMs - input.optimizedMs) / input.baselineMs) };
  }
}

export class SmartTaskPrioritizationEngine {
  prioritize(input: Array<{ taskId: string; impact: number; urgency: number }>): { order: string[] } {
    return {
      order: [...input]
        .sort((a, b) => (b.impact * 0.6 + b.urgency * 0.4) - (a.impact * 0.6 + a.urgency * 0.4))
        .map((t) => t.taskId),
    };
  }
}

export class ExecutionBottleneckResolver {
  resolve(input: ExecutionMetric): { resolved: boolean; remainingBottlenecks: number } {
    const remainingBottlenecks = Math.max(0, input.bottleneckCount - 1);
    return { resolved: input.bottleneckCount > 0, remainingBottlenecks };
  }
}

export class OperationalEfficiencyScorer {
  score(input: { throughput: number; latencyMs: number; errorRate: number }): { score: number } {
    const throughputScore = Math.min(1, input.throughput / 100);
    const latencyScore = Math.max(0, 1 - input.latencyMs / 1000);
    const qualityScore = Math.max(0, 1 - input.errorRate);
    return { score: Math.max(0, Math.min(1, throughputScore * 0.4 + latencyScore * 0.3 + qualityScore * 0.3)) };
  }
}
