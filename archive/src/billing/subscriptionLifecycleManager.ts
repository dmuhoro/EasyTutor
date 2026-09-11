import { Database } from '../infrastructure/database';

/**
 * SUBSCRIPTION LIFECYCLE MANAGER
 * 
 * Manages tenant subscription tiers, limits, and lifecycle states (Active, Suspended, etc.).
 */
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export class SubscriptionLifecycleManager {
  static async updateTier(tenantId: string, tier: SubscriptionTier): Promise<void> {
    await Database.governedWrite('tenant_subscriptions', { tenant_id: tenantId, tier, status: 'active', updated_at: new Date().toISOString() }, {
      action: 'upsert',
      matchFields: { tenant_id: true },
      portalType: 'high_school'
    });
  }

  static async getTierLimits(tier: SubscriptionTier): Promise<any> {
    const limits: Record<SubscriptionTier, any> = {
      'free': { max_executions_monthly: 1000, max_storage_gb: 1 },
      'starter': { max_executions_monthly: 10000, max_storage_gb: 10 },
      'professional': { max_executions_monthly: 100000, max_storage_gb: 100 },
      'enterprise': { max_executions_monthly: Infinity, max_storage_gb: Infinity }
    };

    return limits[tier];
  }
}
