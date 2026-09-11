import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { OperationalAnalyticsEngine } from './operationalAnalyticsEngine';

/**
 * BUSINESS INSIGHT GENERATOR
 * 
 * Synthesizes operational data into actionable business recommendations.
 */
export class BusinessInsightGenerator {
  static async generateInsights(context: TenantContext): Promise<string> {
    const summary = await OperationalAnalyticsEngine.getOperationalSummary(context);
    
    const prompt = `
      Based on the following operational summary:
      ${JSON.stringify(summary)}
      
      Generate 3 strategic recommendations for the business owner to improve revenue and operational scale.
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'intelligence',
      topic_id: 'insights',
      learning_goal: 'Generate business insights',
      prompt_params: { prompt }
    } as any);

    return (result.result as any)?.text || (result.result as string) || '';
  }
}
