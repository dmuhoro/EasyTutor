/**
 * BUSINESS GROWTH CORRELATION ENGINE
 *
 * Identifies correlations between metrics and growth:
 * - Metric correlation analysis
 * - Growth driver identification
 * - Predictive modeling
 * - Opportunity detection
 */

import { BusinessGrowthSignal } from './paymentContracts';

export interface CorrelationAnalysis {
  analysis_id: string;
  metric_a: string;
  metric_b: string;
  correlation_coefficient: number; // -1 to 1
  significance: 'strong' | 'moderate' | 'weak';
  causation_likely: boolean;
}

export interface GrowthDriver {
  driver_id: string;
  metric: string;
  impact_on_growth: number; // 0-100
  confidence: number; // 0-100
  recommendation: string;
}

export class BusinessGrowthCorrelationEngine {
  private signals: Map<string, BusinessGrowthSignal[]> = new Map();
  private correlations: Map<string, CorrelationAnalysis[]> = new Map();

  async recordSignal(
    tenant_id: string,
    metric: string,
    value: number,
    threshold: number
  ): Promise<BusinessGrowthSignal> {
    const signal: BusinessGrowthSignal = {
      signal_id: `SIGNAL-${Date.now()}`,
      tenant_id,
      metric,
      value,
      threshold,
      exceeds_threshold: value > threshold,
      timestamp: new Date().toISOString(),
    };

    const signals = this.signals.get(tenant_id) || [];
    signals.push(signal);
    this.signals.set(tenant_id, signals);

    return signal;
  }

  async identifyGrowthDrivers(tenant_id: string): Promise<GrowthDriver[]> {
    const signals = this.signals.get(tenant_id) || [];
    if (signals.length < 10) return [];

    const drivers: GrowthDriver[] = [];

    // Analyze which metrics correlate with growth
    const growthThresholdExceeded = signals.filter(s => s.exceeds_threshold).length / signals.length > 0.5;

    if (growthThresholdExceeded) {
      const commonExceedingMetrics: Record<string, number> = {};

      for (const signal of signals.filter(s => s.exceeds_threshold)) {
        commonExceedingMetrics[signal.metric] = (commonExceedingMetrics[signal.metric] || 0) + 1;
      }

      for (const [metric, count] of Object.entries(commonExceedingMetrics)) {
        const impactScore = (count / signals.length) * 100;

        drivers.push({
          driver_id: `DRIVER-${metric}`,
          metric,
          impact_on_growth: impactScore,
          confidence: Math.min(100, 60 + impactScore / 2),
          recommendation: `Focus on optimizing ${metric} to drive growth`,
        });
      }
    }

    return drivers.sort((a, b) => b.impact_on_growth - a.impact_on_growth);
  }

  async analyzeCorrelation(
    tenant_id: string,
    metricA: string,
    metricB: string
  ): Promise<CorrelationAnalysis> {
    const signals = this.signals.get(tenant_id) || [];

    const valuesA = signals.filter(s => s.metric === metricA).map(s => s.value);
    const valuesB = signals.filter(s => s.metric === metricB).map(s => s.value);

    if (valuesA.length === 0 || valuesB.length === 0) {
      return {
        analysis_id: `CORR-${Date.now()}`,
        metric_a: metricA,
        metric_b: metricB,
        correlation_coefficient: 0,
        significance: 'weak',
        causation_likely: false,
      };
    }

    // Simplified Pearson correlation
    const coefficient = this.calculatePearsonCorrelation(valuesA, valuesB);

    let significance: 'strong' | 'moderate' | 'weak' = 'weak';
    if (Math.abs(coefficient) > 0.7) significance = 'strong';
    else if (Math.abs(coefficient) > 0.4) significance = 'moderate';

    const analysis: CorrelationAnalysis = {
      analysis_id: `CORR-${Date.now()}`,
      metric_a: metricA,
      metric_b: metricB,
      correlation_coefficient: coefficient,
      significance,
      causation_likely: Math.abs(coefficient) > 0.6,
    };

    const correlations = this.correlations.get(tenant_id) || [];
    correlations.push(analysis);
    this.correlations.set(tenant_id, correlations);

    return analysis;
  }

  private calculatePearsonCorrelation(a: number[], b: number[]): number {
    const minLength = Math.min(a.length, b.length);
    if (minLength < 2) return 0;

    const meanA = a.slice(0, minLength).reduce((s, v) => s + v, 0) / minLength;
    const meanB = b.slice(0, minLength).reduce((s, v) => s + v, 0) / minLength;

    let numerator = 0;
    let sumSqA = 0;
    let sumSqB = 0;

    for (let i = 0; i < minLength; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      numerator += diffA * diffB;
      sumSqA += diffA * diffA;
      sumSqB += diffB * diffB;
    }

    const denominator = Math.sqrt(sumSqA * sumSqB);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  getSignals(tenant_id: string): BusinessGrowthSignal[] {
    return this.signals.get(tenant_id) || [];
  }

  getCorrelationHistory(tenant_id: string): CorrelationAnalysis[] {
    return this.correlations.get(tenant_id) || [];
  }
}
