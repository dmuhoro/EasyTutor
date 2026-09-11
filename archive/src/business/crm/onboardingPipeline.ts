import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { OrganizationWorkflowManager } from '../organizationWorkflow';
import { OperationalTaskGraph } from '../operationalTaskGraph';
import { ClientEntityManager } from '../clientEntity';

/**
 * ONBOARDING PIPELINE
 * 
 * Manages the conversion of qualified leads into active clients through a structured pipeline.
 */
export class OnboardingPipeline {
  static async activateClient(context: TenantContext, clientId: string): Promise<void> {
    const workflow = await OrganizationWorkflowManager.initiateWorkflow(
      context,
      `Onboarding: ${clientId}`,
      'ONBOARDING'
    );

    // Update status to active
    await ClientEntityManager.updateStatus(context, clientId, 'active');

    // Create onboarding checklist
    const steps = [
      'Legal Contract Signed',
      'Initial Payment Received',
      'Account Setup',
      'Kickoff Call'
    ];

    for (const step of steps) {
      await OperationalTaskGraph.addTask(context, {
        workflow_id: workflow.id,
        name: step,
        priority: 'high'
      });
    }
  }
}
