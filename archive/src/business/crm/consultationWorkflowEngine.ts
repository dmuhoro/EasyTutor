import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { OrganizationWorkflowManager } from '../organizationWorkflow';
import { OperationalTaskGraph } from '../operationalTaskGraph';

/**
 * CONSULTATION WORKFLOW ENGINE
 * 
 * Manages the multi-stage consultation process from booking to completion.
 */
export class ConsultationWorkflowEngine {
  static async startConsultation(context: TenantContext, clientId: string): Promise<string> {
    const workflow = await OrganizationWorkflowManager.initiateWorkflow(
      context, 
      `Consultation: ${clientId}`, 
      'CONSULTATION'
    );

    // Seed consultation tasks
    await OperationalTaskGraph.addTask(context, {
      workflow_id: workflow.id,
      name: 'Pre-consultation Research',
      priority: 'normal'
    });

    await OperationalTaskGraph.addTask(context, {
      workflow_id: workflow.id,
      name: 'Conduct Consultation Meeting',
      priority: 'high'
    });

    await OperationalTaskGraph.addTask(context, {
      workflow_id: workflow.id,
      name: 'Draft Consultation Summary',
      priority: 'normal'
    });

    return workflow.id;
  }
}
