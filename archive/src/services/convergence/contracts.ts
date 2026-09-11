export type DomainState = {
  domain: string;
  healthy: boolean;
  dependencyWeight: number;
};

export type ExecutionState = {
  nodeId: string;
  revision: number;
  checksum: string;
};

export type BusinessOutcomeSignal = {
  tenantId: string;
  baselineRevenue: number;
  currentRevenue: number;
  baselineCycleHours: number;
  currentCycleHours: number;
};
