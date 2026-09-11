import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { WorkflowMemoryEngine } from '../../business/workflowMemoryEngine';

/**
 * PROPOSAL WORKSPACE (FreelancerOS)
 * 
 * Manages the lifecycle of freelancer proposals from draft to acceptance.
 */
export class ProposalWorkspace {
  static async createProposal(context: TenantContext, clientName: string, scope: string): Promise<string> {
    const proposalId = `prop_${Date.now()}`;
    
    await Database.governedWrite('freelancer_proposals', {
      id: proposalId,
      tenant_id: context.tenant_id,
      client_name: clientName,
      scope,
      status: 'draft',
      created_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });

    await WorkflowMemoryEngine.storeFact(context, proposalId, 'client_intent', `Proposal for ${clientName} regarding ${scope}`);

    return proposalId;
  }

  static async submitProposal(context: TenantContext, proposalId: string): Promise<void> {
    await Database.governedWrite('freelancer_proposals', { id: proposalId, status: 'submitted' }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
