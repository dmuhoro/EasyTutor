/**
 * MARKET EXECUTION CONTRACTS
 * 
 * Foundational types for pilot management, user activation, and market analytics.
 */

export type PilotStatus = 'proposed' | 'onboarding' | 'active' | 'graduated' | 'churned';
export type ActivationMetric = 'onboarded' | 'first_execution' | 'daily_active' | 'retained';

export interface PilotOrganization {
  org_id: string;
  name: string;
  pilot_status: PilotStatus;
  start_date: string;
  end_date?: string;
  target_user_count: number;
  assigned_account_manager: string;
  [key: string]: any;
}

export interface UserActivationState {
  user_id: string;
  tenant_id: string;
  milestones_completed: string[];
  last_activity: string;
  activation_score: number; // 0-100
  [key: string]: any;
}

export interface MarketFeedback {
  id: string;
  tenant_id: string;
  user_id: string;
  category: 'feature_request' | 'bug' | 'ux' | 'pmf_signal';
  sentiment: 'positive' | 'neutral' | 'negative';
  content: string;
  timestamp: string;
  [key: string]: any;
}

export interface PilotMetrics {
  total_users: number;
  active_users: number;
  avg_activation_score: number;
  retention_rate: number;
}
