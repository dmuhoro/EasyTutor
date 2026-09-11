/**
 * REVENUE FLOW ANALYZER
 *
 * Analyzes revenue flows and patterns:
 * - Revenue tracking by source
 * - Growth metrics
 * - Trend analysis
 * - Forecasting
 */

import { RevenueFlow } from './paymentContracts';

export interface RevenueSource {
  source_id: string;
  source_name: string;
  revenue_this_period: number;
  revenue_previous_period: number;
  growth_rate: number;
}

export class RevenueFlowAnalyzer {
  private revenueFlows: Map<string, RevenueFlow[]> = new Map();
  private sources: Map<string, RevenueSource[]> = new Map();

  async analyzeRevenue(
    tenant_id: string,
    totalRevenue: number,
    revenueBySources: Record<string, number>
  ): Promise<RevenueFlow> {
    // Get previous period for comparison
    const previousFlows = this.revenueFlows.get(tenant_id) || [];
    const previousTotal = previousFlows.length > 0 ? previousFlows[previousFlows.length - 1].total_revenue : 0;

    const growthRate = previousTotal > 0 ? ((totalRevenue - previousTotal) / previousTotal) * 100 : 0;

    const trend: 'increasing' | 'stable' | 'decreasing' =
      growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

    const flow: RevenueFlow = {
      flow_id: `FLOW-${Date.now()}`,
      tenant_id,
      period_date: new Date().toISOString(),
      total_revenue: totalRevenue,
      by_source: revenueBySources,
      growth_rate: growthRate,
      trend,
    };

    const flows = this.revenueFlows.get(tenant_id) || [];
    flows.push(flow);
    this.revenueFlows.set(tenant_id, flows);

    // Analyze sources
    this.analyzeSources(tenant_id, revenueBySources, previousFlows);

    return flow;
  }

  private analyzeSources(
    tenant_id: string,
    currentSources: Record<string, number>,
    previousFlows: RevenueFlow[]
  ): void {
    const previousSources = previousFlows.length > 0 ? previousFlows[previousFlows.length - 1].by_source : {};

    const sources: RevenueSource[] = [];

    for (const [sourceName, currentRevenue] of Object.entries(currentSources)) {
      const previousRevenue = previousSources[sourceName] || 0;
      const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 100;

      sources.push({
        source_id: `SOURCE-${sourceName}`,
        source_name: sourceName,
        revenue_this_period: currentRevenue,
        revenue_previous_period: previousRevenue,
        growth_rate: growthRate,
      });
    }

    this.sources.set(tenant_id, sources);
  }

  getRevenueHistory(tenant_id: string, limit: number = 12): RevenueFlow[] {
    const flows = this.revenueFlows.get(tenant_id) || [];
    return flows.slice(-limit);
  }

  getTopSources(tenant_id: string, limit: number = 5): RevenueSource[] {
    const sources = this.sources.get(tenant_id) || [];
    return sources.sort((a, b) => b.revenue_this_period - a.revenue_this_period).slice(0, limit);
  }

  getGrowthingSources(tenant_id: string): RevenueSource[] {
    const sources = this.sources.get(tenant_id) || [];
    return sources.filter(s => s.growth_rate > 10).sort((a, b) => b.growth_rate - a.growth_rate);
  }

  getLatestFlow(tenant_id: string): RevenueFlow | undefined {
    const flows = this.revenueFlows.get(tenant_id) || [];
    return flows.length > 0 ? flows[flows.length - 1] : undefined;
  }
}
