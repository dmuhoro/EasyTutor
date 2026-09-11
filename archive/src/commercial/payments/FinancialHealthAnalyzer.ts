/**
 * FINANCIAL HEALTH ANALYZER
 *
 * Analyzes and scores financial health:
 * - Health metric calculation
 * - Benchmarking
 * - Risk assessment
 * - Recommendations
 */

import { FinancialHealthMetrics } from './paymentContracts';

export interface HealthScoreComponent {
  metric: string;
  value: number;
  weight: number; // 0-1
  benchmark: number;
}

export interface FinancialRecommendation {
  recommendation_id: string;
  tenant_id: string;
  category: 'revenue' | 'expense' | 'cashflow' | 'profitability';
  priority: 'low' | 'medium' | 'high';
  description: string;
  potential_impact: number; // Estimated % improvement
}

export class FinancialHealthAnalyzer {
  private healthMetrics: Map<string, FinancialHealthMetrics[]> = new Map();
  private recommendations: Map<string, FinancialRecommendation[]> = new Map();

  async analyzeHealth(
    tenant_id: string,
    revenue: number,
    expenses: number,
    cashOnHand: number
  ): Promise<FinancialHealthMetrics> {
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Calculate runway (simplified: assume daily burn)
    const avgDailyBurn = expenses / 30;
    const runwayDays = avgDailyBurn > 0 ? Math.floor(cashOnHand / avgDailyBurn) : 999;

    const components: HealthScoreComponent[] = [
      {
        metric: 'profit_margin',
        value: Math.max(0, Math.min(100, profitMargin + 50)), // Normalize to 0-100
        weight: 0.3,
        benchmark: 20,
      },
      {
        metric: 'runway',
        value: Math.min(100, (runwayDays / 180) * 100),
        weight: 0.3,
        benchmark: 180,
      },
      {
        metric: 'expense_ratio',
        value: Math.max(0, 100 - (expenses / revenue) * 100),
        weight: 0.2,
        benchmark: 70,
      },
      {
        metric: 'cash_position',
        value: Math.min(100, (cashOnHand / (revenue * 3)) * 100),
        weight: 0.2,
        benchmark: 100,
      },
    ];

    const healthScore = components.reduce((sum, c) => sum + c.value * c.weight, 0);

    const metrics: FinancialHealthMetrics = {
      tenant_id,
      period_date: new Date().toISOString(),
      revenue,
      expenses,
      net_profit: netProfit,
      cash_on_hand: cashOnHand,
      runway_days: runwayDays,
      health_score: Math.floor(healthScore),
    };

    // Store metrics
    const history = this.healthMetrics.get(tenant_id) || [];
    history.push(metrics);
    this.healthMetrics.set(tenant_id, history);

    // Generate recommendations
    await this.generateRecommendations(tenant_id, metrics);

    return metrics;
  }

  private async generateRecommendations(
    tenant_id: string,
    metrics: FinancialHealthMetrics
  ): Promise<void> {
    const recs: FinancialRecommendation[] = [];

    // Revenue recommendations
    if (metrics.revenue < 10000) {
      recs.push({
        recommendation_id: `REC-${Date.now()}-1`,
        tenant_id,
        category: 'revenue',
        priority: 'high',
        description: 'Consider expanding your client base to increase revenue',
        potential_impact: 30,
      });
    }

    // Expense recommendations
    if (metrics.expenses > metrics.revenue * 0.8) {
      recs.push({
        recommendation_id: `REC-${Date.now()}-2`,
        tenant_id,
        category: 'expense',
        priority: 'high',
        description: 'Your expenses are very high relative to revenue. Review and optimize.',
        potential_impact: 20,
      });
    }

    // Cashflow recommendations
    if (metrics.runway_days < 90) {
      recs.push({
        recommendation_id: `REC-${Date.now()}-3`,
        tenant_id,
        category: 'cashflow',
        priority: 'high',
        description: 'Critical: Your cash runway is less than 3 months. Take immediate action.',
        potential_impact: 40,
      });
    }

    // Profitability recommendations
    if (metrics.net_profit < 0) {
      recs.push({
        recommendation_id: `REC-${Date.now()}-4`,
        tenant_id,
        category: 'profitability',
        priority: 'high',
        description: 'You are currently operating at a loss. Consider cutting costs or increasing prices.',
        potential_impact: 35,
      });
    }

    const existing = this.recommendations.get(tenant_id) || [];
    this.recommendations.set(tenant_id, [...existing, ...recs]);
  }

  getHealthHistory(tenant_id: string, limit: number = 12): FinancialHealthMetrics[] {
    const history = this.healthMetrics.get(tenant_id) || [];
    return history.slice(-limit);
  }

  getRecommendations(tenant_id: string): FinancialRecommendation[] {
    return this.recommendations.get(tenant_id) || [];
  }

  compareWithBenchmark(tenant_id: string): Record<string, { actual: number; benchmark: number; status: string }> {
    const latest = this.healthMetrics.get(tenant_id)?.slice(-1)[0];
    if (!latest) return {};

    const profitMargin = latest.revenue > 0 ? (latest.net_profit / latest.revenue) * 100 : 0;

    return {
      profit_margin: {
        actual: profitMargin,
        benchmark: 15,
        status: profitMargin >= 15 ? 'healthy' : profitMargin >= 5 ? 'acceptable' : 'at_risk',
      },
      expense_ratio: {
        actual: (latest.expenses / latest.revenue) * 100,
        benchmark: 70,
        status: latest.expenses <= latest.revenue * 0.7 ? 'healthy' : 'at_risk',
      },
      runway_days: {
        actual: latest.runway_days,
        benchmark: 180,
        status: latest.runway_days >= 180 ? 'healthy' : latest.runway_days >= 90 ? 'acceptable' : 'critical',
      },
    };
  }
}
