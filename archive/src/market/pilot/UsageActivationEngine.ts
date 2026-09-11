import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * USAGE ACTIVATION ENGINE
 * 
 * Tracks user progress through activation milestones and calculates activation scores.
 */
export class UsageActivationEngine {
  static async recordMilestone(context: TenantContext, userId: string, milestone: string): Promise<void> {
    const query = Database.governedQuery({
      table: 'user_activation_states',
      columns: '*',
      portalType: context.portal_type
    });

    const { data } = await (query as any).eq('user_id', userId).maybeSingle();
    if (!data) return;

    const milestones = new Set(data.milestones_completed);
    milestones.add(milestone);

    // Score calculation: 20 points per milestone, cap at 100
    const newScore = Math.min(milestones.size * 20, 100);

    await Database.governedWrite('user_activation_states', {
      user_id: userId,
      milestones_completed: Array.from(milestones),
      activation_score: newScore,
      last_activity: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { user_id: true },
      portalType: context.portal_type
    });
  }
}
