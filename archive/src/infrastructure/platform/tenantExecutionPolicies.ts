import { TenantExecutionPolicy, UserRole } from './tenantContracts';

/**
 * TENANT EXECUTION POLICIES
 * 
 * Defines and retrieves execution policies for specific tenants.
 */
export class TenantExecutionPolicies {
  private policies: Map<string, TenantExecutionPolicy> = new Map();

  async getPolicy(tenantId: string): Promise<TenantExecutionPolicy> {
    const existing = this.policies.get(tenantId);
    if (existing) return existing;

    // Default policy
    return {
      tenant_id: tenantId,
      allowed_roles: ['owner', 'admin', 'moderator', 'tutor', 'student'],
      max_priority: 'normal',
      enforce_isolation: true,
      audit_level: 'basic',
    };
  }

  async setPolicy(policy: TenantExecutionPolicy): Promise<void> {
    this.policies.set(policy.tenant_id, policy);
  }

  validateRoleAccess(policy: TenantExecutionPolicy, role: UserRole): void {
    if (!policy.allowed_roles.includes(role)) {
      throw new Error(`[POLICY ERROR] Role ${role} is not permitted to execute in tenant ${policy.tenant_id}`);
    }
  }
}

export const tenantExecutionPolicies = new TenantExecutionPolicies();
