import { describe, expect, it, beforeEach } from 'vitest';
import { VerticalProductRegistry } from '../../src/productization/VerticalProductRegistry';
import { TenantVerticalInitializer } from '../../src/productization/TenantVerticalInitializer';
import { ProductFeatureFlagEngine } from '../../src/productization/ProductFeatureFlagEngine';
import { ProposalWorkspace } from '../../src/products/freelancer/proposalWorkspace';
import { RepairTicketLifecycle } from '../../src/products/garage/repairTicketLifecycle';
import { mockSupabase } from '../utils/mockSupabase';
import { TenantContext } from '../../src/infrastructure/platform/tenantContracts';

describe('Vertical Productization - E2E Multi-Product Validation', () => {
  const mockContext: TenantContext = {
    tenant_id: 'test_institutional_tenant',
    org_id: 'org_main',
    user_id: 'user_admin',
    portal_type: 'high_school',
    role: 'admin'
  };

  beforeEach(() => {
    mockSupabase.reset();
    VerticalProductRegistry.initialize();
  });

  it('initializes multiple products for a single tenant', async () => {
    // 1. Initialize EasyTutor
    await TenantVerticalInitializer.initializeTenantProduct(mockContext.tenant_id, 'easytutor');
    
    // 2. Initialize FreelancerOS
    await TenantVerticalInitializer.initializeTenantProduct(mockContext.tenant_id, 'freelanceros');

    const deployments = (mockSupabase.db as any).product_deployments;
    expect(deployments).toHaveLength(2);
    expect(deployments.map((d: any) => d.product_id)).toContain('easytutor');
    expect(deployments.map((d: any) => d.product_id)).toContain('freelanceros');
  });

  it('enforces feature flags per product/tenant', async () => {
    await TenantVerticalInitializer.initializeTenantProduct(mockContext.tenant_id, 'freelanceros');
    
    // Feature should be disabled by default
    let enabled = await ProductFeatureFlagEngine.isFeatureEnabled(mockContext.tenant_id, 'freelanceros', 'ai_consultation');
    expect(enabled).toBe(false);

    // Enable feature
    await ProductFeatureFlagEngine.enableFeature(mockContext.tenant_id, 'freelanceros', 'ai_consultation');
    enabled = await ProductFeatureFlagEngine.isFeatureEnabled(mockContext.tenant_id, 'freelanceros', 'ai_consultation');
    expect(enabled).toBe(true);
  });

  it('executes FreelancerOS workflow correctly', async () => {
    const proposalId = await ProposalWorkspace.createProposal(mockContext, 'Google', 'AI Infrastructure Audit');
    expect(proposalId).toBeDefined();

    const proposals = (mockSupabase.db as any).freelancer_proposals;
    expect(proposals[0].client_name).toBe('Google');
    expect(proposals[0].status).toBe('draft');

    await ProposalWorkspace.submitProposal(mockContext, proposalId);
    expect(proposals[0].status).toBe('submitted');
  });

  it('executes GarageOS workflow correctly', async () => {
    const ticketId = await RepairTicketLifecycle.openTicket(mockContext, 'VIN12345', 'Engine check light on');
    expect(ticketId).toBeDefined();

    const tickets = (mockSupabase.db as any).garage_repair_tickets;
    expect(tickets[0].vehicle_vin).toBe('VIN12345');
    expect(tickets[0].status).toBe('open');

    await RepairTicketLifecycle.assignTechnician(mockContext, ticketId, 'tech_01');
    expect(tickets[0].technician_id).toBe('tech_01');
    expect(tickets[0].status).toBe('assigned');
  });
});
