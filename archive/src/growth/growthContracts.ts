/**
 * GROWTH & ADOPTION CONTRACTS
 * 
 * Foundational types for ecosystem activation, business intelligence, 
 * marketing automation, and customer success.
 */

export interface CustomerActivationJourney {
  tenant_id: string;
  journey_stage: 'provisioned' | 'onboarding' | 'activated' | 'retained' | 'churn_risk';
  activation_score: number; // 0-100
  milestones_completed: string[];
}

export interface MarketingCampaign {
  campaign_id: string;
  tenant_id: string;
  channels: string[];
  status: 'draft' | 'active' | 'completed';
  audience_segment: string;
  expected_engagement_rate: number;
}

export interface BusinessIntelligenceReport {
  report_id: string;
  tenant_id: string;
  month: string;
  revenue_forecast_usd: number;
  operational_risk_score: number; // 0-100
  key_recommendations: string[];
}

export interface InstitutionalTrustSignal {
  signal_id: string;
  tenant_id: string;
  signal_type: 'uptime_sla' | 'data_governance' | 'outcome_verified';
  confidence_score: number; // 0-100
  verification_date: string;
}
