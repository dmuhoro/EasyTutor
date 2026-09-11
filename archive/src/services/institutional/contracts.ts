export type DeploymentInput = {
  tenantId: string;
  region: string;
  template: string;
};

export type AdoptionSignal = {
  operatorsInvited: number;
  operatorsActivated: number;
  onboardingCompletionRate: number;
};

export type TelemetrySignal = {
  activeUsers: number;
  incidents: number;
  throughput: number;
  continuityScore: number;
};
