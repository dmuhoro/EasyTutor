export class ReliabilityScoreAggregator {
  aggregate(metrics: { uptime: number; validationPassRate: number; rollbackReadiness: number }): {
    score: number;
  } {
    const score = metrics.uptime * 0.4 + metrics.validationPassRate * 0.35 + metrics.rollbackReadiness * 0.25;
    return { score: Number(score.toFixed(2)) };
  }
}
