import { Database } from '../../infrastructure/database';
import { Telemetry } from '../../observability/telemetry';

/**
 * PRODUCT USAGE ANALYTICS
 * 
 * Aggregates and analyzes cross-product usage data to provide market insights.
 */
export class ProductUsageAnalytics {
  static async getActiveUsers(tenantId: string, days: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    
    const query = Database.governedQuery({
      table: 'user_events',
      columns: 'user_id',
      portalType: 'high_school'
    });

    const { data } = await (query as any)
      .eq('tenant_id', tenantId)
      .gt('created_at', cutoff);

    const uniqueUsers = new Set(data?.map((e: any) => e.user_id) || []);
    return uniqueUsers.size;
  }

  static async logMarketSignal(tenantId: string, signalType: string, strength: number): Promise<void> {
    Telemetry.emit({
      event: 'MARKET_SIGNAL_LOGGED',
      source: 'platform',
      operationType: 'market_analytics',
      payload: { tenant_id: tenantId, signal_type: signalType, strength }
    });
  }
}
