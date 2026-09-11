import { RuntimeAnalyticsEngine } from '../observability/ops/runtimeAnalyticsEngine';
import { UsagePricingEngine } from './usagePricingEngine';

/**
 * EXECUTION COST PREDICTOR
 * 
 * Forecasts future billing based on historical consumption patterns.
 */
export class ExecutionCostPredictor {
  static async predictMonthlyCost(tenantId: string): Promise<any> {
    const analytics = await RuntimeAnalyticsEngine.getTenantAnalytics(tenantId);
    const avgDailyCalls = analytics.total_executions / 30; // Simple average
    
    const avgCallCost = UsagePricingEngine.getCostForOperation('generic');
    const predictedMonthly = avgDailyCalls * 30 * avgCallCost;

    return {
      tenant_id: tenantId,
      avg_daily_executions: avgDailyCalls,
      predicted_monthly_cost: predictedMonthly,
      confidence_interval: 0.85
    };
  }
}
