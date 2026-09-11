export interface DeploymentRequest {
  tenantId: string;
  version: string;
  config?: Record<string, unknown>;
}

export interface ProvisionerResult {
  success: boolean;
  envUrl?: string;
  details?: Record<string, unknown>;
}

export interface MigrationPlan {
  fromTenantId: string;
  toTenantId: string;
  steps: Array<string>;
}

export interface RollbackPlan {
  reason: string;
  steps: Array<string>;
}

export interface ValidationResult {
  ok: boolean;
  warnings?: string[];
  errors?: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  details?: Record<string, unknown>;
}

export interface DeploymentCheckpoint {
  step: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  detail?: string;
}
