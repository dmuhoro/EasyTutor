import { OperationalTask, OperatorSignal } from './contracts';

export class OperatorDecisionAssistEngine {
  recommendAction(options: Array<{ action: string; confidence: number; risk: number }>): { action: string; rationale: string } {
    const best = [...options].sort((a, b) => (b.confidence - b.risk) - (a.confidence - a.risk))[0];
    return best
      ? { action: best.action, rationale: `Selected for highest confidence-adjusted score (${(best.confidence - best.risk).toFixed(2)}).` }
      : { action: 'pause-and-escalate', rationale: 'No valid option available.' };
  }
}

export class GuidedWorkflowRecoverySystem {
  recover(stage: string, failedStep: string): { resumed: boolean; nextSteps: string[] } {
    return {
      resumed: true,
      nextSteps: [`restore-checkpoint:${stage}`, `retry-step:${failedStep}`, 'verify-output-integrity'],
    };
  }
}

export class HumanErrorPredictionEngine {
  predict(signal: OperatorSignal): { risk: 'low' | 'medium' | 'high'; score: number } {
    const score = Math.min(1, signal.fatigueScore * 0.4 + (signal.interruptionCount / 20) * 0.3 + signal.errorRate * 0.3);
    if (score > 0.7) return { risk: 'high', score };
    if (score > 0.4) return { risk: 'medium', score };
    return { risk: 'low', score };
  }
}

export class IntelligentTaskPrioritizationRuntime {
  prioritize(tasks: OperationalTask[]): OperationalTask[] {
    return [...tasks].sort((a, b) => (b.impactScore / Math.max(1, b.effortScore)) - (a.impactScore / Math.max(1, a.effortScore)) || a.dueInHours - b.dueInHours);
  }
}

export class OperationalAttentionManager {
  allocate(tasks: OperationalTask[]): { focusNow: string[]; defer: string[] } {
    const sorted = [...tasks].sort((a, b) => Number(b.overdue ?? false) - Number(a.overdue ?? false) || a.dueInHours - b.dueInHours);
    return {
      focusNow: sorted.slice(0, 3).map((t) => t.id),
      defer: sorted.slice(3).map((t) => t.id),
    };
  }
}

export class DailyOperationalDigestGenerator {
  generate(dateIso: string, tasksCompleted: number, escalations: number): { date: string; summary: string; confidence: number } {
    const confidence = Math.max(0, 1 - escalations * 0.15);
    return {
      date: dateIso,
      summary: `Completed ${tasksCompleted} tasks with ${escalations} escalations.`,
      confidence,
    };
  }
}

export class HumanReliabilityScoringEngine {
  score(input: { accuracy: number; responseTimeMs: number; escalations: number }): { score: number; tier: 'stable' | 'watch' | 'critical' } {
    const speed = Math.max(0, 1 - input.responseTimeMs / 15000);
    const score = Math.max(0, Math.min(1, input.accuracy * 0.6 + speed * 0.25 + Math.max(0, 1 - input.escalations * 0.2) * 0.15));
    if (score >= 0.75) return { score, tier: 'stable' };
    if (score >= 0.5) return { score, tier: 'watch' };
    return { score, tier: 'critical' };
  }
}

export class InstitutionalTrainingSimulationRuntime {
  simulate(operators: number, scenarios: number): { completionRate: number; riskHotspots: string[] } {
    const completionRate = Math.max(0.5, Math.min(0.99, 0.6 + operators * 0.01 - scenarios * 0.005));
    const riskHotspots = scenarios > operators ? ['handoff-gaps', 'escalation-latency'] : ['none-critical'];
    return { completionRate, riskHotspots };
  }
}
