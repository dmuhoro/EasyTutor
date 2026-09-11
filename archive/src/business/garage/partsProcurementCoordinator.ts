import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { OperationalTaskGraph } from '../operationalTaskGraph';

/**
 * PARTS PROCUREMENT COORDINATOR
 * 
 * Manages the procurement lifecycle for parts required in a repair workflow.
 */
export class PartsProcurementCoordinator {
  static async requestPart(
    context: TenantContext, 
    workflowId: string, 
    partName: string
  ): Promise<void> {
    await OperationalTaskGraph.addTask(context, {
      workflow_id: workflowId,
      name: `Order Part: ${partName}`,
      priority: 'high',
      metadata: { part: partName, status: 'requested' }
    });
  }
}
