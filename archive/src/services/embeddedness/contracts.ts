export type DependencySignal = {
  workflow: string;
  dailyUsage: number;
  revenueLinked: boolean;
  replaceability: number;
};

export type EconomicSignal = {
  tenantId: string;
  baselineRevenue: number;
  currentRevenue: number;
  workflowReliance: number;
};

export type MemorySnapshot = {
  institutionId: string;
  period: string;
  keyDecisions: string[];
  outcomes: string[];
};
