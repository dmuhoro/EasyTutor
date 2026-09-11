import { SecurityGovernor } from '../infrastructure/platform/securityGovernor';
import { TenantContextResolver } from '../infrastructure/platform/tenantContextResolver';
import { TenantAuditLogger } from '../infrastructure/platform/tenantAuditLogger';

/**
 * POLICY ENFORCEMENT MIDDLEWARE
 * 
 * Reusable logic for enforcing platform governance on incoming requests.
 */
export class PolicyEnforcementMiddleware {
  static async process(headers: Record<string, string>, operation: string) {
    // 1. Authenticate
    const authHeader = headers['authorization'] || '';
    const context = await SecurityGovernor.authenticate(authHeader);
    
    // 2. Set tenant context for the thread
    TenantContextResolver.setContext(context);
    
    // 3. Validate permissions
    SecurityGovernor.validateExecutionPermission(context, operation);
    
    // 4. Log start
    TenantAuditLogger.log(context, operation, 'success', { stage: 'middleware_passed' });
    
    return context;
  }
}
