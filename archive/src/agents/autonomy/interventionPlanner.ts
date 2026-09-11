import { AgentGoal } from '../agenticContracts';

export class InterventionPlanner {
  plan(goal: AgentGoal, motivationalIntensity: number): {
    interventions: string[];
    review_cadence: 'light' | 'moderate' | 'intensive';
  } {
    const cadence = motivationalIntensity > 0.7 ? 'intensive' : motivationalIntensity > 0.4 ? 'moderate' : 'light';
    return {
      interventions: [
        `Reframe ${goal.title} into one measurable next step`,
        'Inject governed retrieval evidence before the next assessment checkpoint',
      ],
      review_cadence: cadence,
    };
  }
}
