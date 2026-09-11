import { describe, expect, it } from 'vitest';
import {
  InfrastructurePackageManager,
  VerticalDeploymentBundleGenerator,
  CapabilityPresetRegistry,
  PortableRuntimeConfigurationEngine,
  TenantEnvironmentSnapshotManager,
  PublicApiGateway,
  PartnerIntegrationFramework,
  ExternalAutomationConnector,
  WebhookSubscriptionEngine,
  ThirdPartyExtensionRegistry,
  GuidedBusinessActivationEngine,
  IntelligentSetupWizard,
  BusinessReadinessProfiler,
  AdaptiveOnboardingJourney,
  OperationalQuickstartGenerator,
  MultiLanguageExperienceEngine,
  RegionalComplianceResolver,
  CurrencyLocalizationRuntime,
  AfricanRegionalDeploymentProfiles,
  OfflineFirstLocalizationCoordinator,
  EcosystemActivationCoordinator,
  PlatformReadinessCommandCenter,
  DeploymentConfidenceScorer,
  InstitutionalLaunchSequencer,
  AdoptionAccelerationEngine,
} from '../../src/services/activation';

describe('Ecosystem packaging + distribution + activation (Sprint Ω.21)', () => {
  it('validates deployment bundle generation, onboarding integrity, public API governance, localization support, packaging, institutional readiness scoring, and third-party integration safety', async () => {
    const pkg = new InfrastructurePackageManager().createPackage({
      tenantId: 'tenant_kea',
      modules: ['tasks', 'billing', 'alerts'],
      version: 'v2.1.0',
    });
    expect(pkg.items).toBe(3);

    const bundle = new VerticalDeploymentBundleGenerator().generate('Garage Operations', ['tickets', 'parts', 'tickets']);
    expect(bundle.capabilities).toEqual(['tickets', 'parts']);

    const preset = new CapabilityPresetRegistry().resolve('garage-ops');
    expect(preset.capabilities).toContain('mobile-money');

    const portable = new PortableRuntimeConfigurationEngine().export({ retries: 2, offline: true, region: 'KE' });
    expect(portable.portable).toBe(true);

    const snapshotManager = new TenantEnvironmentSnapshotManager();
    const snapshot = snapshotManager.snapshot('tenant_kea', 'v2.1.0', ['tasks', 'payments']);
    expect(snapshotManager.import(snapshot).imported).toBe(true);

    const api = new PublicApiGateway();
    expect(api.authorize({ tenantId: 'tenant_kea', route: 'ops/status', actorRole: 'developer' }).allowed).toBe(true);
    expect(api.authorize({ tenantId: 'tenant_kea', route: 'admin/config', actorRole: 'developer' }).allowed).toBe(false);

    const partner = new PartnerIntegrationFramework().register('partner_crm', ['read:ops', 'unsafe:write']);
    expect(partner.approvedScopes).toEqual(['read:ops']);

    const automation = new ExternalAutomationConnector().connect('zapier', true);
    expect(automation.connected).toBe(true);

    const webhook = new WebhookSubscriptionEngine().subscribe('deployment.ready', 'https://partner.example/webhook');
    expect(webhook.subscribed).toBe(true);

    const extension = new ThirdPartyExtensionRegistry().register({ id: 'ext_ops_dash', kind: 'analytics', version: '1.0.0' });
    expect(extension.accepted).toBe(true);

    const activation = new GuidedBusinessActivationEngine().activate({ businessType: 'SME', teamSize: 4 });
    expect(activation.steps.length).toBeGreaterThan(0);

    const wizard = new IntelligentSetupWizard().generate('garage workshop');
    expect(wizard.journey).toBe('field-ops');

    const readiness = new BusinessReadinessProfiler().profile({ hasInternet: true, hasSmartphone: true, operatorCount: 3 });
    expect(readiness.readinessScore).toBeGreaterThan(0.7);

    const onboarding = new AdaptiveOnboardingJourney().adapt({ businessType: 'institution', readinessScore: readiness.readinessScore });
    expect(onboarding.path).toBe('institution-launch');

    const quickstart = new OperationalQuickstartGenerator().generate(onboarding.path);
    expect(quickstart.checklist).toContain('publish-governance-rules');

    const localized = new MultiLanguageExperienceEngine().localize({ key: 'welcome', language: 'sw' });
    expect(localized.text).toContain('Karibu');

    const compliance = new RegionalComplianceResolver().resolve('KE');
    expect(compliance.profile).toContain('ke');

    const currency = new CurrencyLocalizationRuntime().format(12000, 'KES');
    expect(currency.formatted).toContain('KES');

    const regionalProfile = new AfricanRegionalDeploymentProfiles().resolve('KE');
    expect(regionalProfile.languageDefaults).toContain('sw');

    const offlineLocalization = new OfflineFirstLocalizationCoordinator().prepare({ language: 'sw', currency: 'KES', countryCode: 'KE' });
    expect(offlineLocalization.offlinePackId).toContain('ke_sw');

    const ecosystem = new EcosystemActivationCoordinator().coordinate(['package', 'integrate', 'onboard', 'launch']);
    expect(ecosystem.activated).toBe(true);

    const readinessCenter = new PlatformReadinessCommandCenter().evaluate({
      packaging: true,
      onboarding: true,
      governance: true,
      localization: true,
    });
    expect(readinessCenter.ready).toBe(true);

    const confidence = new DeploymentConfidenceScorer().score({ readiness: 0.92, testPassRate: 1, rollbackConfidence: 0.9 });
    expect(confidence.confidence).toBeGreaterThan(0.9);

    const launch = new InstitutionalLaunchSequencer().sequence(['Zeta School', 'Alpha Academy']);
    expect(launch.order[0]).toBe('Alpha Academy');

    const adoption = new AdoptionAccelerationEngine().accelerate({ frictionScore: 0.2, automationCoverage: 0.85 });
    expect(adoption.accelerationIndex).toBeGreaterThan(0.75);
  });
});
