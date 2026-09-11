/**
 * TRANSACTION PATTERN INTELLIGENCE
 *
 * Detects and analyzes transaction patterns:
 * - Pattern detection
 * - Anomaly identification
 * - Behavior profiling
 * - Predictive analytics
 */

import { TransactionPattern } from './paymentContracts';

export interface BehaviorProfile {
  profile_id: string;
  tenant_id: string;
  avg_transaction_size: number;
  transaction_frequency: number; // per day
  peak_hours: number[]; // 0-23
  preferred_providers: string[];
  typical_duration_days: number;
}

export class TransactionPatternIntelligence {
  private patterns: Map<string, TransactionPattern[]> = new Map();
  private profiles: Map<string, BehaviorProfile> = new Map();
  private anomalies: Map<string, Array<{ transaction_id: string; anomaly_score: number; reason: string }>> =
    new Map();

  async detectPattern(
    tenant_id: string,
    patternType: string,
    description: string,
    frequency: number
  ): Promise<TransactionPattern> {
    const pattern: TransactionPattern = {
      pattern_id: `PATTERN-${Date.now()}`,
      tenant_id,
      pattern_type: patternType as any,
      description,
      frequency,
      confidence: Math.min(100, 50 + frequency * 5),
      detected_at: new Date().toISOString(),
    };

    const patterns = this.patterns.get(tenant_id) || [];
    patterns.push(pattern);
    this.patterns.set(tenant_id, patterns);

    return pattern;
  }

  async buildBehaviorProfile(
    tenant_id: string,
    transactions: Array<{ amount: number; timestamp: string; provider: string }>
  ): Promise<BehaviorProfile> {
    if (transactions.length === 0) {
      throw new Error('No transactions to analyze');
    }

    // Calculate average transaction size
    const avgSize = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;

    // Calculate frequency
    const dates = new Set(transactions.map(t => new Date(t.timestamp).toDateString()));
    const frequency = transactions.length / dates.size;

    // Find peak hours
    const hourCounts: Record<number, number> = {};
    for (const tx of transactions) {
      const hour = new Date(tx.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Preferred providers
    const providerCounts: Record<string, number> = {};
    for (const tx of transactions) {
      providerCounts[tx.provider] = (providerCounts[tx.provider] || 0) + 1;
    }

    const preferredProviders = Object.entries(providerCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([provider]) => provider);

    const profile: BehaviorProfile = {
      profile_id: `PROFILE-${Date.now()}`,
      tenant_id,
      avg_transaction_size: avgSize,
      transaction_frequency: frequency,
      peak_hours: peakHours,
      preferred_providers: preferredProviders,
      typical_duration_days: Math.ceil(transactions.length / frequency),
    };

    this.profiles.set(tenant_id, profile);
    return profile;
  }

  async detectAnomalies(
    tenant_id: string,
    profile: BehaviorProfile,
    recentTransactions: Array<{ transaction_id: string; amount: number; timestamp: string; provider: string }>
  ): Promise<void> {
    for (const tx of recentTransactions) {
      let anomalyScore = 0;
      const reasons: string[] = [];

      // Check amount
      if (tx.amount > profile.avg_transaction_size * 3) {
        anomalyScore += 30;
        reasons.push('Amount significantly higher than average');
      }

      // Check time
      const hour = new Date(tx.timestamp).getHours();
      if (!profile.peak_hours.includes(hour)) {
        anomalyScore += 20;
        reasons.push('Transaction outside peak hours');
      }

      // Check provider
      if (!profile.preferred_providers.includes(tx.provider)) {
        anomalyScore += 10;
        reasons.push('Unusual payment provider');
      }

      if (anomalyScore > 30) {
        const anomalies = this.anomalies.get(tenant_id) || [];
        anomalies.push({
          transaction_id: tx.transaction_id,
          anomaly_score: anomalyScore,
          reason: reasons.join('; '),
        });
        this.anomalies.set(tenant_id, anomalies);
      }
    }
  }

  getPatterns(tenant_id: string): TransactionPattern[] {
    return this.patterns.get(tenant_id) || [];
  }

  getBehaviorProfile(tenant_id: string): BehaviorProfile | undefined {
    return this.profiles.get(tenant_id);
  }

  getAnomalies(tenant_id: string): Array<{ transaction_id: string; anomaly_score: number; reason: string }> {
    return this.anomalies.get(tenant_id) || [];
  }
}
