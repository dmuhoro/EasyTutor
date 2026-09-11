import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * SALES PIPELINE ENGINE
 * 
 * Orchestrates the institutional sales process across all vertical products.
 */
export class SalesPipelineEngine {
  static async addOpportunity(context: TenantContext, name: string, value: number): Promise<void> {
    await Database.governedWrite('sales_opportunities', {
      id: `opp_${Date.now()}`,
      tenant_id: context.tenant_id,
      name,
      value,
      stage: 'lead',
      created_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async advanceStage(context: TenantContext, opportunityId: string, stage: string): Promise<void> {
    await Database.governedWrite('sales_opportunities', {
      id: opportunityId,
      stage,
      updated_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
