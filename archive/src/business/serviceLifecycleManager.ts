import { TenantContext } from '../infrastructure/platform/tenantContracts';
import { ClientEntityManager } from './clientEntity';
import { OrganizationWorkflowManager } from './organizationWorkflow';
import { OperationalTaskGraph } from './operationalTaskGraph';

/**
 * SERVICE LIFECYCLE MANAGER
 * 
 * High-level coordinator for business services (e.g. Onboarding, Repair, Consultation).
 */
export class ServiceLifecycleManager {
  static async startService(
    context: TenantContext, 
    clientName: string, 
    serviceType: string
  ): Promise<any> {
    // 1. Ensure client exists
    const client = await ClientEntityManager.createClient(context, { name: clientName });

    // 2. Start specific service workflow
    const workflow = await OrganizationWorkflowManager.initiateWorkflow(
      context, 
      `${serviceType}: ${clientName}`, 
      serviceType
    );

    // 3. Create initial task
    const initialTask = await OperationalTaskGraph.addTask(context, {
      workflow_id: workflow.id,
      name: `Initialize ${serviceType}`,
      priority: 'high'
    });

    return {
      client_id: client.id,
      workflow_id: workflow.id,
      task_id: initialTask.id
    };
  }
}
