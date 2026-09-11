import { AdaptiveGoalEngine } from './adaptiveGoalEngine';
import { CognitiveCoachingEngine } from './cognitiveCoachingEngine';
import { InterventionPlanner } from './interventionPlanner';
import { LearnerTrajectoryPredictor } from './learnerTrajectoryPredictor';
import { MotivationalStateEngine } from './motivationalStateEngine';
import { SelfImprovementLoop } from './selfImprovementLoop';
import { AgentExecutionContext, AgentGoal } from '../agenticContracts';

export class AutonomousTutorLoop {
  constructor(
    private readonly adaptiveGoals = new AdaptiveGoalEngine(),
    private readonly trajectory = new LearnerTrajectoryPredictor(),
    private readonly motivation = new MotivationalStateEngine(),
    private readonly interventions = new InterventionPlanner(),
    private readonly coaching = new CognitiveCoachingEngine(),
    private readonly selfImprovement = new SelfImprovementLoop(),
  ) {}

  run(goal: AgentGoal, context: AgentExecutionContext, masterySignal: number): {
    evolved_goal: AgentGoal;
    coaching_plan: string[];
    self_improvement_actions: string[];
  } {
    const evolvedGoal = this.adaptiveGoals.evolve(goal, context, masterySignal);
    const trajectory = this.trajectory.predict(context);
    const motivation = this.motivation.assess(context);
    const interventions = this.interventions.plan(evolvedGoal, motivation.intervention_intensity);
    const coachingPlan = this.coaching.coach(trajectory.momentum, interventions.interventions);
    const improvement = this.selfImprovement.refine(interventions.interventions);

    return {
      evolved_goal: evolvedGoal,
      coaching_plan: coachingPlan,
      self_improvement_actions: improvement.actions,
    };
  }
}
