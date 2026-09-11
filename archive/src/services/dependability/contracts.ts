export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type OperationalTask = {
  id: string;
  title: string;
  dueInHours: number;
  impactScore: number;
  effortScore: number;
  overdue?: boolean;
};

export type OperatorSignal = {
  operatorId: string;
  fatigueScore: number;
  interruptionCount: number;
  errorRate: number;
};

export type ContinuitySnapshot = {
  tenantId: string;
  revision: number;
  stateHash: string;
  createdAt: string;
};
