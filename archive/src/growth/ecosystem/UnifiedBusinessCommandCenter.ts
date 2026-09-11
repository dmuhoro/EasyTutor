import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { CustomerActivationJourneyEngine } from '../adoption/CustomerActivationJourneyEngine';
import { ExecutiveBusinessInsightsEngine } from '../intelligence/ExecutiveBusinessInsightsEngine';

/**
 * UNIFIED BUSINESS COMMAND CENTER
 * 
 * Central hub for tenant operators, aggregating analytics, marketing campaigns,
 * and activation metrics into a single, cohesive interface.
 */
export class UnifiedBusinessCommandCenter {
  static async loadDashboard(context: TenantContext): Promise<any> {
    console.log(`[ECOSYSTEM] Loading command center for ${context.tenant_id}...`);
    
    const journey = await CustomerActivationJourneyEngine.evaluateJourney(context.tenant_id);
    const insights = await ExecutiveBusinessInsightsEngine.generateMonthlyReport(
      context.tenant_id, 
      new Date().toISOString().slice(0, 7) // YYYY-MM
    );

    return {
      tenant_id: context.tenant_id,
      status: 'active',
      activation_score: journey.activation_score,
      revenue_forecast: insights.revenue_forecast_usd,
      action_items: insights.key_recommendations
    };
  }
}
