import { PolicyEnforcementMiddleware } from './middleware';
import { TenantAuditLogger } from '../infrastructure/platform/tenantAuditLogger';
import { UserRole } from '../infrastructure/platform/tenantContracts';

/**
 * GOVERNED API GATEWAY
 * 
 * Central entry point for all cognitive platform APIs.
 * Enforces tenant isolation, RBAC, and governance logging.
 */
export class GovernedApiGateway {
  static async handleRequest<T>(
    operation: string,
    headers: Record<string, string>,
    requiredRole: UserRole,
    handler: () => Promise<T>
  ): Promise<T> {
    const context = await PolicyEnforcementMiddleware.process(headers, operation);
    
    try {
      // 1. Execute handler
      const result = await handler();
      
      return result;
    } catch (error) {
      // Audit failure
      TenantAuditLogger.log(context, operation, 'failure', { error: (error as Error).message });
      throw error;
    }
  }
}
