import { Tenant, TenantStatus, TenantContext } from './tenantContracts';

/**
 * TENANT MANAGER
 * 
 * Central registry and lifecycle manager for all cognitive tenants.
 * Mandated for all platform-level tenant resolution.
 */
export class TenantManager {
  private static instance: TenantManager;
  private tenants: Map<string, Tenant> = new Map();

  static getInstance(): TenantManager {
    if (!TenantManager.instance) {
      TenantManager.instance = new TenantManager();
    }
    return TenantManager.instance;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) || null;
  }

  async registerTenant(tenant: Tenant): Promise<void> {
    this.tenants.set(tenant.tenant_id, tenant);
  }

  async updateTenantStatus(tenantId: string, status: TenantStatus): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.status = status;
    }
  }

  async resolveContext(tenantId: string, userId: string): Promise<TenantContext> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`[PLATFORM ERROR] Tenant ${tenantId} not found`);
    }

    // In production, this would query the DB for user-tenant roles
    return {
      tenant_id: tenant.tenant_id,
      org_id: tenant.org_id,
      user_id: userId,
      role: 'student', // Default mock role
      portal_type: tenant.portal_type,
    };
  }
}

export const tenantManager = TenantManager.getInstance();
