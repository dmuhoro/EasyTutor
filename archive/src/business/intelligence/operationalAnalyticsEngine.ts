import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { Database } from '../../infrastructure/database';

/**
 * OPERATIONAL ANALYTICS ENGINE
 * 
 * Aggregates business-wide execution metrics for reporting and analysis.
 */
export class OperationalAnalyticsEngine {
  static async getOperationalSummary(context: TenantContext): Promise<any> {
    const workflowsQuery = Database.governedQuery({
      table: 'operational_workflows',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const tasksQuery = Database.governedQuery({
      table: 'operational_tasks',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const [workflows, tasks] = await Promise.all([
      (workflowsQuery as any),
      (tasksQuery as any)
    ]);

    const activeWorkflows = workflows.data?.length || 0;
    const completedTasks = tasks.data?.filter((t: any) => t.status === 'completed').length || 0;
    const pendingTasks = tasks.data?.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length || 0;

    return {
      active_workflows: activeWorkflows,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      completion_ratio: completedTasks / (completedTasks + pendingTasks || 1)
    };
  }
}
