/**
 * PAYMENT FRAUD MONITOR
 *
 * Detects and monitors fraudulent transaction patterns:
 * - Anomaly detection
 * - Pattern analysis
 * - Risk scoring
 * - Alert generation
 */

import { FraudIndicator, Transaction } from './paymentContracts';

export interface FraudPattern {
  pattern_id: string;
  pattern_type: 'velocity' | 'amount_spike' | 'unusual_provider' | 'geographic' | 'behavioral';
  description: string;
  confidence: number;
}

export class PaymentFraudMonitor {
  private fraudIndicators: Map<string, FraudIndicator[]> = new Map();
  private transactionHistory: Map<string, Transaction[]> = new Map();
  private patterns: FraudPattern[] = [];

  async analyzeTransaction(transaction: Transaction): Promise<FraudIndicator | null> {
    const risks: { reason: string; severity: number }[] = [];

    // Check velocity
    const recentTransactions = this.getRecentTransactions(
      transaction.tenant_id,
      300000
    ); // 5 min window
    if (recentTransactions.length > 10) {
      risks.push({ reason: 'High transaction velocity', severity: 8 });
    }

    // Check amount spike
    const avgAmount = this.getAverageTransactionAmount(transaction.tenant_id);
    if (transaction.amount > avgAmount * 5) {
      risks.push({ reason: 'Transaction amount significantly above average', severity: 7 });
    }

    // Check unusual provider
    if (!this.isCommonProvider(transaction.tenant_id, transaction.provider)) {
      risks.push({ reason: 'Unusual payment provider', severity: 5 });
    }

    // Check geographic anomalies (simplified)
    if (this.isGeographicOutlier(transaction)) {
      risks.push({ reason: 'Geographic anomaly detected', severity: 6 });
    }

    // Calculate overall risk
    const overallRisk = risks.reduce((sum, r) => sum + r.severity, 0) / Math.max(1, risks.length);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overallRisk > 7) riskLevel = 'critical';
    else if (overallRisk > 5) riskLevel = 'high';
    else if (overallRisk > 3) riskLevel = 'medium';

    if (overallRisk > 3) {
      const indicator: FraudIndicator = {
        indicator_id: `FRAUD-${Date.now()}`,
        transaction_id: transaction.transaction_id,
        risk_level: riskLevel,
        reasons: risks.map(r => r.reason),
        detected_at: new Date().toISOString(),
      };

      // Store indicator
      const indicators = this.fraudIndicators.get(transaction.tenant_id) || [];
      indicators.push(indicator);
      this.fraudIndicators.set(transaction.tenant_id, indicators);

      // Recommend action
      if (riskLevel === 'critical') {
        indicator.action_taken = 'transaction_blocked_pending_verification';
      } else if (riskLevel === 'high') {
        indicator.action_taken = 'transaction_flagged_for_review';
      }

      return indicator;
    }

    // Record successful transaction
    const history = this.transactionHistory.get(transaction.tenant_id) || [];
    history.push(transaction);
    this.transactionHistory.set(transaction.tenant_id, history);

    return null;
  }

  private getRecentTransactions(tenant_id: string, windowMs: number): Transaction[] {
    const history = this.transactionHistory.get(tenant_id) || [];
    const now = Date.now();

    return history.filter(t => {
      const txTime = new Date(t.initiated_at).getTime();
      return now - txTime <= windowMs;
    });
  }

  private getAverageTransactionAmount(tenant_id: string): number {
    const history = this.transactionHistory.get(tenant_id) || [];
    if (history.length === 0) return 1000;

    const total = history.reduce((sum, t) => sum + t.amount, 0);
    return total / history.length;
  }

  private isCommonProvider(tenant_id: string, provider: string): boolean {
    const history = this.transactionHistory.get(tenant_id) || [];
    if (history.length < 5) return true; // Not enough history

    const providerCounts: Record<string, number> = {};
    for (const tx of history) {
      providerCounts[tx.provider] = (providerCounts[tx.provider] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(providerCounts));
    const commonThreshold = maxCount * 0.3;

    return (providerCounts[provider] || 0) > commonThreshold;
  }

  private isGeographicOutlier(transaction: Transaction): boolean {
    // Simplified: check if metadata indicates unusual location
    const metadata = transaction.metadata || {};
    const location = metadata.location_country;

    if (!location) return false;

    // Would normally check against historical locations
    return Math.random() > 0.95; // Simulate 5% geographic anomalies
  }

  getFraudIndicators(tenant_id: string): FraudIndicator[] {
    return this.fraudIndicators.get(tenant_id) || [];
  }

  registerPattern(pattern: FraudPattern): void {
    this.patterns.push(pattern);
  }

  getCommonPatterns(): FraudPattern[] {
    return this.patterns;
  }
}
