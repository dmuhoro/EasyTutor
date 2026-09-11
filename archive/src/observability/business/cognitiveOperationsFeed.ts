import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';

/**
 * COGNITIVE OPERATIONS FEED
 * 
 * Provides a real-time, chronological feed of all cognitive and business events within a tenant.
 */
export class CognitiveOperationsFeed {
  static async getLatestEvents(context: TenantContext, limit = 50): Promise<any[]> {
    const query = Database.governedQuery({
      table: 'user_events',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    // Filter by business-related event types
    const { data } = await (query as any)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    return data || [];
  }
}
