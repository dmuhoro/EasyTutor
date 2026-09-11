import { describe, expect, it, beforeEach } from 'vitest';
import { PilotOrganizationManager } from '../../src/market/pilot/PilotOrganizationManager';
import { TenantPilotBootstrapper } from '../../src/market/pilot/TenantPilotBootstrapper';
import { UsageActivationEngine } from '../../src/market/pilot/UsageActivationEngine';
import { ProductUsageAnalytics } from '../../src/market/analytics/ProductUsageAnalytics';
import { PmfSignalTracker } from '../../src/market/analytics/PmfSignalTracker';
import { mockSupabase } from '../utils/mockSupabase';
import { TenantContext } from '../../src/infrastructure/platform/tenantContracts';

describe('Market Execution - Pilot Deployment Validation', () => {
  const mockContext: TenantContext = {
    tenant_id: 'pilot_tenant_strathmore',
    org_id: 'org_strathmore',
    user_id: 'admin_user',
    portal_type: 'high_school',
    role: 'admin'
  };

  beforeEach(() => {
    mockSupabase.reset();
  });

  it('successfully registers and bootstraps a pilot organization', async () => {
    // 1. Register Org
    await PilotOrganizationManager.registerPilot({
      org_id: mockContext.org_id,
      name: 'Strathmore School',
      target_user_count: 50,
      assigned_account_manager: 'account_mgr_01'
    });

    const org = await PilotOrganizationManager.getPilot(mockContext.org_id);
    expect(org?.pilot_status).toBe('onboarding');

    // 2. Bootstrap Users
    await TenantPilotBootstrapper.bootstrapPilot(mockContext, [
      { email: 'teacher1@strathmore.ac.ke', name: 'Teacher One' },
      { email: 'teacher2@strathmore.ac.ke', name: 'Teacher Two' }
    ]);

    const profiles = (mockSupabase.db as any).profiles;
    expect(profiles).toHaveLength(3); // student + 2 teachers
    expect(profiles.some((p: any) => p.email === 'teacher1@strathmore.ac.ke')).toBe(true);
  });

  it('tracks user activation milestones and scores', async () => {
    await TenantPilotBootstrapper.bootstrapPilot(mockContext, [
      { email: 'student1@strathmore.ac.ke', name: 'Student One' }
    ]);
    const userId = (mockSupabase.db as any).profiles[1].id;

    // Milestone 1: First Login
    await UsageActivationEngine.recordMilestone(mockContext, userId, 'first_login');
    
    let state = (mockSupabase.db as any).user_activation_states[0];
    expect(state.activation_score).toBe(40); // 20 (provisioned) + 20 (first_login)

    // Milestone 2: First Execution
    await UsageActivationEngine.recordMilestone(mockContext, userId, 'first_execution');
    state = (mockSupabase.db as any).user_activation_states[0];
    expect(state.activation_score).toBe(60);
  });

  it('aggregates PMF signals from pilot feedback', async () => {
    await PmfSignalTracker.recordFeedback({
      tenant_id: mockContext.tenant_id,
      user_id: 'user_01',
      category: 'pmf_signal',
      sentiment: 'positive',
      content: 'This is exactly what we needed for KCSE prep!'
    });

    await PmfSignalTracker.recordFeedback({
      tenant_id: mockContext.tenant_id,
      user_id: 'user_02',
      category: 'pmf_signal',
      sentiment: 'neutral',
      content: 'Good, but needs more local language support.'
    });

    const pmfScore = await PmfSignalTracker.getPmfScore('easytutor');
    expect(pmfScore).toBe(50); // 1 positive / 2 total
  });
});
