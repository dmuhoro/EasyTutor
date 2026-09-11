/**
 * MATURITY CONTRACTS
 * 
 * Foundational types for ecosystem readiness, operational maturity, and unit economics.
 */

export interface EcosystemReadinessReport {
  timestamp: string;
  overall_score: number; // 0-100
  drift_detected: boolean;
  extraction_ready: boolean;
  unresolved_incidents: number;
}

export interface DeploymentChecklist {
  tenant_id: string;
  is_ready: boolean;
  completed_steps: string[];
  pending_steps: string[];
}

export interface UnitEconomicsReport {
  tenant_id: string;
  total_cost_usd: number;
  total_revenue_usd: number;
  profit_margin: number;
  cost_per_execution_usd: number;
}

export interface OperationalIncident {
  incident_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  component: string;
  description: string;
}
