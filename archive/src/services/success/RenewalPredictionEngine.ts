import { ClientHealthScoringEngine } from './ClientHealthScoringEngine';

export class RenewalPredictionEngine {
  async predict(tenantId: string) {
    const health = await new ClientHealthScoringEngine().score(tenantId);
    const probability = Math.min(1, Math.max(0, health.score * 0.9 + 0.1));

    return {
      probability: Number(probability.toFixed(2)),
      healthScore: health.score,
      tenantId,
    };
  }
}
