import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * PROJECT EXECUTION PIPELINE (FreelancerOS)
 * 
 * Manages the active stages of freelancer projects, from onboarding to delivery.
 */
export class ProjectExecutionPipeline {
  static async startProject(context: TenantContext, proposalId: string): Promise<string> {
    const projectId = `proj_${Date.now()}`;
    
    await Database.governedWrite('freelancer_projects', {
      id: projectId,
      tenant_id: context.tenant_id,
      proposal_id: proposalId,
      status: 'active',
      started_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });

    return projectId;
  }

  static async updateProjectStage(context: TenantContext, projectId: string, stage: string): Promise<void> {
    await Database.governedWrite('freelancer_projects', { id: projectId, current_stage: stage }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
