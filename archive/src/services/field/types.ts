export type DeploymentState = 'pending' | 'running' | 'healthy' | 'degraded' | 'failed' | 'rolled_back';

export interface FieldDeploymentRequest {
  tenantId: string;
  siteId: string;
  version: string;
  modules: string[];
  region?: string;
}

export interface FieldDeploymentResult {
  success: boolean;
  deploymentId: string;
  state: DeploymentState;
  telemetry: Record<string, unknown>;
}

export interface SyncEnvelope<T> {
  id: string;
  tenantId: string;
  entity: string;
  payload: T;
  revision: number;
  timestamp: string;
}
