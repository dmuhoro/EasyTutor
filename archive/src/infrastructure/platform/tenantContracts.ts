import { PortalType } from '../../types/canonical';

/**
 * TENANT PLATFORM CONTRACTS
 * 
 * Defines the foundational types for the multi-tenant cognitive platform.
 */

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'deactivated';
export type UserRole = 'owner' | 'admin' | 'moderator' | 'tutor' | 'student' | 'system';

export interface Organization {
  org_id: string;
  name: string;
  domain: string;
  created_at: string;
  settings: Record<string, unknown>;
}

export interface Tenant {
  tenant_id: string;
  org_id: string;
  name: string;
  status: TenantStatus;
  portal_type: PortalType;
  config: TenantConfig;
  created_at: string;
}

export interface TenantConfig {
  execution_budget: {
    max_concurrent_agents: number;
    monthly_token_quota: number;
    max_latency_ms: number;
  };
  storage_policy: {
    max_vector_embeddings: number;
    retention_days: number;
    encryption_required: boolean;
  };
  features: string[];
}

export interface TenantContext {
  tenant_id: string;
  org_id: string;
  user_id: string;
  role: UserRole;
  portal_type: PortalType;
}

export interface TenantExecutionPolicy {
  tenant_id: string;
  allowed_roles: UserRole[];
  max_priority: 'critical' | 'high' | 'normal';
  enforce_isolation: boolean;
  audit_level: 'none' | 'basic' | 'full';
}
