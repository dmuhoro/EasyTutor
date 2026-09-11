export type BehaviorSignal = {
  tenantId: string;
  workflow: string;
  hesitationCount: number;
  dropoffRate: number;
  completionRate: number;
};

export type FailureSignal = {
  incidentId: string;
  category: string;
  severity: number;
  recovered: boolean;
};

export type ConstraintSignal = {
  connectivityScore: number;
  bandwidthKbps: number;
  deviceTier: 'low' | 'mid' | 'high';
};
