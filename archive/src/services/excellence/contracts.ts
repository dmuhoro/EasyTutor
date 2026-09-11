export type JourneySignal = {
  operatorId: string;
  onboardingStep: number;
  frictionScore: number;
  satisfactionScore: number;
};

export type ExecutionMetric = {
  workflowId: string;
  completionMinutes: number;
  bottleneckCount: number;
  throughput: number;
};

export type DeviceContinuitySignal = {
  sessionId: string;
  device: 'mobile' | 'tablet' | 'desktop';
  resumed: boolean;
};
