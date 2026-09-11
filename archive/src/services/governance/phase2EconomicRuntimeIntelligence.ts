import { EconomicHealthSignal } from './contracts';

export class RevenueStabilityIntelligence {
  assess(signals: EconomicHealthSignal[]): { stabilityScore: number } {
    const healthScores = signals.map(s => s.revenueHealth);
    const variance = healthScores.reduce((sum, h) => sum + Math.pow(h - 0.7, 2), 0) / signals.length;
    return { stabilityScore: Math.max(0, 1 - variance) };
  }
}

export class OperationalCostAwarenessEngine {
  evaluate(signal: EconomicHealthSignal): { pressureLevel: 'low' | 'medium' | 'high' } {
    if (signal.operationalCostPressure > 0.75) return { pressureLevel: 'high' };
    if (signal.operationalCostPressure > 0.5) return { pressureLevel: 'medium' };
    return { pressureLevel: 'low' };
  }
}

export class TenantEconomicHealthRuntime {
  score(signal: EconomicHealthSignal): { economicHealth: number } {
    const weighted = (signal.revenueHealth * 0.5) + (signal.resourceEfficiencyScore * 0.5);
    return { economicHealth: Math.min(1, Math.max(0, weighted)) };
  }
}

export class InfrastructureEfficiencyCoordinator {
  coordinate(signals: EconomicHealthSignal[]): { avgEfficiency: number; trendDirection: string } {
    const avgEff = signals.reduce((sum, s) => sum + s.resourceEfficiencyScore, 0) / signals.length;
    const trend = signals[signals.length - 1]?.economicStabilityTrend || 'stable';
    return { avgEfficiency: avgEff, trendDirection: trend };
  }
}
