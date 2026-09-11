import { Database } from '../../infrastructure/database';

/**
 * FEATURE ADOPTION ANALYZER
 * 
 * Analyzes which platform features are being adopted and which are underutilized.
 */
export class FeatureAdoptionAnalyzer {
  static async getAdoptionRate(featureId: string): Promise<number> {
    const query = Database.governedQuery({
      table: 'user_events',
      columns: 'tenant_id',
      portalType: 'high_school'
    });

    const { data } = await (query as any).ilike('payload->>feature', `%${featureId}%`);
    const adoptingTenants = new Set(data?.map((e: any) => e.tenant_id) || []);
    
    // In a real system, we'd divide by the total number of tenants who have this feature enabled
    return adoptingTenants.size;
  }
}
