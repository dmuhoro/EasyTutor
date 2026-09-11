import { BusinessContext } from './businessContracts';
import { TenantContextResolver } from '../infrastructure/platform/tenantContextResolver';

/**
 * BUSINESS CONTEXT RESOLVER
 * 
 * Resolves the active business context for the current execution thread.
 */
export class BusinessContextResolver {
  private static activeContext: BusinessContext | null = null;

  static setContext(context: BusinessContext): void {
    this.activeContext = context;
  }

  static getContext(): BusinessContext {
    if (!this.activeContext) {
      // Fallback to tenant context
      const tenantCtx = TenantContextResolver.getContext();
      return {
        ...tenantCtx,
        business_unit: 'default'
      };
    }
    return this.activeContext;
  }

  /**
   * Enriches tenant context with active business entities
   */
  static async resolveForWorkflow(workflowId: string, clientId?: string): Promise<BusinessContext> {
    const tenantCtx = TenantContextResolver.getContext();
    const context: BusinessContext = {
      ...tenantCtx,
      active_workflow_id: workflowId,
      active_client_id: clientId,
      business_unit: 'operational_execution'
    };
    
    this.setContext(context);
    return context;
  }
}
