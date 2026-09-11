import { DeviceContinuitySignal } from './contracts';

export class HumanErrorPreventionEngine {
  prevent(input: { riskyActions: number; guardrailsEnabled: boolean }): { preventedRisk: number } {
    const factor = input.guardrailsEnabled ? 0.7 : 0.2;
    return { preventedRisk: Math.max(0, Math.min(1, input.riskyActions * 0.1 * factor)) };
  }
}

export class IntentAwareWorkflowGuardrails {
  enforce(input: { intentConfidence: number; destructiveAction: boolean }): { allowed: boolean } {
    if (input.destructiveAction && input.intentConfidence < 0.8) return { allowed: false };
    return { allowed: true };
  }
}

export class CognitiveLoadBalancer {
  balance(input: { concurrentTasks: number; interruptions: number }): { loadLevel: 'low' | 'medium' | 'high' } {
    const score = input.concurrentTasks * 0.5 + input.interruptions * 0.5;
    if (score > 8) return { loadLevel: 'high' };
    if (score > 4) return { loadLevel: 'medium' };
    return { loadLevel: 'low' };
  }
}

export class AccessibilityExecutionLayer {
  adapt(input: { lowVisionMode: boolean; lowLiteracyMode: boolean }): { profile: string } {
    if (input.lowVisionMode && input.lowLiteracyMode) return { profile: 'high-assist' };
    if (input.lowVisionMode || input.lowLiteracyMode) return { profile: 'assist' };
    return { profile: 'standard' };
  }
}

export class MultiDeviceContinuityCoordinator {
  coordinate(signals: DeviceContinuitySignal[]): { continuityRate: number } {
    if (signals.length === 0) return { continuityRate: 0 };
    const resumed = signals.filter((s) => s.resumed).length;
    return { continuityRate: resumed / signals.length };
  }
}
