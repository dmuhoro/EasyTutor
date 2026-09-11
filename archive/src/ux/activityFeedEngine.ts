import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * ACTIVITY FEED ENGINE
 * 
 * Aggregates and delivers real-time activity updates to users across products.
 */
export class ActivityFeedEngine {
  static async pushActivity(context: TenantContext, message: string, type: 'info' | 'alert' | 'success'): Promise<void> {
    await Database.governedWrite('user_activity_feed', {
      id: `act_${Date.now()}`,
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      message,
      type,
      timestamp: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async getRecentActivity(context: TenantContext, limit: number = 20): Promise<any[]> {
    const query = Database.governedQuery({
      table: 'user_activity_feed',
      columns: '*',
      portalType: context.portal_type
    });

    const { data } = await (query as any).eq('user_id', context.user_id).order('timestamp', { ascending: false }).limit(limit);
    return data || [];
  }
}
