import { FailureSignal } from './contracts';

export class InfrastructureStressResponseEngine {
  respond(input: { stressLevel: number; queueBacklog: number }): { mode: 'normal' | 'degraded' | 'emergency' } {
    const score = input.stressLevel * 0.7 + Math.min(1, input.queueBacklog / 1000) * 0.3;
    if (score > 0.75) return { mode: 'emergency' };
    if (score > 0.45) return { mode: 'degraded' };
    return { mode: 'normal' };
  }
}

export class FailurePatternLearningRuntime {
  learn(signals: FailureSignal[]): { recurringCategories: string[] } {
    const counts = new Map<string, number>();
    for (const signal of signals) {
      counts.set(signal.category, (counts.get(signal.category) ?? 0) + 1);
    }
    return {
      recurringCategories: [...counts.entries()].filter(([, count]) => count > 1).map(([category]) => category),
    };
  }
}

export class OperationalRecoveryIntelligence {
  evaluate(signals: FailureSignal[]): { recoveryRate: number } {
    if (signals.length === 0) return { recoveryRate: 0 };
    const recovered = signals.filter((s) => s.recovered).length;
    return { recoveryRate: recovered / signals.length };
  }
}

export class DynamicFallbackCoordinator {
  coordinate(input: { incidentSeverity: number; backupAvailable: boolean }): { fallback: 'none' | 'partial' | 'full' } {
    if (!input.backupAvailable) return { fallback: 'none' };
    if (input.incidentSeverity > 7) return { fallback: 'full' };
    if (input.incidentSeverity > 3) return { fallback: 'partial' };
    return { fallback: 'none' };
  }
}
