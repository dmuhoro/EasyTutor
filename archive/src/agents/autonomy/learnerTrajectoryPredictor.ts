import { AgentExecutionContext } from '../agenticContracts';

export class LearnerTrajectoryPredictor {
  predict(context: AgentExecutionContext): {
    momentum: 'fragile' | 'stable' | 'accelerating';
    projected_mastery_delta: number;
  } {
    const budgetSignal = context.execution_budget.max_steps >= 6 ? 'accelerating' : 'stable';
    return {
      momentum: context.offline_available ? budgetSignal : 'fragile',
      projected_mastery_delta: context.offline_available ? 0.12 : 0.05,
    };
  }
}
