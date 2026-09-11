export class AdaptiveRefinementEngine {
  refine(input: { friction: number; impact: number }): { priority: 'low' | 'medium' | 'high' } {
    const score = input.friction * 0.6 + input.impact * 0.4;
    if (score > 0.75) return { priority: 'high' };
    if (score > 0.45) return { priority: 'medium' };
    return { priority: 'low' };
  }
}

export class UsageDrivenPrioritizationSystem {
  prioritize(items: Array<{ feature: string; usage: number; pain: number }>): { order: string[] } {
    return { order: [...items].sort((a, b) => (b.pain * 0.6 + b.usage * 0.4) - (a.pain * 0.6 + a.usage * 0.4)).map((i) => i.feature) };
  }
}

export class ProductEvolutionCoordinator {
  coordinate(actions: Array<{ id: string; approved: boolean }>): { approvedActions: string[] } {
    return { approvedActions: actions.filter((a) => a.approved).map((a) => a.id) };
  }
}

export class RealWorldWorkflowOptimizer {
  optimize(input: { baselineMinutes: number; optimizedMinutes: number }): { gain: number } {
    if (input.baselineMinutes <= 0) return { gain: 0 };
    return { gain: Math.max(0, (input.baselineMinutes - input.optimizedMinutes) / input.baselineMinutes) };
  }
}

export class InstitutionalImprovementRecommender {
  recommend(input: { readiness: number; frictionHotspots: number }): { recommendations: string[] } {
    const recs: string[] = [];
    if (input.readiness < 0.75) recs.push('increase-onboarding-guidance');
    if (input.frictionHotspots > 0) recs.push('prioritize-workflow-simplification');
    if (recs.length === 0) recs.push('maintain-current-trajectory');
    return { recommendations: recs };
  }
}
