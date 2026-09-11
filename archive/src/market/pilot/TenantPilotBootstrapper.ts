import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { PilotUserProvisioningEngine } from './PilotUserProvisioningEngine';
import { Telemetry } from '../../observability/telemetry';

/**
 * TENANT PILOT BOOTSTRAPPER
 * 
 * Coordinates the full bootstrap process for a new pilot tenant, including users and initial data.
 */
export class TenantPilotBootstrapper {
  static async bootstrapPilot(context: TenantContext, initialUsers: Array<{ email: string, name: string }>): Promise<void> {
    console.log(`[PILOT BOOTSTRAP] Starting for tenant ${context.tenant_id}...`);

    for (const user of initialUsers) {
      await PilotUserProvisioningEngine.provisionUser(context, user.email, user.name);
    }

    Telemetry.emit({
      event: 'PILOT_BOOTSTRAP_COMPLETED',
      source: 'platform',
      operationType: 'pilot_management',
      payload: { tenant_id: context.tenant_id, user_count: initialUsers.length }
    });

    console.log(`[PILOT BOOTSTRAP] Completed for tenant ${context.tenant_id}.`);
  }
}
