import { PilotOrganization, PilotStatus } from '../marketContracts';
import { Database } from '../../infrastructure/database';

/**
 * PILOT ORGANIZATION MANAGER
 * 
 * Manages the lifecycle and status of pilot institutions on the platform.
 */
export class PilotOrganizationManager {
  static async registerPilot(org: Omit<PilotOrganization, 'pilot_status' | 'start_date'>): Promise<void> {
    const pilot: PilotOrganization = {
      org_id: org.org_id,
      name: org.name,
      target_user_count: org.target_user_count,
      assigned_account_manager: org.assigned_account_manager,
      pilot_status: 'onboarding',
      start_date: new Date().toISOString()
    };

    await Database.governedWrite('pilot_organizations', pilot, {
      action: 'upsert',
      matchFields: { org_id: true },
      portalType: 'high_school' // Platform-level governance
    });
  }

  static async updateStatus(orgId: string, status: PilotStatus): Promise<void> {
    await Database.governedWrite('pilot_organizations', { org_id: orgId, pilot_status: status }, {
      action: 'upsert',
      matchFields: { org_id: true },
      portalType: 'high_school'
    });
  }

  static async getPilot(orgId: string): Promise<PilotOrganization | null> {
    const query = Database.governedQuery({
      table: 'pilot_organizations',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('org_id', orgId).maybeSingle();
    return data;
  }
}
