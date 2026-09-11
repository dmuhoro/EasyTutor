/**
 * PRODUCTIZATION CONTRACTS
 * 
 * Foundational types for vertical product registration, capability mapping, and lifecycle management.
 */

export type ProductId = 'easytutor' | 'freelanceros' | 'garageos' | 'businessos';
export type CapabilityId = 'inference' | 'retrieval' | 'billing' | 'crm' | 'diagnostics' | 'curriculum';

export interface VerticalProduct {
  id: ProductId;
  name: string;
  version: string;
  capabilities: CapabilityId[];
  default_portal: string;
  description: string;
}

export interface ProductDeploymentProfile {
  product_id: ProductId;
  tenant_id: string;
  enabled_features: string[];
  configuration: Record<string, unknown>;
  deployed_at: string;
  status: 'active' | 'suspended' | 'deprovisioned';
  [key: string]: any;
}

export interface ProductCapabilityMap {
  capability_id: CapabilityId;
  required_runtimes: string[];
  governance_policies: string[];
}

export interface ProductEvent {
  product_id: ProductId;
  tenant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
