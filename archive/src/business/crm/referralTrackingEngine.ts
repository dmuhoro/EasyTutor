import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';

/**
 * REFERRAL TRACKING ENGINE
 * 
 * Tracks client referrals and manages business referral intelligence.
 */
export class ReferralTrackingEngine {
  static async recordReferral(
    context: TenantContext, 
    referrerId: string, 
    referredEmail: string
  ): Promise<void> {
    const referral = {
      tenant_id: context.tenant_id,
      referrer_id: referrerId,
      referred_email: referredEmail,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    await Database.governedWrite('business_referrals', referral, {
      portalType: context.portal_type,
      userId: context.user_id
    });
  }

  static async getReferralAnalytics(context: TenantContext): Promise<any> {
    const query = Database.governedQuery({
      table: 'business_referrals',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any);
    if (error || !data) return { total_referrals: 0 };

    return {
      total_referrals: data.length,
      converted_referrals: data.filter((r: any) => r.status === 'converted').length,
      pending_referrals: data.filter((r: any) => r.status === 'pending').length
    };
  }
}
