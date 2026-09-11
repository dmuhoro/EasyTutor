import { Database } from '../infrastructure/database';
import { UsagePricingEngine } from './usagePricingEngine';

/**
 * TENANT BILLING ENGINE
 * 
 * Orchestrates the calculation and persistence of tenant billing data based on actual resource consumption.
 */
export class TenantBillingEngine {
  static async generateBillingStatement(tenantId: string): Promise<any> {
    const query = Database.governedQuery({
      table: 'user_events',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('tenant_id', tenantId);
    const executions = data || [];

    const totalCost = executions.reduce((acc: number, event: any) => {
      const operation = event.operation_type || 'generic';
      return acc + UsagePricingEngine.getCostForOperation(operation);
    }, 0);

    const statement = {
      tenant_id: tenantId,
      billing_period: new Date().toISOString().slice(0, 7), // YYYY-MM
      execution_count: executions.length,
      total_amount_usd: totalCost,
      currency: 'USD',
      status: 'pending'
    };

    await Database.governedWrite('billing_statements', statement, {
      action: 'upsert',
      matchFields: { tenant_id: true, billing_period: true },
      portalType: 'high_school'
    });

    return statement;
  }
}
