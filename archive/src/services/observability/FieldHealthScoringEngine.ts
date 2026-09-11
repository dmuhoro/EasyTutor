export class FieldHealthScoringEngine {
  score(input: { uptime: number; syncSuccessRate: number; ticketLoad: number }): { score: number; status: 'healthy' | 'watch' | 'critical' } {
    const score = Math.max(0, Math.min(1, input.uptime * 0.5 + input.syncSuccessRate * 0.4 + (1 - input.ticketLoad) * 0.1));
    if (score >= 0.85) return { score, status: 'healthy' };
    if (score >= 0.65) return { score, status: 'watch' };
    return { score, status: 'critical' };
  }
}
