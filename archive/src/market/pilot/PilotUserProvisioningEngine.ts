import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * PILOT USER PROVISIONING ENGINE
 * 
 * Automates the creation and initial configuration of pilot user accounts within an organization.
 */
export class PilotUserProvisioningEngine {
  static async provisionUser(context: TenantContext, email: string, name: string): Promise<string> {
    const userId = `pilot_u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // 1. Create Profile
    await Database.governedWrite('profiles', {
      id: userId,
      email,
      full_name: name,
      metadata: { pilot_user: true, provisioned_at: new Date().toISOString() }
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });

    // 2. Initialize Activation State
    await Database.governedWrite('user_activation_states', {
      user_id: userId,
      tenant_id: context.tenant_id,
      milestones_completed: ['provisioned'],
      activation_score: 0,
      last_activity: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { user_id: true },
      portalType: context.portal_type
    });

    return userId;
  }
}
