import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * CONTEXT PROPAGATION MANAGER
 * 
 * Ensures that critical tenant and execution context is seamlessly propagated 
 * across asynchronous boundaries and distributed service layers.
 */
export class ContextPropagationManager {
  private static contextStore: Map<string, TenantContext> = new Map();

  static associateContext(traceId: string, context: TenantContext): void {
    this.contextStore.set(traceId, context);
  }

  static getContext(traceId: string): TenantContext | undefined {
    return this.contextStore.get(traceId);
  }

  static clearContext(traceId: string): void {
    this.contextStore.delete(traceId);
  }
}
