import { AgentExecutionContext } from '../agenticContracts';

export class MotivationalStateEngine {
  assess(context: AgentExecutionContext): {
    state: 'engaged' | 'fatigued' | 'recovering';
    intervention_intensity: number;
  } {
    const maxRuntime = context.execution_budget.max_runtime_ms;
    if (maxRuntime < 2500) {
      return { state: 'fatigued', intervention_intensity: 0.9 };
    }

    return {
      state: context.offline_available ? 'engaged' : 'recovering',
      intervention_intensity: context.offline_available ? 0.3 : 0.6,
    };
  }
}
