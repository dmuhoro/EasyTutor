import { TenantUsageSignal } from './contracts';

export class CustomerBehaviorTelemetryEngine {
  summarize(signals: TenantUsageSignal[]): { tenants: number; totalActiveUsers: number; totalRuns: number } {
    return {
      tenants: signals.length,
      totalActiveUsers: signals.reduce((sum, s) => sum + s.activeUsers, 0),
      totalRuns: signals.reduce((sum, s) => sum + s.workflowRuns, 0),
    };
  }
}

export class OperationalFeedbackLoopCoordinator {
  coordinate(input: { regressions: number; incidents: number }): { priority: 'normal' | 'high'; actions: string[] } {
    const high = input.regressions > 0 || input.incidents > 2;
    return {
      priority: high ? 'high' : 'normal',
      actions: high ? ['notify-ops', 'open-improvement-loop'] : ['log-weekly-review'],
    };
  }
}

export class TenantHealthIntelligenceEngine {
  evaluate(signal: TenantUsageSignal): { score: number; state: 'healthy' | 'watch' | 'critical' } {
    const score = Math.max(0, Math.min(1, signal.activeUsers / 100 * 0.4 + signal.workflowRuns / 200 * 0.4 + Math.max(0, 1 - signal.incidentCount / 10) * 0.2));
    if (score >= 0.75) return { score, state: 'healthy' };
    if (score >= 0.5) return { score, state: 'watch' };
    return { score, state: 'critical' };
  }
}

export class UsageRegressionDetector {
  detect(input: { previousRuns: number; currentRuns: number }): { regressed: boolean; delta: number } {
    const delta = input.currentRuns - input.previousRuns;
    return { regressed: delta < 0, delta };
  }
}

export class AdoptionMomentumAnalyzer {
  analyze(points: number[]): { momentum: number; trend: 'up' | 'flat' | 'down' } {
    if (points.length < 2) return { momentum: 0, trend: 'flat' };
    const momentum = points[points.length - 1] - points[0];
    return { momentum, trend: momentum > 0 ? 'up' : momentum < 0 ? 'down' : 'flat' };
  }
}
