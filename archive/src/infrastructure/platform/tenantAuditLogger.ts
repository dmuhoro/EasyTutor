import { Telemetry } from '../../observability/telemetry';
import { TenantContext } from './tenantContracts';

/**
 * TENANT AUDIT LOGGER
 * 
 * Records security-sensitive and governance-level events
 * with full tenant context for compliance and forensics.
 */
export class TenantAuditLogger {
  static log(
    context: TenantContext, 
    action: string, 
    status: 'success' | 'failure', 
    metadata: Record<string, unknown> = {}
  ): void {
    Telemetry.emit({
      event: 'TENANT_AUDIT_LOG',
      source: 'platform',
      portalType: context.portal_type,
      userId: context.user_id,
      operationType: action,
      payload: {
        tenant_id: context.tenant_id,
        org_id: context.org_id,
        role: context.role,
        action,
        status,
        ...metadata,
        audit_timestamp: new Date().toISOString()
      }
    });
    
    if (status === 'failure') {
      console.error(`[AUDIT FAILURE] ${action} by ${context.user_id} in ${context.tenant_id}`);
    }
  }
}
