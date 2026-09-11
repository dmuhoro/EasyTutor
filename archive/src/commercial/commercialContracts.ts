/**
 * COMMERCIAL EXECUTION CONTRACTS
 * 
 * Foundational types for real-world deployment, customer success,
 * sales pipelines, and marketing attribution.
 */

export interface DeploymentExecution {
  deployment_id: string;
  tenant_id: string;
  status: 'provisioning' | 'migrating' | 'validating' | 'live' | 'rollback';
  progress: number; // 0-100
  issues_detected: string[];
}

export interface CustomerSuccessLifecycle {
  tenant_id: string;
  health_score: number; // 0-100
  renewal_probability: number; // 0-100
  active_milestone: string;
  last_engagement_date: string;
}

export interface SalesOffer {
  offer_id: string;
  tenant_id: string;
  packaging_tier: 'starter' | 'growth' | 'enterprise';
  estimated_mrr_usd: number;
  conversion_probability: number;
}

export interface ContentPerformanceMetrics {
  content_id: string;
  views: number;
  engagement_rate: number;
  attributed_leads: number;
}

export interface ProductionTrustSnapshot {
  tenant_id: string;
  timestamp: string;
  reliability_score: number;
  certified_ready: boolean;
}
