export type PilotStage = 'planned' | 'onboarding' | 'active' | 'stabilized';

export type FeedbackSignal = {
  tenantId: string;
  workflow: string;
  frictionScore: number;
  incident: boolean;
};

export type FieldRuntimeSignal = {
  connectivityScore: number;
  deviceClass: 'low' | 'mid' | 'high';
  pendingSyncConflicts: number;
};
