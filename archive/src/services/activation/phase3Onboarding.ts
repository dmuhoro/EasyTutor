export class GuidedBusinessActivationEngine {
  activate(input: { businessType: string; teamSize: number }): { steps: string[]; estimatedMinutes: number } {
    const steps = ['connect-identity', 'apply-template', 'invite-team', 'run-first-workflow'];
    const estimatedMinutes = Math.max(10, 25 - Math.min(10, input.teamSize));
    return { steps, estimatedMinutes };
  }
}

export class IntelligentSetupWizard {
  generate(businessType: string): { journey: string; prompts: string[] } {
    const journey = businessType.toLowerCase().includes('garage') ? 'field-ops' : 'standard-sme';
    return { journey, prompts: ['business-profile', 'operations-mode', 'payments-setup', 'readiness-check'] };
  }
}

export class BusinessReadinessProfiler {
  profile(input: { hasInternet: boolean; hasSmartphone: boolean; operatorCount: number }): { readinessScore: number; blockers: string[] } {
    const score = (input.hasInternet ? 0.4 : 0.2) + (input.hasSmartphone ? 0.4 : 0.1) + Math.min(0.2, input.operatorCount * 0.05);
    const blockers: string[] = [];
    if (!input.hasSmartphone) blockers.push('no-smartphone-operator');
    if (!input.hasInternet) blockers.push('intermittent-connectivity');
    return { readinessScore: Math.min(1, score), blockers };
  }
}

export class AdaptiveOnboardingJourney {
  adapt(input: { businessType: string; readinessScore: number }): { path: string; supportLevel: 'guided' | 'assisted' | 'autonomous' } {
    const path = input.businessType.toLowerCase().includes('institution') ? 'institution-launch' : 'sme-launch';
    const supportLevel = input.readinessScore < 0.45 ? 'guided' : input.readinessScore < 0.75 ? 'assisted' : 'autonomous';
    return { path, supportLevel };
  }
}

export class OperationalQuickstartGenerator {
  generate(path: string): { checklist: string[] } {
    const base = ['create-owner-account', 'activate-core-workflows', 'run-sample-transaction'];
    if (path === 'institution-launch') base.push('enroll-operators', 'publish-governance-rules');
    return { checklist: base };
  }
}
