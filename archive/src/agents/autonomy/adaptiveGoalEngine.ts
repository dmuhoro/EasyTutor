import { AgentExecutionContext, AgentGoal, deterministicId } from '../agenticContracts';

export class AdaptiveGoalEngine {
  evolve(baseGoal: AgentGoal, context: AgentExecutionContext, masterySignal: number): AgentGoal {
    const horizon = masterySignal > 0.75 ? 'long_horizon' : masterySignal > 0.4 ? 'session' : 'immediate';
    return {
      ...baseGoal,
      goal_id: deterministicId(baseGoal.goal_id, context.session_id, 'adaptive'),
      horizon,
      metadata: {
        ...baseGoal.metadata,
        mastery_signal: masterySignal,
      },
    };
  }
}
