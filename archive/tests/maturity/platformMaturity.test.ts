import { describe, expect, it } from 'vitest';
import { EcosystemReadinessAnalyzer } from '../../src/maturity/audit/EcosystemReadinessAnalyzer';
import { TenantOperationalReadinessScorer } from '../../src/maturity/operations/TenantOperationalReadinessScorer';
import { OperationalIncidentCoordinator } from '../../src/maturity/operations/OperationalIncidentCoordinator';
import { HumanEscalationCoordinator } from '../../src/maturity/human/HumanEscalationCoordinator';
import { InfrastructureUnitEconomicsTracker } from '../../src/maturity/economics/InfrastructureUnitEconomicsTracker';

describe('Platform Maturity - Operational Readiness Validation', () => {
  it('generates a positive ecosystem readiness report', async () => {
    const report = await EcosystemReadinessAnalyzer.generateReport();
    expect(report.overall_score).toBeGreaterThan(90);
    expect(report.extraction_ready).toBe(true);
  });

  it('calculates tenant operational readiness score', async () => {
    const score = await TenantOperationalReadinessScorer.calculateScore('tenant_alpha');
    expect(score).toBeGreaterThan(0);
  });

  it('manages the lifecycle of operational incidents', () => {
    const incidentId = OperationalIncidentCoordinator.reportIncident({
      severity: 'high',
      component: 'database_cluster',
      description: 'Latency spike detected'
    });

    let incident = OperationalIncidentCoordinator.getIncident(incidentId);
    expect(incident).toBeDefined();
    expect(incident?.status).toBe('open');

    // Escalate
    expect(() => HumanEscalationCoordinator.escalateIncident(incidentId, 'SRE')).not.toThrow();

    // Resolve
    OperationalIncidentCoordinator.resolveIncident(incidentId);
    incident = OperationalIncidentCoordinator.getIncident(incidentId);
    expect(incident?.status).toBe('resolved');
  });

  it('calculates positive unit economics for platform tenants', async () => {
    const economics = await InfrastructureUnitEconomicsTracker.calculateTenantEconomics('tenant_beta');
    expect(economics.profit_margin).toBeGreaterThan(0);
    expect(economics.total_revenue_usd).toBeGreaterThan(economics.total_cost_usd);
  });
});
