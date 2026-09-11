import { beforeEach, describe, expect, it } from 'vitest';
import { mockSupabase } from '../utils/mockSupabase';
import { DeploymentExecutionCoordinator } from '../../src/services/deployment/DeploymentExecutionCoordinator';
import { CustomerSuccessOrchestrator } from '../../src/services/success/CustomerSuccessOrchestrator';
import { ServiceDeliveryLifecycleEngine } from '../../src/services/success/ServiceDeliveryLifecycleEngine';
import { RenewalPredictionEngine } from '../../src/services/success/RenewalPredictionEngine';
import { RevenuePipelineForecaster } from '../../src/services/sales/RevenuePipelineForecaster';
import { OfferPackagingEngine } from '../../src/services/sales/OfferPackagingEngine';
import { PricingStrategyResolver } from '../../src/services/sales/PricingStrategyResolver';
import { ProposalClosingAssistant } from '../../src/services/sales/ProposalClosingAssistant';
import { SalesConversationMemory } from '../../src/services/sales/SalesConversationMemory';
import { ContentGenerationOrchestrator } from '../../src/services/marketing/ContentGenerationOrchestrator';
import { CrossPlatformDistributionEngine } from '../../src/services/marketing/CrossPlatformDistributionEngine';
import { MarketingAttributionEngine } from '../../src/services/marketing/MarketingAttributionEngine';
import { ContentPerformanceAnalyzer } from '../../src/services/marketing/ContentPerformanceAnalyzer';
import { SocialProofAmplifier } from '../../src/services/marketing/SocialProofAmplifier';
import { ClientHealthScoringEngine } from '../../src/services/success/ClientHealthScoringEngine';
import { SuccessMilestoneTracker } from '../../src/services/success/SuccessMilestoneTracker';
import { SMEOperationalTemplateLibrary } from '../../src/services/sme/SMEOperationalTemplateLibrary';
import { IndustryWorkflowBlueprints } from '../../src/services/sme/IndustryWorkflowBlueprints';
import { AutomatedBusinessAuditEngine } from '../../src/services/sme/AutomatedBusinessAuditEngine';
import { OperationalRecommendationRuntime } from '../../src/services/sme/OperationalRecommendationRuntime';
import { ProductionTrustDashboard } from '../../src/services/trust/ProductionTrustDashboard';
import { DeploymentCertificationEngine } from '../../src/services/trust/DeploymentCertificationEngine';
import { InstitutionalReadinessSnapshots } from '../../src/services/trust/InstitutionalReadinessSnapshots';
import { ReliabilityScoreAggregator } from '../../src/services/trust/ReliabilityScoreAggregator';

describe('Commercial execution integration', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('completes deployment, onboarding, service delivery, marketing attribution, renewal prediction, and revenue forecasting', async () => {
    const deploymentCoordinator = new DeploymentExecutionCoordinator();
    const deploymentResult = await deploymentCoordinator.orchestrateDeployment({
      tenantId: 'tenant-alpha',
      version: 'v1.0.0',
      config: {
        region: 'ke-central-1',
        modules: ['crm', 'service_delivery', 'analytics', 'marketing'],
      },
    });

    expect(deploymentResult.success).toBe(true);
    expect(deploymentResult.deploymentId).toBe('deploy_tenant-alpha_v1_0_0');
    expect((deploymentResult.details?.checkpoints as Array<{ status: string }>).every((item) => item.status === 'completed')).toBe(true);

    const customerSuccess = new CustomerSuccessOrchestrator();
    const onboardingResult = await customerSuccess.onboardCustomer('tenant-alpha');
    expect(onboardingResult.success).toBe(true);
    expect(mockSupabase.db.business_clients).toHaveLength(1);
    await customerSuccess.recordInteraction('tenant-alpha', 'Kickoff call completed');

    const serviceEngine = new ServiceDeliveryLifecycleEngine();
    const serviceInstance = await serviceEngine.createServiceInstance('tenant-alpha', 'managed_learning');
    expect(serviceInstance.success).toBe(true);
    expect(mockSupabase.db.product_deployments).toHaveLength(1);

    const activationResult = await serviceEngine.markServiceActive(serviceInstance.instanceId);
    expect(activationResult.success).toBe(true);

    const eventResult = await serviceEngine.recordDeliveryEvent(serviceInstance.instanceId, 'service_launched', { launchPhase: 'alpha' });
    expect(eventResult.success).toBe(true);
    expect(mockSupabase.db.execution_checkpoints).toHaveLength(1);

    const contentGenerator = new ContentGenerationOrchestrator();
    const content = await contentGenerator.generate({
      tenantId: 'tenant-alpha',
      objective: 'customer acquisition',
      channels: ['email', 'linkedin'],
    });
    expect(content.channels).toContain('email');

    const distributionEngine = new CrossPlatformDistributionEngine();
    const distribution = distributionEngine.distribute(content.id);
    expect(distribution.distributed).toBe(true);

    const attributionEngine = new MarketingAttributionEngine();
    const attribution = attributionEngine.attribute([
      { source: 'email', conversion: true, tenantId: 'tenant-alpha' },
      { source: 'linkedin', conversion: false, tenantId: 'tenant-alpha' },
      { source: 'email', conversion: true, tenantId: 'tenant-beta' },
    ]);
    expect(attribution.attributions).toHaveLength(2);
    expect(attribution.influencedRevenueUSD).toBeGreaterThan(0);

    const performanceAnalyzer = new ContentPerformanceAnalyzer();
    const performance = performanceAnalyzer.analyze('campaign-123');
    expect(performance.ctr).toBeGreaterThan(0);

    const socialProof = new SocialProofAmplifier();
    expect(socialProof.amplify(content.id).proofAssets).toContain('client-quote');

    const renewalEngine = new RenewalPredictionEngine();
    const renewalForecast = await renewalEngine.predict('tenant-alpha');
    expect(renewalForecast.probability).toBeGreaterThanOrEqual(0);
    expect(renewalForecast.probability).toBeLessThanOrEqual(1);

    const offerEngine = new OfferPackagingEngine();
    const offer = offerEngine.package({
      tenantId: 'tenant-alpha',
      segment: 'growth',
      teamSize: 12,
      priorities: ['deployment-speed', 'retention'],
    });
    expect(offer.includedModules).toContain('marketing_attribution');

    const pricingResolver = new PricingStrategyResolver();
    const pricing = pricingResolver.resolve({
      segment: 'growth',
      markets: ['africa_sme'],
      annualCommit: true,
      teamSize: 12,
    });
    expect(pricing.priceUSD).toBeGreaterThan(0);

    const conversationMemory = new SalesConversationMemory();
    expect(conversationMemory.record({
      tenantId: 'tenant-alpha',
      message: 'Budget approved pending procurement',
      stage: 'proposal',
    }).stored).toBe(true);
    expect(conversationMemory.getTimeline('tenant-alpha')).toHaveLength(1);

    const closingAssistant = new ProposalClosingAssistant();
    const closingPlan = closingAssistant.assist({
      proposalId: 'proposal-alpha',
      stakeholderCount: 2,
      urgency: 'high',
      objections: ['integration timeline'],
    });
    expect(closingPlan.confidence).toBeGreaterThan(0);

    const revenueForecaster = new RevenuePipelineForecaster();
    const pipeline = revenueForecaster.forecast('Q3');
    expect(pipeline.amount).toBeGreaterThan(0);
    expect(pipeline.weightedAmount).toBeGreaterThan(0);

    const healthScoreEngine = new ClientHealthScoringEngine();
    const health = await healthScoreEngine.score('tenant-alpha');
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(1);
    expect(health.details.tenantId).toBe('tenant-alpha');

    const milestoneTracker = new SuccessMilestoneTracker();
    const milestone = await milestoneTracker.track('tenant-alpha', 'first_service_launch');
    expect(milestone.tracked).toBe(true);

    const templateLibrary = new SMEOperationalTemplateLibrary();
    expect(templateLibrary.list().length).toBeGreaterThan(0);

    const blueprintLibrary = new IndustryWorkflowBlueprints();
    expect(blueprintLibrary.get('dental_clinic').workflows).toContain('appointment-reminders');

    const auditEngine = new AutomatedBusinessAuditEngine();
    const audit = auditEngine.audit({
      tenantId: 'tenant-alpha',
      activeChannels: ['email'],
      hasFollowupAutomation: false,
    });
    expect(audit.issues.length).toBeGreaterThan(0);

    const recommendationRuntime = new OperationalRecommendationRuntime();
    const recommendations = recommendationRuntime.recommend({
      auditScore: audit.score,
      industry: 'dental_clinic',
    });
    expect(recommendations.recommendations.length).toBeGreaterThan(0);

    const trustDashboard = new ProductionTrustDashboard();
    expect(trustDashboard.snapshot().readinessLevel).toBe('trusted');

    const certificationEngine = new DeploymentCertificationEngine();
    expect(certificationEngine.certify('tenant-alpha').certified).toBe(true);

    const readinessSnapshots = new InstitutionalReadinessSnapshots();
    expect(readinessSnapshots.create('tenant-alpha').readinessScore).toBeGreaterThan(0.8);

    const reliabilityAggregator = new ReliabilityScoreAggregator();
    expect(reliabilityAggregator.aggregate({
      uptime: 0.99,
      validationPassRate: 1,
      rollbackReadiness: 0.92,
    }).score).toBeGreaterThan(0.9);

    await deploymentCoordinator.rollback({ reason: 'integration-test-cleanup', steps: ['revoke-resources'] });
  });

  it('rejects unsafe deployment requests before provisioning starts', async () => {
    const deploymentCoordinator = new DeploymentExecutionCoordinator();
    const result = await deploymentCoordinator.orchestrateDeployment({
      tenantId: 'tenant alpha',
      version: '1.0.0',
      config: {
        skipHealthGates: true,
      },
    });

    expect(result.success).toBe(false);
    expect((result.details?.validation as { errors: string[] }).errors.length).toBeGreaterThan(0);
  });
});
