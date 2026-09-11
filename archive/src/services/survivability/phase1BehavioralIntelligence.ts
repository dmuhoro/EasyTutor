import { BehaviorSignal } from './contracts';

export class BehavioralTelemetryEngine {
  summarize(signals: BehaviorSignal[]): { avgCompletion: number; avgDropoff: number } {
    if (signals.length === 0) return { avgCompletion: 0, avgDropoff: 0 };
    return {
      avgCompletion: signals.reduce((sum, s) => sum + s.completionRate, 0) / signals.length,
      avgDropoff: signals.reduce((sum, s) => sum + s.dropoffRate, 0) / signals.length,
    };
  }
}

export class UserFrictionHeatmapRuntime {
  build(signals: BehaviorSignal[]): Record<string, number> {
    const heatmap: Record<string, number> = {};
    for (const signal of signals) {
      heatmap[signal.workflow] = (heatmap[signal.workflow] ?? 0) + signal.hesitationCount + signal.dropoffRate * 10;
    }
    return heatmap;
  }
}

export class OperationalDropoffAnalyzer {
  analyze(signals: BehaviorSignal[]): { riskWorkflows: string[] } {
    return {
      riskWorkflows: signals.filter((s) => s.dropoffRate > 0.25).map((s) => s.workflow),
    };
  }
}

export class WorkflowAbandonmentPredictor {
  predict(signal: BehaviorSignal): { abandonmentRisk: 'low' | 'medium' | 'high' } {
    const score = signal.dropoffRate * 0.6 + (signal.hesitationCount / 20) * 0.4;
    if (score > 0.6) return { abandonmentRisk: 'high' };
    if (score > 0.35) return { abandonmentRisk: 'medium' };
    return { abandonmentRisk: 'low' };
  }
}
