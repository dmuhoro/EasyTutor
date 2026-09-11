import { JourneySignal } from './contracts';

export class IntelligentOperatorJourneyEngine {
  map(signal: JourneySignal): { journeyHealth: 'low' | 'medium' | 'high' } {
    const score = (1 - signal.frictionScore) * 0.6 + signal.satisfactionScore * 0.4;
    if (score > 0.75) return { journeyHealth: 'high' };
    if (score > 0.45) return { journeyHealth: 'medium' };
    return { journeyHealth: 'low' };
  }
}

export class AdaptiveOnboardingSimplifier {
  simplify(input: { steps: string[]; operatorExperience: number }): { simplifiedSteps: string[] } {
    if (input.operatorExperience < 0.4) return { simplifiedSteps: input.steps.filter((_, i) => i % 2 === 0 || i === input.steps.length - 1) };
    return { simplifiedSteps: input.steps };
  }
}

export class WorkflowComplexityReducer {
  reduce(input: { tasks: string[]; complexityScore: number }): { optimizedTasks: string[] } {
    if (input.complexityScore <= 0.5) return { optimizedTasks: input.tasks };
    return { optimizedTasks: input.tasks.slice(0, Math.max(1, Math.ceil(input.tasks.length * 0.7))) };
  }
}

export class ContextAwareActionRecommender {
  recommend(input: { pendingCritical: number; confidence: number }): { nextAction: string } {
    if (input.pendingCritical > 0) return { nextAction: 'resolve-critical-workflow-first' };
    if (input.confidence < 0.5) return { nextAction: 'switch-to-guided-mode' };
    return { nextAction: 'continue-optimized-path' };
  }
}

export class CustomerExperienceTelemetryRuntime {
  summarize(signals: JourneySignal[]): { avgFriction: number; avgSatisfaction: number } {
    if (signals.length === 0) return { avgFriction: 0, avgSatisfaction: 0 };
    return {
      avgFriction: signals.reduce((sum, s) => sum + s.frictionScore, 0) / signals.length,
      avgSatisfaction: signals.reduce((sum, s) => sum + s.satisfactionScore, 0) / signals.length,
    };
  }
}
