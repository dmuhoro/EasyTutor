import { FieldHealthScoringEngine } from './FieldHealthScoringEngine';

export class DeploymentReliabilityDashboard {
  private readonly scoring = new FieldHealthScoringEngine();

  snapshot(input: { uptime: number; syncSuccessRate: number; ticketLoad: number }): {
    reliabilityScore: number;
    status: 'healthy' | 'watch' | 'critical';
  } {
    const result = this.scoring.score(input);
    return { reliabilityScore: result.score, status: result.status };
  }
}
