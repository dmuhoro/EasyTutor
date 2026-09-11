import { BusinessOutcomeSignal } from './contracts';

export class BusinessOutcomeMeasurementEngine {
  measure(signal: BusinessOutcomeSignal): { revenueDelta: number; cycleTimeImprovement: number } {
    return {
      revenueDelta: signal.currentRevenue - signal.baselineRevenue,
      cycleTimeImprovement: signal.baselineCycleHours - signal.currentCycleHours,
    };
  }
}

export class CustomerValueRealizationTracker {
  track(input: { promisedValue: number; realizedValue: number }): { realizationRate: number } {
    return { realizationRate: input.promisedValue === 0 ? 0 : input.realizedValue / input.promisedValue };
  }
}

export class OperationalEfficiencyScoringEngine {
  score(input: { throughput: number; errorRate: number; avgTurnaroundHours: number }): { score: number } {
    const throughputScore = Math.min(1, input.throughput / 100);
    const qualityScore = Math.max(0, 1 - input.errorRate);
    const speedScore = Math.max(0, 1 - input.avgTurnaroundHours / 48);
    return { score: Math.max(0, Math.min(1, throughputScore * 0.4 + qualityScore * 0.3 + speedScore * 0.3)) };
  }
}

export class RevenueImpactAnalyzer {
  analyze(input: { oldMRR: number; newMRR: number; costIncrease: number }): { netImpact: number } {
    return { netImpact: (input.newMRR - input.oldMRR) - input.costIncrease };
  }
}

export class SMETransformationCoordinator {
  coordinate(input: { milestonesCompleted: number; milestonesTotal: number }): { transformationProgress: number } {
    return { transformationProgress: input.milestonesTotal === 0 ? 0 : input.milestonesCompleted / input.milestonesTotal };
  }
}
