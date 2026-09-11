import { Database } from '../../infrastructure/database';

/**
 * RETENTION TRACKING ENGINE
 * 
 * Measures user retention and cohort performance across pilot deployments.
 */
export class RetentionTrackingEngine {
  static async calculateRetention(tenantId: string, cohortMonth: string): Promise<number> {
    const query = Database.governedQuery({
      table: 'user_activation_states',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('tenant_id', tenantId);
    if (!data) return 0;

    const activeUsers = data.filter((u: any) => {
      const lastSeen = new Date(u.last_activity).getTime();
      return (Date.now() - lastSeen) < 7 * 86400000; // Active in last 7 days
    });

    return activeUsers.length / data.length;
  }
}
