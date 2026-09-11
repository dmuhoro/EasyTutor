import { GovernedApiGateway } from './governedApiGateway';
import { tenantManager } from '../infrastructure/platform/tenantManager';
import { tenantExecutionPolicies } from '../infrastructure/platform/tenantExecutionPolicies';
import { TenantStatus, TenantExecutionPolicy } from '../infrastructure/platform/tenantContracts';

/**
 * TENANT ADMIN API
 * 
 * Exposes administrative operations for tenant management and policy enforcement.
 */
export class TenantAdminApi {
  static async setTenantStatus(
    headers: Record<string, string>, 
    tenantId: string, 
    status: TenantStatus
  ): Promise<void> {
    return GovernedApiGateway.handleRequest(
      'admin:set_tenant_status',
      headers,
      'owner',
      () => tenantManager.updateTenantStatus(tenantId, status)
    );
  }

  static async updatePolicy(
    headers: Record<string, string>, 
    policy: TenantExecutionPolicy
  ): Promise<void> {
    return GovernedApiGateway.handleRequest(
      'admin:update_policy',
      headers,
      'admin',
      () => tenantExecutionPolicies.setPolicy(policy)
    );
  }

  static async getTenantConfig(
    headers: Record<string, string>, 
    tenantId: string
  ): Promise<any> {
    return GovernedApiGateway.handleRequest(
      'admin:get_config',
      headers,
      'admin',
      async () => {
        const tenant = await tenantManager.getTenant(tenantId);
        return tenant?.config || null;
      }
    );
  }
}
