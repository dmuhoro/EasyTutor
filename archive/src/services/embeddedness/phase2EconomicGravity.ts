import { EconomicSignal } from './contracts';

export class RevenueDependencyEngine {
  quantify(signal: EconomicSignal): { dependencyRate: number } {
    if (signal.currentRevenue <= 0) return { dependencyRate: 0 };
    const uplift = Math.max(0, signal.currentRevenue - signal.baselineRevenue);
    return { dependencyRate: Math.max(0, Math.min(1, uplift / signal.currentRevenue)) };
  }
}

export class BusinessCashflowIntegrationRuntime {
  integrate(input: { inflowsTracked: number; totalInflows: number; outflowsTracked: number; totalOutflows: number }): { coverage: number } {
    const total = input.totalInflows + input.totalOutflows;
    const tracked = input.inflowsTracked + input.outflowsTracked;
    if (total <= 0) return { coverage: 0 };
    return { coverage: Math.max(0, Math.min(1, tracked / total)) };
  }
}

export class RecurringValueLoopAnalyzer {
  analyze(input: { loopsTriggered: number; loopsCompleted: number }): { loopReliability: number } {
    if (input.loopsTriggered <= 0) return { loopReliability: 0 };
    return { loopReliability: Math.max(0, Math.min(1, input.loopsCompleted / input.loopsTriggered)) };
  }
}

export class CustomerEconomicRetentionPredictor {
  predict(input: { dependencyRate: number; cashflowCoverage: number; loopReliability: number }): { retentionProbability: number } {
    return {
      retentionProbability: Math.max(0, Math.min(1, input.dependencyRate * 0.4 + input.cashflowCoverage * 0.3 + input.loopReliability * 0.3)),
    };
  }
}
