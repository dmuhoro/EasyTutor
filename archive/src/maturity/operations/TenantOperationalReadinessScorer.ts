import { InstitutionalDeploymentChecklistEngine } from './InstitutionalDeploymentChecklistEngine';

/**
 * TENANT OPERATIONAL READINESS SCORER
 * 
 * Scores a tenant's operational maturity, ensuring they have completed 
 * all necessary onboarding and infrastructure configurations.
 */
export class TenantOperationalReadinessScorer {
  static async calculateScore(tenantId: string): Promise<number> {
    const checklist = await InstitutionalDeploymentChecklistEngine.evaluateTenant(tenantId);
    
    const totalSteps = checklist.completed_steps.length + checklist.pending_steps.length;
    if (totalSteps === 0) return 0;

    return (checklist.completed_steps.length / totalSteps) * 100;
  }
}
