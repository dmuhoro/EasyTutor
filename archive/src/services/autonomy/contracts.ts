export type ExecutionSignal = {
  workflowId: string;
  latencyMs: number;
  errorRate: number;
  load: number;
};

export type InstitutionalSignal = {
  institutionId: string;
  adoptionRate: number;
  efficiencyScore: number;
  revenueDelta: number;
};

export type GovernanceSignal = {
  policyId: string;
  expectedVersion: number;
  observedVersion: number;
};
