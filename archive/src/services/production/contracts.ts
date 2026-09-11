export type DeploymentStage = 'canary' | 'regional' | 'global';

export type TenantUsageSignal = {
  tenantId: string;
  activeUsers: number;
  workflowRuns: number;
  incidentCount: number;
};

export type RevenueSignal = {
  tenantId: string;
  revenue: number;
  cost: number;
  expansionEvents: number;
};
