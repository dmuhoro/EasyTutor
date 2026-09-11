import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * OPERATOR OS - BUSINESS CONTRACTS
 * 
 * Foundational types for business entities, workflows, and operational intelligence.
 */

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type ClientStatus = 'lead' | 'qualified' | 'active' | 'churned' | 'referral';

export interface BusinessEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  [key: string]: any;
}

export interface Client extends BusinessEntity {
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  org_id: string;
}

export interface OperationalWorkflow extends BusinessEntity {
  name: string;
  status: WorkflowStatus;
  definition_id: string; // Reference to workflow template
  current_step_id: string;
  owner_id: string;
}

export interface OperationalTask extends BusinessEntity {
  workflow_id: string;
  name: string;
  status: TaskStatus;
  assigned_to?: string;
  due_at?: string;
  completed_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BusinessContext extends TenantContext {
  active_workflow_id?: string;
  active_client_id?: string;
  business_unit?: string;
}

export interface WorkflowStateTransition {
  workflow_id: string;
  from_status: WorkflowStatus;
  to_status: WorkflowStatus;
  timestamp: string;
  reason?: string;
  operator_id: string;
}
