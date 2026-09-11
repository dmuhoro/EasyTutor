/**
 * FINANCIAL RELIABILITY SCORER
 *
 * Scores and tracks financial reliability over time:
 * - Payment history
 * - Settlement compliance
 * - Transaction success rate
 * - Risk profile
 */

import { ReliabilityScore, Transaction } from './paymentContracts';

export interface ScoreHistory {
  scores: ReliabilityScore[];
  trend: 'improving' | 'stable' | 'declining';
  average_score: number;
}

export class FinancialReliabilityScorer {
  private scores: Map<string, ReliabilityScore[]> = new Map();
  private successfulTransactions: Map<string, number> = new Map();
  private failedTransactions: Map<string, number> = new Map();

  async calculateScore(
    tenant_id: string,
    totalTransactions: number,
    successfulTransactions: number,
    settlementComplianceRate: number,
    paymentHistoryScore: number
  ): Promise<ReliabilityScore> {
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    // Weighted components
    const weights = {
      success_rate: 0.3,
      settlement_compliance: 0.3,
      payment_history: 0.25,
      consistency: 0.15,
    };

    // Consistency score (stability over time)
    const consistencyScore = this.calculateConsistency(tenant_id);

    const totalScore =
      successRate * weights.success_rate +
      settlementComplianceRate * weights.settlement_compliance +
      paymentHistoryScore * weights.payment_history +
      consistencyScore * weights.consistency;

    const score: ReliabilityScore = {
      tenant_id,
      score: Math.round(totalScore),
      transaction_success_rate: successRate,
      payment_history: paymentHistoryScore,
      settlement_compliance: settlementComplianceRate,
      timestamp: new Date().toISOString(),
    };

    // Store score
    const history = this.scores.get(tenant_id) || [];
    history.push(score);
    this.scores.set(tenant_id, history);

    return score;
  }

  async recordTransactionResult(tenant_id: string, success: boolean): Promise<void> {
    if (success) {
      this.successfulTransactions.set(
        tenant_id,
        (this.successfulTransactions.get(tenant_id) || 0) + 1
      );
    } else {
      this.failedTransactions.set(tenant_id, (this.failedTransactions.get(tenant_id) || 0) + 1);
    }
  }

  private calculateConsistency(tenant_id: string): number {
    const scores = this.scores.get(tenant_id) || [];
    if (scores.length < 3) return 50; // Not enough history

    // Calculate variance in recent scores
    const recentScores = scores.slice(-10).map(s => s.score);
    const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / recentScores.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = higher consistency
    return Math.max(0, 100 - stdDev * 2);
  }

  getScoreHistory(tenant_id: string): ScoreHistory {
    const scores = this.scores.get(tenant_id) || [];

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (scores.length >= 2) {
      const recent = scores.slice(-5);
      const oldScore = recent[0].score;
      const newScore = recent[recent.length - 1].score;

      if (newScore > oldScore + 5) trend = 'improving';
      else if (newScore < oldScore - 5) trend = 'declining';
    }

    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;

    return {
      scores,
      trend,
      average_score: Math.round(avgScore),
    };
  }

  getLatestScore(tenant_id: string): ReliabilityScore | undefined {
    const scores = this.scores.get(tenant_id) || [];
    return scores.length > 0 ? scores[scores.length - 1] : undefined;
  }

  getRiskProfile(tenant_id: string): { risk_level: string; confidence: number } {
    const latestScore = this.getLatestScore(tenant_id);
    if (!latestScore) return { risk_level: 'unknown', confidence: 0 };

    if (latestScore.score >= 80) return { risk_level: 'low', confidence: 95 };
    if (latestScore.score >= 60) return { risk_level: 'moderate', confidence: 85 };
    if (latestScore.score >= 40) return { risk_level: 'high', confidence: 80 };
    return { risk_level: 'critical', confidence: 90 };
  }
}
