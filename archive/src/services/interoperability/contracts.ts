export type IntegrationEvent = {
  connector: string;
  tenantId: string;
  timestamp: string;
  success: boolean;
};

export type FieldSignal = {
  online: boolean;
  latencyMs: number;
  bandwidthKbps: number;
  queuedOps: number;
};

export type TrustSignal = {
  entityId: string;
  verified: boolean;
  reliabilityScore: number;
};
