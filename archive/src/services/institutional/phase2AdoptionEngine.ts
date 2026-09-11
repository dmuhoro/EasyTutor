import { AdoptionSignal } from './contracts';

export class InstitutionalAdoptionJourney {
  build(input: { institutionType: string }): { stages: string[] } {
    const stages = ['setup', 'operator-onboarding', 'workflow-activation', 'stabilization'];
    if (input.institutionType.toLowerCase().includes('university')) stages.push('faculty-expansion');
    return { stages };
  }
}

export class GuidedOperationalOnboardingEngine {
  guide(stepCount: number): { checklist: string[] } {
    return { checklist: Array.from({ length: stepCount }, (_, i) => `step-${i + 1}`) };
  }
}

export class OperatorActivationScorer {
  score(signal: AdoptionSignal): { activationScore: number } {
    if (signal.operatorsInvited === 0) return { activationScore: 0 };
    const activationRate = signal.operatorsActivated / signal.operatorsInvited;
    return { activationScore: Math.max(0, Math.min(1, activationRate * 0.6 + signal.onboardingCompletionRate * 0.4)) };
  }
}

export class UserFrictionResolutionCoordinator {
  resolve(input: { frictionCount: number; resolvedCount: number }): { resolutionRate: number } {
    if (input.frictionCount === 0) return { resolutionRate: 1 };
    return { resolutionRate: Math.max(0, Math.min(1, input.resolvedCount / input.frictionCount)) };
  }
}

export class DeploymentSuccessPredictor {
  predict(input: { activationScore: number; resolutionRate: number; rollbackSafe: boolean }): { successProbability: number } {
    const rollbackBonus = input.rollbackSafe ? 0.1 : -0.1;
    return { successProbability: Math.max(0, Math.min(1, input.activationScore * 0.5 + input.resolutionRate * 0.4 + rollbackBonus)) };
  }
}
