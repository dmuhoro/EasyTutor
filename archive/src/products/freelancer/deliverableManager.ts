import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * DELIVERABLE MANAGER (FreelancerOS)
 * 
 * Tracks the creation and approval of freelancer project deliverables.
 */
export class DeliverableManager {
  static async addDeliverable(context: TenantContext, projectId: string, name: string): Promise<void> {
    await Database.governedWrite('freelancer_deliverables', {
      id: `deliv_${Date.now()}`,
      tenant_id: context.tenant_id,
      project_id: projectId,
      name,
      status: 'pending',
      created_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async approveDeliverable(context: TenantContext, deliverableId: string): Promise<void> {
    await Database.governedWrite('freelancer_deliverables', {
      id: deliverableId,
      status: 'approved',
      approved_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
