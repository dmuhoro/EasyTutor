/**
 * ECONOMIC INSIGHT GENERATOR
 *
 * Generates economic insights from transaction data:
 * - Risk detection
 * - Opportunity identification
 * - Trend analysis
 * - Actionable recommendations
 */

import { EconomicInsight } from './paymentContracts';

export interface InsightCluster {
  cluster_id: string;
  insights: EconomicInsight[];
  theme: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class EconomicInsightGenerator {
  private insights: Map<string, EconomicInsight[]> = new Map();

  async generateInsights(
    tenant_id: string,
    metrics: {
      revenue: number;
      expenses: number;
      transaction_count: number;
      fraud_indicators: number;
      settlement_delays: number;
      customer_churn_rate: number;
    }
  ): Promise<EconomicInsight[]> {
    const insights: EconomicInsight[] = [];

    // Revenue opportunity
    if (metrics.revenue < 50000 && metrics.transaction_count > 100) {
      insights.push({
        insight_id: `INSIGHT-${Date.now()}-1`,
        tenant_id,
        insight_type: 'opportunity',
        description:
          'Low revenue relative to transaction volume suggests potential for price optimization or upselling',
        impact_score: 70,
        recommended_action: 'Review pricing strategy and customer tier positioning',
        timestamp: new Date().toISOString(),
      });
    }

    // Risk detection
    if (metrics.fraud_indicators > 5) {
      insights.push({
        insight_id: `INSIGHT-${Date.now()}-2`,
        tenant_id,
        insight_type: 'risk',
        description: `Multiple fraud indicators detected (${metrics.fraud_indicators}). Review transaction patterns.`,
        impact_score: 85,
        recommended_action: 'Conduct fraud audit and update risk controls',
        timestamp: new Date().toISOString(),
      });
    }

    // Settlement trend
    if (metrics.settlement_delays > 10) {
      insights.push({
        insight_id: `INSIGHT-${Date.now()}-3`,
        tenant_id,
        insight_type: 'trend',
        description: 'Increasing settlement delays detected. This may indicate provider issues or volume constraints.',
        impact_score: 65,
        recommended_action: 'Diversify payment providers or investigate delays',
        timestamp: new Date().toISOString(),
      });
    }

    // Customer retention
    if (metrics.customer_churn_rate > 0.1) {
      insights.push({
        insight_id: `INSIGHT-${Date.now()}-4`,
        tenant_id,
        insight_type: 'anomaly',
        description: `High customer churn detected (${(metrics.customer_churn_rate * 100).toFixed(1)}%). Monitor retention.`,
        impact_score: 80,
        recommended_action: 'Implement retention program or improve customer experience',
        timestamp: new Date().toISOString(),
      });
    }

    // Expense efficiency
    const expenseRatio = metrics.expenses / Math.max(1, metrics.revenue);
    if (expenseRatio > 0.8) {
      insights.push({
        insight_id: `INSIGHT-${Date.now()}-5`,
        tenant_id,
        insight_type: 'risk',
        description: `Expenses are ${(expenseRatio * 100).toFixed(1)}% of revenue. Profitability at risk.`,
        impact_score: 90,
        recommended_action: 'Urgently review expense management and cost structure',
        timestamp: new Date().toISOString(),
      });
    }

    // Store insights
    const tenantInsights = this.insights.get(tenant_id) || [];
    tenantInsights.push(...insights);
    this.insights.set(tenant_id, tenantInsights);

    return insights;
  }

  async clusterInsights(tenant_id: string): Promise<InsightCluster[]> {
    const tenantInsights = this.insights.get(tenant_id) || [];

    const clusters: Map<string, EconomicInsight[]> = new Map();

    for (const insight of tenantInsights) {
      let theme = 'general';

      if (insight.insight_type === 'risk') {
        theme = 'risk_management';
      } else if (insight.insight_type === 'opportunity') {
        theme = 'growth_opportunity';
      } else if (insight.insight_type === 'trend') {
        theme = 'market_trend';
      } else if (insight.insight_type === 'anomaly') {
        theme = 'anomaly_detection';
      }

      if (!clusters.has(theme)) {
        clusters.set(theme, []);
      }

      clusters.get(theme)!.push(insight);
    }

    const result: InsightCluster[] = [];

    for (const [theme, insights] of clusters.entries()) {
      const maxImpact = Math.max(...insights.map(i => i.impact_score));
      const urgency: 'low' | 'medium' | 'high' | 'critical' =
        maxImpact > 80 ? 'critical' : maxImpact > 70 ? 'high' : maxImpact > 50 ? 'medium' : 'low';

      result.push({
        cluster_id: `CLUSTER-${Date.now()}`,
        insights,
        theme,
        urgency,
      });
    }

    return result.sort((a, b) => {
      const urgencyMap = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyMap[b.urgency] - urgencyMap[a.urgency];
    });
  }

  getInsights(tenant_id: string, limit: number = 50): EconomicInsight[] {
    const insights = this.insights.get(tenant_id) || [];
    return insights.slice(-limit);
  }

  getInsightsByType(tenant_id: string, type: 'risk' | 'opportunity' | 'trend' | 'anomaly'): EconomicInsight[] {
    const insights = this.insights.get(tenant_id) || [];
    return insights.filter(i => i.insight_type === type);
  }

  getSummary(tenant_id: string): {
    total_insights: number;
    critical_count: number;
    recent_insights: EconomicInsight[];
  } {
    const insights = this.insights.get(tenant_id) || [];
    const criticalCount = insights.filter(i => i.impact_score > 80).length;

    return {
      total_insights: insights.length,
      critical_count: criticalCount,
      recent_insights: insights.slice(-5),
    };
  }
}
