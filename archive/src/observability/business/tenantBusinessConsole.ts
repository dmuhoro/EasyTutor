import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { OperatorConsole } from './operatorConsole';
import { WorkflowMonitoringDashboard } from './workflowMonitoringDashboard';
import { ExecutionEfficiencyEngine } from '../../business/intelligence/executionEfficiencyEngine';

/**
 * TENANT BUSINESS CONSOLE
 * 
 * The primary visibility interface for business tenants, aggregating all operational intelligence.
 */
export class TenantBusinessConsole {
  static async getExecutiveSummary(context: TenantContext): Promise<any> {
    const [overview, distribution, efficiency] = await Promise.all([
      OperatorConsole.getOverview(context),
      WorkflowMonitoringDashboard.getWorkflowDistribution(context),
      ExecutionEfficiencyEngine.calculateEfficiency(context, context.user_id)
    ]);

    return {
      overview,
      distribution,
      operator_efficiency: efficiency,
      business_context: {
        tenant_id: context.tenant_id,
        org_id: context.org_id
      },
      timestamp: new Date().toISOString()
    };
  }
}
