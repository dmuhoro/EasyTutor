export interface OperationalGovernanceSignal {
  tenantId: string;
  operationalState: 'healthy' | 'degraded' | 'critical';
  governanceComplianceScore: number;
  executionStandardsMet: boolean;
  lastAuditTimestamp: number;
}

export interface EconomicHealthSignal {
  tenantId: string;
  revenueHealth: number;
  operationalCostPressure: number;
  resourceEfficiencyScore: number;
  economicStabilityTrend: 'up' | 'stable' | 'down';
}

export interface DeploymentSafetySignal {
  deploymentId: string;
  environment: 'staging' | 'production' | 'canary';
  safetyScore: number;
  rollbackReadiness: number;
  migrationCompatibility: number;
}

export interface AuditEvent {
  eventId: string;
  timestamp: number;
  tenantId: string;
  eventType: 'governance_decision' | 'resource_allocation' | 'incident_detected' | 'policy_applied';
  context: Record<string, unknown>;
  auditTrailHash?: string;
}

export interface GovernancePolicy {
  policyId: string;
  tenantId: string;
  constraintType: 'resource' | 'operational' | 'economic' | 'security';
  threshold: number;
  adaptiveWeight: number;
}
