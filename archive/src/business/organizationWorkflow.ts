import { OperationalWorkflow, WorkflowStatus } from './businessContracts';
import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';
import { Telemetry } from '../observability/telemetry';

/**
 * ORGANIZATION WORKFLOW MANAGER
 * 
 * Orchestrates business workflows and their state transitions.
 */
export class OrganizationWorkflowManager {
  static async initiateWorkflow(
    context: TenantContext, 
    name: string, 
    definitionId: string
  ): Promise<OperationalWorkflow> {
    const workflow: OperationalWorkflow = {
      id: `wf_${Date.now()}`,
      tenant_id: context.tenant_id,
      name,
      status: 'active',
      definition_id: definitionId,
      current_step_id: 'start',
      owner_id: context.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };

    await Database.governedWrite('operational_workflows', workflow, {
      portalType: context.portal_type,
      userId: context.user_id
    });

    Telemetry.emit({
      event: 'WORKFLOW_INITIATED',
      source: 'platform',
      operationType: 'business_workflow',
      payload: { workflow_id: workflow.id, name }
    });

    return workflow;
  }

  static async transitionStatus(
    context: TenantContext, 
    workflowId: string, 
    newStatus: WorkflowStatus
  ): Promise<void> {
    await Database.governedWrite('operational_workflows', { id: workflowId, status: newStatus, updated_at: new Date().toISOString() }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type,
      userId: context.user_id
    });

    Telemetry.emit({
      event: 'WORKFLOW_TRANSITIONED',
      source: 'platform',
      operationType: 'business_workflow',
      payload: { workflow_id: workflowId, to_status: newStatus }
    });
  }
}
