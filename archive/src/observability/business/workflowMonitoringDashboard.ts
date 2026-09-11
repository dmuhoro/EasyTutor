import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';

/**
 * WORKFLOW MONITORING DASHBOARD
 * 
 * Visualizes the state and distribution of business workflows across the organization.
 */
export class WorkflowMonitoringDashboard {
  static async getWorkflowDistribution(context: TenantContext): Promise<any> {
    const query = Database.governedQuery({
      table: 'operational_workflows',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data } = await (query as any);
    if (!data) return {};

    const distribution: Record<string, number> = {};
    data.forEach((w: any) => {
      distribution[w.status] = (distribution[w.status] || 0) + 1;
    });

    return distribution;
  }
}
