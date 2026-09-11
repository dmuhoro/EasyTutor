import { describe, expect, it } from 'vitest';
import {
  LivePilotCoordinator,
  TenantRolloutSequencer,
  PilotExecutionTimelineManager,
  RealWorldDeploymentTracker,
  OperatorEngagementMonitor,
  OperationalFeedbackCollector,
  UserFrictionSignalEngine,
  CustomerBehaviorTelemetryRuntime,
  FeatureRealityValidationEngine,
  DeploymentIssueCorrelationAnalyzer,
  AdaptiveRefinementEngine,
  UsageDrivenPrioritizationSystem,
  ProductEvolutionCoordinator,
  RealWorldWorkflowOptimizer,
  InstitutionalImprovementRecommender,
  InstitutionalHealthPredictor,
  CustomerSuccessEscalationEngine,
  ChurnPreventionCoordinator,
  ExpansionOpportunityDetector,
  SuccessMilestoneTracker,
  LowConnectivityExecutionManager,
  DeviceCapabilityAdapter,
  OfflineConflictResolutionEngine,
  ResourceAwareRuntimeScaler,
  MultiRegionOperationalCoordinator,
  LiveOperationalAuditEngine,
  PilotReadinessCertificationRuntime,
  InstitutionalExecutionValidator,
  DeploymentConfidenceScorer,
  EcosystemOperationalReadinessAnalyzer,
} from '../../src/services/pilot';

describe('Live pilot execution + operational feedback (Sprint Ω.27)', () => {
  it('validates pilot execution, feedback ingestion, product evolution, success intelligence, field hardening, and readiness certification', () => {
    const pilots = new LivePilotCoordinator().coordinate([
      { tenantId: 't1', stage: 'active' },
      { tenantId: 't2', stage: 'onboarding' },
      { tenantId: 't3', stage: 'stabilized' },
    ]);
    expect(pilots.activePilots).toBe(2);

    const rollout = new TenantRolloutSequencer().sequence([
      { tenantId: 't2', readiness: 0.7 },
      { tenantId: 't1', readiness: 0.9 },
    ]);
    expect(rollout.order[0]).toBe('t1');

    const timeline = new PilotExecutionTimelineManager().build([
      { id: 'e2', timestamp: '2026-05-19T10:00:02.000Z' },
      { id: 'e1', timestamp: '2026-05-19T10:00:01.000Z' },
    ]);
    expect(timeline.orderedEvents[0]).toBe('e1');

    const tracker = new RealWorldDeploymentTracker().track({ deployed: 8, blocked: 1, rolledBack: 1 });
    expect(tracker.completionRate).toBe(0.8);

    const engagement = new OperatorEngagementMonitor().monitor({ invited: 20, activated: 16, weeklyActive: 13 });
    expect(engagement.engagementHealth).toBe('high');

    const collected = new OperationalFeedbackCollector().collect([
      { tenantId: 't1', workflow: 'onboarding', frictionScore: 0.9, incident: false },
      { tenantId: 't1', workflow: 'billing', frictionScore: 0.3, incident: false },
    ]);
    expect(collected.critical).toBe(1);

    const friction = new UserFrictionSignalEngine().detect([
      { tenantId: 't1', workflow: 'onboarding', frictionScore: 0.9, incident: false },
      { tenantId: 't1', workflow: 'onboarding', frictionScore: 0.8, incident: false },
      { tenantId: 't1', workflow: 'billing', frictionScore: 0.2, incident: false },
    ]);
    expect(friction.topPainPoints[0]).toBe('onboarding');

    const behavior = new CustomerBehaviorTelemetryRuntime().summarize({ sessions: 100, taskCompletions: 82, dropOffs: 10 });
    expect(behavior.completionRate).toBe(0.82);

    const feature = new FeatureRealityValidationEngine().validate({ expectedAdoption: 0.7, actualAdoption: 0.75 });
    expect(feature.validated).toBe(true);

    const issueCorrelation = new DeploymentIssueCorrelationAnalyzer().correlate([
      { stage: 'onboarding', failed: true },
      { stage: 'onboarding', failed: true },
      { stage: 'activation', failed: false },
    ]);
    expect(issueCorrelation.hotspots[0]).toBe('onboarding');

    const refinement = new AdaptiveRefinementEngine().refine({ friction: 0.9, impact: 0.8 });
    expect(refinement.priority).toBe('high');

    const prioritization = new UsageDrivenPrioritizationSystem().prioritize([
      { feature: 'workflow-a', usage: 0.7, pain: 0.9 },
      { feature: 'workflow-b', usage: 0.9, pain: 0.2 },
    ]);
    expect(prioritization.order[0]).toBe('workflow-a');

    const evolution = new ProductEvolutionCoordinator().coordinate([
      { id: 'fix-1', approved: true },
      { id: 'fix-2', approved: false },
    ]);
    expect(evolution.approvedActions).toEqual(['fix-1']);

    const optimizer = new RealWorldWorkflowOptimizer().optimize({ baselineMinutes: 30, optimizedMinutes: 21 });
    expect(optimizer.gain).toBe(0.3);

    const improvements = new InstitutionalImprovementRecommender().recommend({ readiness: 0.6, frictionHotspots: 2 });
    expect(improvements.recommendations).toContain('increase-onboarding-guidance');

    const health = new InstitutionalHealthPredictor().predict({ activationRate: 0.8, incidentRate: 0.1, completionRate: 0.85 });
    expect(health.health).toBe('strong');

    const escalation = new CustomerSuccessEscalationEngine().escalate({ risk: 'medium', unresolvedTickets: 1 });
    expect(escalation.level).toBe('ops');

    const churn = new ChurnPreventionCoordinator().coordinate({ churnRisk: 0.5, interventionCoverage: 0.6 });
    expect(churn.preventedRisk).toBeCloseTo(0.14);

    const expansion = new ExpansionOpportunityDetector().detect({ adoptionDepth: 0.8, moduleCoverage: 0.85 });
    expect(expansion.opportunity).toBe('high');

    const milestones = new SuccessMilestoneTracker().track({ completed: 7, total: 10 });
    expect(milestones.progress).toBe(0.7);

    const lowConnectivity = new LowConnectivityExecutionManager().manage({ connectivityScore: 0.2, deviceClass: 'low', pendingSyncConflicts: 3 });
    expect(lowConnectivity.mode).toBe('offline-first');

    const deviceAdapter = new DeviceCapabilityAdapter().adapt({ deviceClass: 'low' });
    expect(deviceAdapter.profile).toBe('lite');

    const conflicts = new OfflineConflictResolutionEngine().resolve([
      { id: 'c1', localRevision: 1, remoteRevision: 1 },
      { id: 'c2', localRevision: 2, remoteRevision: 3 },
    ]);
    expect(conflicts.conflicts).toContain('c1');

    const scaler = new ResourceAwareRuntimeScaler().scale({ cpuBudget: 4, memoryBudget: 4, queueDepth: 20 });
    expect(scaler.workers).toBeGreaterThan(6);

    const regions = new MultiRegionOperationalCoordinator().coordinate([
      { region: 'KE', healthy: true },
      { region: 'UG', healthy: false },
    ]);
    expect(regions.degradedRegions).toEqual(['UG']);

    const audit = new LiveOperationalAuditEngine().audit({ policyPassRate: 0.9, incidentClosureRate: 0.85 });
    expect(audit.pass).toBe(true);

    const pilotCert = new PilotReadinessCertificationRuntime().certify({
      auditPass: audit.pass,
      engagementHealth: engagement.engagementHealth,
      continuityIndex: 0.88,
    });
    expect(pilotCert.certified).toBe(true);

    const execution = new InstitutionalExecutionValidator().validate({ deploymentConsistency: 0.9, adoptionScore: 0.8, stabilityScore: 0.86 });
    expect(execution.valid).toBe(true);

    const confidence = new DeploymentConfidenceScorer().score({ auditScore: audit.score, readinessScore: 0.87, telemetryQuality: 0.9 });
    expect(confidence.confidence).toBeGreaterThan(0.87);

    const readiness = new EcosystemOperationalReadinessAnalyzer().analyze({
      certification: pilotCert.certified,
      executionValid: execution.valid,
      confidence: confidence.confidence,
    });
    expect(readiness.ready).toBe(true);
  });
});
