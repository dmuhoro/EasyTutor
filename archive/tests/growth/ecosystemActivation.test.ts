import { describe, expect, it, beforeEach } from 'vitest';
import { CustomerActivationJourneyEngine } from '../../src/growth/adoption/CustomerActivationJourneyEngine';
import { FrictionDetectionAnalyzer } from '../../src/growth/adoption/FrictionDetectionAnalyzer';
import { CognitiveMarketingEngine } from '../../src/growth/marketing/CognitiveMarketingEngine';
import { AudienceSegmentationEngine } from '../../src/growth/marketing/AudienceSegmentationEngine';
import { OpportunityDiscoveryEngine } from '../../src/growth/sales/OpportunityDiscoveryEngine';
import { ProposalConversionPredictor } from '../../src/growth/sales/ProposalConversionPredictor';
import { ExecutiveBusinessInsightsEngine } from '../../src/growth/intelligence/ExecutiveBusinessInsightsEngine';
import { OperationalRiskAnalyzer } from '../../src/growth/intelligence/OperationalRiskAnalyzer';
import { UnifiedBusinessCommandCenter } from '../../src/growth/ecosystem/UnifiedBusinessCommandCenter';
import { OperationalAutomationMarketplace } from '../../src/growth/ecosystem/OperationalAutomationMarketplace';
import { InstitutionalTrustSignalEngine } from '../../src/growth/trust/InstitutionalTrustSignalEngine';
import { SLAComplianceAnalyzer } from '../../src/growth/trust/SLAComplianceAnalyzer';
import { useRoadmapStore } from '../../store/roadmapStore';

describe('Adoption & Ecosystem Growth Validation', () => {
  beforeEach(() => {
    useRoadmapStore.setState({ learningMode: 'high_school', userId: 'user_1' });
  });

  it('evaluates customer activation journey and detects friction', async () => {
    const tenantId = 'tenant_activation_test';
    const journey = await CustomerActivationJourneyEngine.evaluateJourney(tenantId);
    expect(journey.tenant_id).toBe(tenantId);
    expect(journey.activation_score).toBeGreaterThan(0);

    const frictionPoints = await FrictionDetectionAnalyzer.detectFrictionPoints(tenantId);
    expect(Array.isArray(frictionPoints)).toBe(true);
  });

  it('generates cognitive marketing campaigns and segments audiences', async () => {
    const campaign = await CognitiveMarketingEngine.generateCampaign('tenant_mkt', 'Increase enrollments');
    expect(campaign.status).toBe('draft');
    expect(campaign.channels).toContain('email');

    const audience = AudienceSegmentationEngine.segmentAudience('tenant_mkt', { active: true });
    expect(audience.length).toBeGreaterThan(0);
  });

  it('discovers sales opportunities and predicts conversion', async () => {
    const opportunities = await OpportunityDiscoveryEngine.discoverOpportunities('tenant_sales');
    expect(opportunities.length).toBeGreaterThan(0);

    const probability = ProposalConversionPredictor.predictProbability('prop_123');
    expect(probability).toBeGreaterThan(0);
    expect(probability).toBeLessThanOrEqual(100);
  });

  it('generates executive business intelligence and analyzes risk', async () => {
    const report = await ExecutiveBusinessInsightsEngine.generateMonthlyReport('tenant_intel', '2026-05');
    expect(report.revenue_forecast_usd).toBeGreaterThan(0);
    expect(report.key_recommendations.length).toBeGreaterThan(0);

    const riskScore = OperationalRiskAnalyzer.analyzeRisk('tenant_intel');
    expect(riskScore).toBeGreaterThanOrEqual(0);
  });

  it('loads unified command center and enables automations', async () => {
    const dashboard = await UnifiedBusinessCommandCenter.loadDashboard({
      tenant_id: 'tenant_eco',
      role: 'admin',
      portal_type: 'high_school',
      org_id: 'org_eco',
      user_id: 'admin_user'
    });
    
    expect(dashboard.status).toBe('active');
    expect(dashboard.revenue_forecast).toBeDefined();

    const workflows = OperationalAutomationMarketplace.getAvailableWorkflows();
    expect(workflows.length).toBeGreaterThan(0);

    const enabled = await OperationalAutomationMarketplace.enableWorkflow('tenant_eco', workflows[0].id);
    expect(enabled).toBe(true);
  });

  it('verifies institutional trust signals and SLA compliance', async () => {
    const signals = await InstitutionalTrustSignalEngine.verifyTrustSignals('tenant_trust');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].confidence_score).toBeGreaterThan(90);

    const isCompliant = await SLAComplianceAnalyzer.checkCompliance('tenant_trust');
    expect(isCompliant).toBe(true);
  });
});
