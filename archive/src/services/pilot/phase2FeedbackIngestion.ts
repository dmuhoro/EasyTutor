import { FeedbackSignal } from './contracts';

export class OperationalFeedbackCollector {
  collect(signals: FeedbackSignal[]): { collected: number; critical: number } {
    return { collected: signals.length, critical: signals.filter((s) => s.frictionScore > 0.8 || s.incident).length };
  }
}

export class UserFrictionSignalEngine {
  detect(signals: FeedbackSignal[]): { topPainPoints: string[] } {
    const grouped = new Map<string, number>();
    for (const signal of signals) {
      grouped.set(signal.workflow, (grouped.get(signal.workflow) ?? 0) + signal.frictionScore);
    }
    return { topPainPoints: [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([workflow]) => workflow) };
  }
}

export class CustomerBehaviorTelemetryRuntime {
  summarize(input: { sessions: number; taskCompletions: number; dropOffs: number }): { completionRate: number; dropOffRate: number } {
    if (input.sessions === 0) return { completionRate: 0, dropOffRate: 0 };
    return {
      completionRate: input.taskCompletions / input.sessions,
      dropOffRate: input.dropOffs / input.sessions,
    };
  }
}

export class FeatureRealityValidationEngine {
  validate(input: { expectedAdoption: number; actualAdoption: number }): { validated: boolean; adoptionGap: number } {
    const adoptionGap = input.actualAdoption - input.expectedAdoption;
    return { validated: adoptionGap >= -0.1, adoptionGap };
  }
}

export class DeploymentIssueCorrelationAnalyzer {
  correlate(input: Array<{ stage: string; failed: boolean }>): { hotspots: string[] } {
    const counts = new Map<string, number>();
    for (const item of input) {
      if (!item.failed) continue;
      counts.set(item.stage, (counts.get(item.stage) ?? 0) + 1);
    }
    return { hotspots: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([stage]) => stage) };
  }
}
