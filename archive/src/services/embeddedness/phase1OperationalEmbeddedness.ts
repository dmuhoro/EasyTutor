import { DependencySignal } from './contracts';

export class DailyWorkflowEmbeddingEngine {
  measure(signals: DependencySignal[]): { embeddedWorkflows: string[] } {
    return {
      embeddedWorkflows: signals
        .filter((s) => s.dailyUsage >= 5 && s.replaceability < 0.4)
        .map((s) => s.workflow),
    };
  }
}

export class OperationalHabitFormationRuntime {
  score(input: { routineDays: number; completionRate: number }): { habitStrength: number } {
    const dayScore = Math.min(1, input.routineDays / 30);
    return { habitStrength: Math.max(0, Math.min(1, dayScore * 0.5 + input.completionRate * 0.5)) };
  }
}

export class CrossDepartmentExecutionCoordinator {
  coordinate(input: Array<{ department: string; workflows: number; blocked: number }>): { coordinationHealth: number } {
    if (input.length === 0) return { coordinationHealth: 0 };
    const total = input.reduce((sum, item) => sum + item.workflows, 0);
    const blocked = input.reduce((sum, item) => sum + item.blocked, 0);
    if (total === 0) return { coordinationHealth: 0 };
    return { coordinationHealth: Math.max(0, 1 - blocked / total) };
  }
}

export class BusinessDependencySignalTracker {
  track(signals: DependencySignal[]): { criticalityScore: number } {
    if (signals.length === 0) return { criticalityScore: 0 };
    const score = signals
      .map((signal) => (signal.revenueLinked ? 0.6 : 0.3) + Math.min(0.3, signal.dailyUsage / 20) + (1 - signal.replaceability) * 0.1)
      .reduce((a, b) => a + b, 0) / signals.length;
    return { criticalityScore: Math.max(0, Math.min(1, score)) };
  }
}
