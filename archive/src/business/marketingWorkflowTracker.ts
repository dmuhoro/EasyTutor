import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * MARKETING WORKFLOW TRACKER
 * 
 * Tracks marketing campaigns and lead attribution across the platform.
 */
export class MarketingWorkflowTracker {
  static async recordCampaign(context: TenantContext, name: string, channel: string): Promise<void> {
    await Database.governedWrite('marketing_campaigns', {
      id: `camp_${Date.now()}`,
      tenant_id: context.tenant_id,
      name,
      channel,
      status: 'active',
      started_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async attributeLead(context: TenantContext, leadId: string, campaignId: string): Promise<void> {
    await Database.governedWrite('business_clients', {
      id: leadId,
      metadata: { acquisition_campaign_id: campaignId }
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
