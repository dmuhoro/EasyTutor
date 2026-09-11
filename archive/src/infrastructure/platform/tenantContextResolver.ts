import { TenantContext } from './tenantContracts';
import { tenantManager } from './tenantManager';
import { PortalContextResolver } from '../contextResolver';

/**
 * TENANT CONTEXT RESOLVER
 * 
 * Resolves the active tenant context for the current execution thread.
 * Bridges educational portal context with platform multi-tenancy.
 */
export class TenantContextResolver {
  private static activeContext: TenantContext | null = null;

  static setContext(context: TenantContext): void {
    this.activeContext = context;
  }

  static getContext(): TenantContext {
    if (!this.activeContext) {
      // Fallback: try to build from ambient portal context if available
      try {
        const portalCtx = PortalContextResolver.resolve();
        return {
          tenant_id: 'default_tenant',
          org_id: 'default_org',
          user_id: portalCtx.user_context || 'ANONYMOUS',
          role: 'student',
          portal_type: portalCtx.portal_type
        };
      } catch {
        throw new Error('[PLATFORM ERROR] No active tenant context');
      }
    }
    return this.activeContext;
  }

  static clear(): void {
    this.activeContext = null;
  }

  /**
   * High-level resolution for incoming platform requests.
   */
  static async resolveFromRequest(headers: Record<string, string>): Promise<TenantContext> {
    const tenantId = headers['x-tenant-id'] || 'default_tenant';
    const userId = headers['x-user-id'] || 'ANONYMOUS';
    
    const context = await tenantManager.resolveContext(tenantId, userId);
    this.setContext(context);
    return context;
  }
}
