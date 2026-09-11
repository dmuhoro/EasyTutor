import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * STUDENT ONBOARDING FLOW (EasyTutor)
 * 
 * Manages the initial onboarding experience for students, including diagnostic assessment.
 */
export class StudentOnboardingFlow {
  static async startOnboarding(context: TenantContext, studentId: string): Promise<void> {
    await Database.governedWrite('profiles', {
      id: studentId,
      onboarding_complete: false,
      metadata: { onboarding_started_at: new Date().toISOString() }
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }

  static async completeOnboarding(context: TenantContext, studentId: string): Promise<void> {
    await Database.governedWrite('profiles', {
      id: studentId,
      onboarding_complete: true,
      metadata: { onboarding_completed_at: new Date().toISOString() }
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
