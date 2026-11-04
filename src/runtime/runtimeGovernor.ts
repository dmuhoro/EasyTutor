/**
 * RUNTIME GOVERNOR
 *
 * Enforces non-negotiable runtime execution rules:
 * - ALL inference requests must route through governed runtime execution
 * - ALL runtime decisions must emit telemetry
 * - ALL offline operations must maintain portal isolation
 * - ALL local caches must use canonical IDs
 * - ALL retrieval caches must respect mastery-aware adaptation
 * - NO direct AI provider calls outside orchestrated runtime
 */

import { RuntimeRequest } from './types';
import { PortalType } from '../types/canonical';
import { PortalContextResolver } from '../infrastructure/contextResolver';
import { Database } from '../infrastructure/database';
import { Telemetry } from '../observability/telemetry';

export interface GovernanceCheck {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

export class RuntimeGovernor {
  async validateRequest(request: RuntimeRequest): Promise<GovernanceCheck> {
    const warnings: string[] = [];

    // 1. PORTAL ISOLATION: Verify request matches active portal context
    const activeContext = PortalContextResolver.resolve();
    if (request.portal_type !== activeContext.portal_type) {
      return {
        allowed: false,
        reason: `Portal isolation violation: request portal ${request.portal_type} != active portal ${activeContext.portal_type}`,
      };
    }

    // 2. CANONICAL OWNERSHIP: Verify canonical ID belongs to portal
    const canonicalCheck = await this.validateCanonicalOwnership(request.canonical_id, request.portal_type);
    if (!canonicalCheck.valid) {
      return {
        allowed: false,
        reason: `Canonical ownership violation: ${canonicalCheck.reason}`,
      };
    }

    // 3. OPERATION VALIDITY: Ensure operation is allowed for portal
    const operationCheck = this.validateOperation(request.operation, request.portal_type);
    if (!operationCheck.allowed) {
      return {
        allowed: false,
        reason: `Operation not allowed: ${operationCheck.reason}`,
      };
    }

    // 4. CONSTRAINTS VALIDITY: Check runtime constraints are reasonable
    if (request.constraints) {
      const constraintCheck = this.validateConstraints(request.constraints);
      if (!constraintCheck.valid && constraintCheck.warning) {
        warnings.push(constraintCheck.warning);
      }
    }

    // 5. GOVERNANCE AUDIT: Log all runtime requests
    Telemetry.emit({
      event: 'RUNTIME_GOVERNANCE_CHECK',
      source: 'runtime',
      portalType: request.portal_type,
      canonicalId: request.canonical_id,
      payload: {
        operation: request.operation,
        warnings: warnings.length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async validateCanonicalOwnership(canonicalId: string, portalType: PortalType): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Query knowledge_chunks to verify ownership
      const query = Database.governedQuery({
        table: 'knowledge_chunks',
        columns: '*',
        portalType,
      });

      // Apply canonical_id filter and limit
      const { data, error } = await (query as any).eq('canonical_id', canonicalId).limit(1);

      const rows = data ?? [];

      if (!rows || rows.length === 0) {
        return {
          valid: false,
          reason: `Canonical ID ${canonicalId} not found in portal ${portalType}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Canonical ownership check failed: ${error}`,
      };
    }
  }

  private validateOperation(operation: string, portalType: string): { allowed: boolean; reason?: string } {
    const allowedOperations = {
      high_school: ['inference', 'retrieval', 'reasoning', 'generation'],
      university: ['inference', 'retrieval', 'reasoning', 'generation'],
      knowledge_explorer: ['inference', 'retrieval', 'reasoning', 'generation'],
    };

    const portalOperations = allowedOperations[portalType as keyof typeof allowedOperations];
    if (!portalOperations || !portalOperations.includes(operation)) {
      return {
        allowed: false,
        reason: `Operation '${operation}' not allowed for portal '${portalType}'`,
      };
    }

    return { allowed: true };
  }

  private validateConstraints(constraints: RuntimeRequest['constraints']): { valid: boolean; warning?: string } {
    if (constraints?.maxLatency && constraints.maxLatency < 100) {
      return {
        valid: false,
        warning: 'Latency budget too aggressive (< 100ms), may cause frequent fallbacks',
      };
    }

    if (constraints?.maxMemory && constraints.maxMemory < 10 * 1024 * 1024) { // 10MB
      return {
        valid: false,
        warning: 'Memory budget too low (< 10MB), may cause execution failures',
      };
    }

    return { valid: true };
  }
}